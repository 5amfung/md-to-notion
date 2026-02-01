import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanInput, scanMultipleInputs, toRelativePath } from './scanner';

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'md-to-notion-test-'));
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('scanInput', () => {
  test('single markdown file', async () => {
    const filePath = join(testDir, 'test.md');
    await writeFile(filePath, '# Test');

    const result = await scanInput(filePath);

    expect(result.isDirectory).toBe(false);
    expect(result.mdFiles).toEqual([filePath]);
    expect(result.directories).toEqual([]);
    expect(result.createRootPage).toBe(false);
  });

  test('directory with nested markdown files', async () => {
    await writeFile(join(testDir, 'file1.md'), '# File 1');
    await mkdir(join(testDir, 'subdir'));
    await writeFile(join(testDir, 'subdir', 'file2.md'), '# File 2');
    await mkdir(join(testDir, 'subdir', 'nested'));
    await writeFile(join(testDir, 'subdir', 'nested', 'file3.md'), '# File 3');

    const result = await scanInput(testDir);

    expect(result.isDirectory).toBe(true);
    expect(result.mdFiles.length).toBe(3);
    expect(result.mdFiles).toContain(join(testDir, 'file1.md'));
    expect(result.mdFiles).toContain(join(testDir, 'subdir', 'file2.md'));
    expect(result.mdFiles).toContain(
      join(testDir, 'subdir', 'nested', 'file3.md')
    );
    expect(result.directories.length).toBeGreaterThan(0);
    expect(result.createRootPage).toBe(true);
  });

  test('rejects non-.md files', async () => {
    const filePath = join(testDir, 'test.txt');
    await writeFile(filePath, 'content');

    await expect(scanInput(filePath)).rejects.toThrow();
  });

  test('throws when path is neither file nor directory', async () => {
    if (process.platform === 'win32') {
      return; // mkfifo is Unix-only
    }
    const fifoPath = join(testDir, 'fifo');
    const { execSync } = await import('node:child_process');
    execSync(`mkfifo "${fifoPath}"`);

    await expect(scanInput(fifoPath)).rejects.toThrow(
      'not a file or directory'
    );
  });

  test('excludes .canvas files', async () => {
    await writeFile(join(testDir, 'test.md'), '# Test');
    await writeFile(join(testDir, 'test.canvas'), 'canvas content');

    const result = await scanInput(testDir);

    expect(result.mdFiles).not.toContain(join(testDir, 'test.canvas'));
    expect(result.mdFiles).toContain(join(testDir, 'test.md'));
  });

  test('empty directory', async () => {
    const result = await scanInput(testDir);

    expect(result.isDirectory).toBe(true);
    expect(result.mdFiles).toEqual([]);
    expect(result.createRootPage).toBe(true);
  });

  test('handles deeply nested structure', async () => {
    const deepPath = join(testDir, 'a', 'b', 'c', 'd');
    await mkdir(deepPath, { recursive: true });
    await writeFile(join(deepPath, 'deep.md'), '# Deep');

    const result = await scanInput(testDir);

    expect(result.mdFiles).toContain(join(deepPath, 'deep.md'));
    expect(result.directories.length).toBeGreaterThan(0);
  });

  test('handles files with spaces in names', async () => {
    await writeFile(join(testDir, 'file with spaces.md'), '# Test');

    const result = await scanInput(testDir);

    expect(result.mdFiles.length).toBe(1);
    expect(result.mdFiles[0]).toContain('file with spaces.md');
  });
});

