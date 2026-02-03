import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { parseArgs, run } from './cli';
import type { ScanResult } from './scanner';

describe('parseArgs', () => {
  test('valid args with path and page ID', () => {
    const result = parseArgs(['path/to/file.md', 'page-id']);

    expect(result.inputPaths).toEqual(['path/to/file.md']);
    expect(result.pageId).toBe('page-id');
    expect(result.options.force).toBe(false);
    expect(result.options.dryRun).toBe(false);
    expect(result.options.verbose).toBe(false);
  });

  test('multiple paths', () => {
    const result = parseArgs(['path1', 'path2', 'path3', 'page-id']);

    expect(result.inputPaths).toEqual(['path1', 'path2', 'path3']);
    expect(result.pageId).toBe('page-id');
  });

  test('--force flag', () => {
    const result = parseArgs(['path.md', 'page-id', '--force']);

    expect(result.options.force).toBe(true);
    expect(result.options.dryRun).toBe(false);
    expect(result.options.verbose).toBe(false);
  });

  test('--dry-run flag', () => {
    const result = parseArgs(['path.md', 'page-id', '--dry-run']);

    expect(result.options.dryRun).toBe(true);
    expect(result.options.force).toBe(false);
    expect(result.options.verbose).toBe(false);
  });

  test('--verbose flag', () => {
    const result = parseArgs(['path.md', 'page-id', '--verbose']);

    expect(result.options.verbose).toBe(true);
    expect(result.options.force).toBe(false);
    expect(result.options.dryRun).toBe(false);
  });

  test('all flags', () => {
    const result = parseArgs([
      'path.md',
      'page-id',
      '--force',
      '--dry-run',
      '--verbose',
    ]);

    expect(result.options.force).toBe(true);
    expect(result.options.dryRun).toBe(true);
    expect(result.options.verbose).toBe(true);
  });

  test('flags in different order', () => {
    const result = parseArgs([
      '--verbose',
      '--force',
      'path.md',
      'page-id',
      '--dry-run',
    ]);

    expect(result.inputPaths).toEqual(['path.md']);
    expect(result.pageId).toBe('page-id');
    expect(result.options.force).toBe(true);
    expect(result.options.dryRun).toBe(true);
    expect(result.options.verbose).toBe(true);
  });

  test('missing arguments error', () => {
    expect(() => parseArgs(['path.md'])).toThrow('Usage: md-to-notion');
  });

  test('empty args error', () => {
    expect(() => parseArgs([])).toThrow('Usage: md-to-notion');
  });

  test('only flags error', () => {
    expect(() => parseArgs(['--force', '--verbose'])).toThrow(
      'Usage: md-to-notion'
    );
  });

  test('multiple paths with flags', () => {
    const result = parseArgs([
      'dir1',
      'dir2',
      'page-id',
      '--force',
      '--verbose',
    ]);

    expect(result.inputPaths).toEqual(['dir1', 'dir2']);
    expect(result.pageId).toBe('page-id');
    expect(result.options.force).toBe(true);
    expect(result.options.verbose).toBe(true);
  });
});

describe('run', () => {
  let originalArgv: string[];
  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let processExitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    originalArgv = process.argv;
    originalEnv = process.env;
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = spyOn(process, 'exit').mockImplementation(
      (() => {}) as never
    );
  });

  test('executes flow via subprocess (dry-run)', async () => {
    const { mkdtemp, rm, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const root = join(import.meta.dir, '..');
    const dir = await mkdtemp(join(tmpdir(), 'md-to-notion-run-'));
    const mdPath = join(dir, 'note.md');
    await writeFile(mdPath, '# Hello');
    try {
      const proc = Bun.spawn(
        [
          'bun',
          'run',
          join(root, 'src/cli.ts'),
          mdPath,
          'page-id',
          '--dry-run',
        ],
        {
          cwd: dir,
          env: { ...process.env, NOTION_API_KEY: 'test-key' },
          stdout: 'pipe',
          stderr: 'pipe',
        }
      );
      const exit = await proc.exited;
      const stderr = await new Response(proc.stderr).text();
      await rm(dir, { recursive: true, force: true });
      expect(exit).toBe(0);
      expect(stderr).toBe('');
    } catch (e) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      throw e;
    }
  });

  test('exits 1 when NOTION_API_KEY missing', async () => {
    const { join } = await import('node:path');
    const root = join(import.meta.dir, '..');
    const proc = Bun.spawn(
      ['bun', 'run', join(root, 'src/cli.ts'), '/tmp/x.md', 'page-id'],
      {
        cwd: root,
        env: { ...process.env, NOTION_API_KEY: '' },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    const exit = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(exit).toBe(1);
    expect(stderr).toContain('NOTION_API_KEY');
  });

  test('verbose logs Import complete', async () => {
    const { mkdtemp, rm, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const root = join(import.meta.dir, '..');
    const dir = await mkdtemp(join(tmpdir(), 'md-to-notion-run-'));
    const mdPath = join(dir, 'note.md');
    await writeFile(mdPath, '# Hi');
    try {
      const proc = Bun.spawn(
        [
          'bun',
          'run',
          join(root, 'src/cli.ts'),
          mdPath,
          'page-id',
          '--dry-run',
          '--verbose',
        ],
        {
          cwd: dir,
          env: { ...process.env, NOTION_API_KEY: 'key' },
          stdout: 'pipe',
          stderr: 'pipe',
        }
      );
      const exit = await proc.exited;
      const out = await new Response(proc.stdout).text();
      await rm(dir, { recursive: true, force: true });
      expect(exit).toBe(0);
      expect(out).toContain('Import complete');
    } catch (e) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      throw e;
    }
  });

  test('unit: single path with scanInput', async () => {
    process.argv = ['bun', 'cli.ts', 'file.md', 'page-123'];
    process.env.NOTION_API_KEY = 'test-key';

    const mockScanResult: ScanResult = {
      inputPath: 'file.md',
      isDirectory: false,
      rootDir: '.',
      rootName: 'file',
      mdFiles: ['file.md'],
      directories: [],
      createRootPage: false,
    };

    const scanner = await import('./scanner');
    const pageCreator = await import('./page-creator');

    const scanInputSpy = spyOn(scanner, 'scanInput').mockResolvedValue(
      mockScanResult
    );
    const importMarkdownSpy = spyOn(
      pageCreator,
      'importMarkdown'
    ).mockResolvedValue();

    await run();

    expect(scanInputSpy).toHaveBeenCalledWith('file.md', false);
    expect(importMarkdownSpy).toHaveBeenCalledWith(mockScanResult, 'page-123', {
      force: false,
      dryRun: false,
      verbose: false,
    });
    expect(processExitSpy).not.toHaveBeenCalled();

    scanInputSpy.mockRestore();
    importMarkdownSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  test('unit: multiple paths with scanMultipleInputs', async () => {
    process.argv = ['bun', 'cli.ts', 'dir1', 'dir2', 'page-456'];
    process.env.NOTION_API_KEY = 'test-key';

    const mockScanResult: ScanResult = {
      inputPath: '.',
      isDirectory: true,
      rootDir: '.',
      rootName: 'test',
      mdFiles: ['dir1/a.md', 'dir2/b.md'],
      directories: ['dir1', 'dir2'],
      createRootPage: true,
    };

    const scanner = await import('./scanner');
    const pageCreator = await import('./page-creator');

    const scanMultipleSpy = spyOn(
      scanner,
      'scanMultipleInputs'
    ).mockResolvedValue(mockScanResult);
    const importMarkdownSpy = spyOn(
      pageCreator,
      'importMarkdown'
    ).mockResolvedValue();

    await run();

    expect(scanMultipleSpy).toHaveBeenCalledWith(['dir1', 'dir2'], false);
    expect(importMarkdownSpy).toHaveBeenCalledWith(mockScanResult, 'page-456', {
      force: false,
      dryRun: false,
      verbose: false,
    });
    expect(processExitSpy).not.toHaveBeenCalled();

    scanMultipleSpy.mockRestore();
    importMarkdownSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  test('unit: verbose mode logs completion', async () => {
    process.argv = ['bun', 'cli.ts', 'file.md', 'page-789', '--verbose'];
    process.env.NOTION_API_KEY = 'test-key';

    const mockScanResult: ScanResult = {
      inputPath: 'file.md',
      isDirectory: false,
      rootDir: '.',
      rootName: 'file',
      mdFiles: ['file.md'],
      directories: [],
      createRootPage: false,
    };

    const scanner = await import('./scanner');
    const pageCreator = await import('./page-creator');

    const scanInputSpy = spyOn(scanner, 'scanInput').mockResolvedValue(
      mockScanResult
    );
    const importMarkdownSpy = spyOn(
      pageCreator,
      'importMarkdown'
    ).mockResolvedValue();
    const consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});

    await run();

    expect(scanInputSpy).toHaveBeenCalledWith('file.md', true);
    expect(consoleLogSpy).toHaveBeenCalledWith('Import complete.');

    scanInputSpy.mockRestore();
    importMarkdownSpy.mockRestore();
    consoleLogSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  test('unit: missing NOTION_API_KEY errors and exits', async () => {
    process.argv = ['bun', 'cli.ts', 'file.md', 'page-123'];
    process.env.NOTION_API_KEY = '';

    await run();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Missing NOTION_API_KEY environment variable.'
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  test('unit: parseArgs error is caught and exits', async () => {
    process.argv = ['bun', 'cli.ts']; // Missing required args
    process.env.NOTION_API_KEY = 'test-key';

    await run();

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  test('unit: importMarkdown error is caught and exits', async () => {
    process.argv = ['bun', 'cli.ts', 'file.md', 'page-123'];
    process.env.NOTION_API_KEY = 'test-key';

    const mockScanResult: ScanResult = {
      inputPath: 'file.md',
      isDirectory: false,
      rootDir: '.',
      rootName: 'file',
      mdFiles: ['file.md'],
      directories: [],
      createRootPage: false,
    };

    const scanner = await import('./scanner');
    const pageCreator = await import('./page-creator');

    const scanInputSpy = spyOn(scanner, 'scanInput').mockResolvedValue(
      mockScanResult
    );
    const importMarkdownSpy = spyOn(
      pageCreator,
      'importMarkdown'
    ).mockRejectedValue(new Error('Import failed'));

    await run();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Import failed');
    expect(processExitSpy).toHaveBeenCalledWith(1);

    scanInputSpy.mockRestore();
    importMarkdownSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  test('unit: non-Error exception is handled', async () => {
    process.argv = ['bun', 'cli.ts', 'file.md', 'page-123'];
    process.env.NOTION_API_KEY = 'test-key';

    const mockScanResult: ScanResult = {
      inputPath: 'file.md',
      isDirectory: false,
      rootDir: '.',
      rootName: 'file',
      mdFiles: ['file.md'],
      directories: [],
      createRootPage: false,
    };

    const scanner = await import('./scanner');
    const pageCreator = await import('./page-creator');

    const scanInputSpy = spyOn(scanner, 'scanInput').mockResolvedValue(
      mockScanResult
    );
    const importMarkdownSpy = spyOn(
      pageCreator,
      'importMarkdown'
    ).mockRejectedValue('string error');

    await run();

    expect(consoleErrorSpy).toHaveBeenCalledWith('string error');
    expect(processExitSpy).toHaveBeenCalledWith(1);

    scanInputSpy.mockRestore();
    importMarkdownSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  test('unit: scanInput error is caught and exits', async () => {
    process.argv = ['bun', 'cli.ts', 'file.md', 'page-123'];
    process.env.NOTION_API_KEY = 'test-key';

    const scanner = await import('./scanner');

    const scanInputSpy = spyOn(scanner, 'scanInput').mockRejectedValue(
      new Error('Scan failed')
    );

    await run();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Scan failed');
    expect(processExitSpy).toHaveBeenCalledWith(1);

    scanInputSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  test('unit: scanMultipleInputs error is caught and exits', async () => {
    process.argv = ['bun', 'cli.ts', 'dir1', 'dir2', 'page-123'];
    process.env.NOTION_API_KEY = 'test-key';

    const scanner = await import('./scanner');

    const scanMultipleSpy = spyOn(
      scanner,
      'scanMultipleInputs'
    ).mockRejectedValue(new Error('Scan multiple failed'));

    await run();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Scan multiple failed');
    expect(processExitSpy).toHaveBeenCalledWith(1);

    scanMultipleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  test('unit: undefined NOTION_API_KEY errors and exits', async () => {
    process.argv = ['bun', 'cli.ts', 'file.md', 'page-123'];
    delete process.env.NOTION_API_KEY;

    await run();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Missing NOTION_API_KEY environment variable.'
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });
});