describe('scanMultipleInputs', () => {
  test('multiple directories', async () => {
    const dir1 = join(testDir, 'dir1');
    const dir2 = join(testDir, 'dir2');
    await mkdir(dir1);
    await mkdir(dir2);
    await writeFile(join(dir1, 'file1.md'), '# File 1');
    await writeFile(join(dir2, 'file2.md'), '# File 2');

    const result = await scanMultipleInputs([dir1, dir2]);

    expect(result.isDirectory).toBe(true);
    expect(result.mdFiles.length).toBe(2);
    expect(result.mdFiles).toContain(join(dir1, 'file1.md'));
    expect(result.mdFiles).toContain(join(dir2, 'file2.md'));
    expect(result.createRootPage).toBe(false);
  });

  test('mixed files and directories', async () => {
    const dir1 = join(testDir, 'dir1');
    await mkdir(dir1);
    await writeFile(join(dir1, 'file1.md'), '# File 1');
    const file2 = join(testDir, 'file2.md');
    await writeFile(file2, '# File 2');

    const result = await scanMultipleInputs([dir1, file2]);

    expect(result.mdFiles.length).toBe(2);
    expect(result.mdFiles).toContain(join(dir1, 'file1.md'));
    expect(result.mdFiles).toContain(file2);
  });

  test('empty input paths error', async () => {
    await expect(scanMultipleInputs([])).rejects.toThrow(
      'No input paths provided'
    );
  });

  test('no valid paths when all are .notion-sync.json', async () => {
    const dir1 = join(testDir, 'dir1');
    const dir2 = join(testDir, 'dir2');
    await mkdir(dir1);
    await mkdir(dir2);
    await writeFile(join(dir1, '.notion-sync.json'), '{}');
    await writeFile(join(dir2, '.notion-sync.json'), '{}');

    await expect(
      scanMultipleInputs([
        join(dir1, '.notion-sync.json'),
        join(dir2, '.notion-sync.json'),
      ])
    ).rejects.toThrow('No valid input paths provided');
  });

  test('single input delegates to scanInput', async () => {
    const filePath = join(testDir, 'test.md');
    await writeFile(filePath, '# Test');

    const result = await scanMultipleInputs([filePath]);

    expect(result.isDirectory).toBe(false);
    expect(result.mdFiles).toEqual([filePath]);
  });

  test('finds common parent', async () => {
    const parent = join(testDir, 'parent');
    const dir1 = join(parent, 'dir1');
    const dir2 = join(parent, 'dir2');
    await mkdir(dir1, { recursive: true });
    await mkdir(dir2, { recursive: true });
    await writeFile(join(dir1, 'file1.md'), '# File 1');
    await writeFile(join(dir2, 'file2.md'), '# File 2');

    const result = await scanMultipleInputs([dir1, dir2]);

    expect(result.rootDir).toBe(parent);
    expect(result.mdFiles.length).toBe(2);
  });

  test('walks up for common parent when paths are siblings', async () => {
    const aa = join(testDir, 'aa');
    const bb = join(testDir, 'bb');
    await mkdir(aa);
    await mkdir(bb);
    await writeFile(join(aa, 'a.md'), '# A');
    await writeFile(join(bb, 'b.md'), '# B');

    const result = await scanMultipleInputs([
      join(aa, 'a.md'),
      join(bb, 'b.md'),
    ]);

    expect(result.rootDir).toBe(testDir);
    expect(result.mdFiles).toHaveLength(2);
    expect(result.mdFiles).toContain(join(aa, 'a.md'));
    expect(result.mdFiles).toContain(join(bb, 'b.md'));
  });

  test('filters out .notion-sync.json', async () => {
    const dir1 = join(testDir, 'dir1');
    await mkdir(dir1);
    await writeFile(join(dir1, 'file1.md'), '# File 1');
    const syncFile = join(testDir, '.notion-sync.json');
    await writeFile(syncFile, '{}');

    const result = await scanMultipleInputs([dir1, syncFile]);

    expect(result.mdFiles).not.toContain(syncFile);
    expect(result.mdFiles).toContain(join(dir1, 'file1.md'));
  });
});

describe('toRelativePath', () => {
  test('converts absolute to relative paths', () => {
    const rootDir = '/path/to/root';
    const targetPath = '/path/to/root/subdir/file.md';
    const result = toRelativePath(rootDir, targetPath);
    expect(result).toBe('subdir/file.md');
  });

  test('same directory', () => {
    const rootDir = '/path/to/root';
    const targetPath = '/path/to/root/file.md';
    const result = toRelativePath(rootDir, targetPath);
    expect(result).toBe('file.md');
  });
});
