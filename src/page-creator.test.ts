import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Client } from '@notionhq/client';
import { importMarkdown } from './page-creator';
import type { ScanResult } from './scanner';
import { loadSyncState, saveSyncState } from './sync-state';

function createMockNotionClient(): Client {
  return {
    pages: {
      create: mock(() => Promise.resolve({ id: 'new-page-id' })),
    },
    blocks: {
      children: {
        append: mock(() => Promise.resolve({})),
        list: mock(() => Promise.resolve({ results: [], has_more: false })),
      },
      delete: mock(() => Promise.resolve({})),
    },
    fileUploads: {
      create: mock(() => Promise.resolve({ id: 'upload-id' })),
      send: mock(() => Promise.resolve({})),
    },
  } as unknown as Client;
}

let testDir: string;
let originalCwd: string;
let originalApiKey: string | undefined;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'md-to-notion-test-'));
  originalCwd = process.cwd();
  process.chdir(testDir);
  originalApiKey = process.env.NOTION_API_KEY;
  process.env.NOTION_API_KEY = 'test-key';
});

afterEach(async () => {
  process.chdir(originalCwd);
  if (originalApiKey) {
    process.env.NOTION_API_KEY = originalApiKey;
  } else {
    delete process.env.NOTION_API_KEY;
  }
  await rm(testDir, { recursive: true, force: true });
});

describe('importMarkdown', () => {
  test('dry run mode creates no files', async () => {
    const filePath = join(testDir, 'test.md');
    await writeFile(filePath, '# Test Content');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'test',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    await importMarkdown(scan, 'parent-page-id', {
      dryRun: true,
      verbose: true,
    });

    // Verify sync state was not created with real page IDs
    const state = await loadSyncState('parent-page-id');
    expect(state.files['test.md']).toBeUndefined();
  });

  test('skips unchanged files based on hash', async () => {
    const filePath = join(testDir, 'test.md');
    await writeFile(filePath, '# Test Content');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'test',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    // Compute actual hash
    const { createHash } = await import('node:crypto');
    const fileContent = await Bun.file(filePath).text();
    const fileHash = createHash('sha256')
      .update(Buffer.from(fileContent))
      .digest('hex');

    // Pre-populate sync state with matching hash
    const state = await loadSyncState('parent-page-id');
    state.files['test.md'] = {
      notionPageId: 'existing-page-id',
      contentHash: fileHash,
      lastSynced: new Date().toISOString(),
    };
    await saveSyncState(state);

    // Run import - should skip because hash matches
    await importMarkdown(scan, 'parent-page-id', {
      dryRun: true,
      verbose: true,
    });

    // Verify file was not updated (sync state unchanged)
    const updatedState = await loadSyncState('parent-page-id');
    expect(updatedState.files['test.md']?.contentHash).toBe(fileHash);
  });

  test('force updates even when hash matches', async () => {
    const filePath = join(testDir, 'test.md');
    await writeFile(filePath, '# Test Content');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'test',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    // Compute actual hash
    const { createHash } = await import('node:crypto');
    const fileContent = await Bun.file(filePath).text();
    const fileHash = createHash('sha256')
      .update(Buffer.from(fileContent))
      .digest('hex');

    // Pre-populate sync state with matching hash
    const state = await loadSyncState('parent-page-id');
    state.files['test.md'] = {
      notionPageId: 'existing-page-id',
      contentHash: fileHash,
      lastSynced: new Date().toISOString(),
    };
    await saveSyncState(state);

    // Run import with force and dry-run - should process even though hash matches
    await importMarkdown(scan, 'parent-page-id', {
      force: true,
      dryRun: true,
      verbose: true,
    });

    // In dry-run mode with force, it should log the update but not change state
    const updatedState = await loadSyncState('parent-page-id');
    expect(updatedState.files['test.md']).toBeDefined();
  });

  test('handles directory structure in dry run', async () => {
    const subdir = join(testDir, 'subdir');
    await mkdir(subdir);
    const filePath = join(subdir, 'test.md');
    await writeFile(filePath, '# Test Content');

    const scan: ScanResult = {
      inputPath: testDir,
      isDirectory: true,
      rootDir: testDir,
      rootName: 'test-dir',
      mdFiles: [filePath],
      directories: [subdir],
      createRootPage: true,
    };

    // Should complete without error in dry-run mode
    await importMarkdown(scan, 'parent-page-id', {
      dryRun: true,
      verbose: true,
    });

    // In dry-run mode, no actual pages are created and state is not persisted
    // The function should process all directories and files without errors
    const state = await loadSyncState('parent-page-id');
    // Dry-run doesn't save directory mappings to disk
    expect(Object.keys(state.files).length).toBe(0);
  });

  test('empty directory returns early', async () => {
    const scan: ScanResult = {
      inputPath: testDir,
      isDirectory: true,
      rootDir: testDir,
      rootName: 'test-dir',
      mdFiles: [],
      directories: [],
      createRootPage: true,
    };

    // Should not throw and should complete quickly
    await importMarkdown(scan, 'parent-page-id', {
      dryRun: true,
      verbose: true,
    });

    // Empty directory should not create any file entries
    const state = await loadSyncState('parent-page-id');
    expect(Object.keys(state.files).length).toBe(0);
  });

  test('detects content changes via hash', async () => {
    const filePath = join(testDir, 'test.md');
    await writeFile(filePath, '# Original Content');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'test',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    // Pre-populate sync state with old hash
    const state = await loadSyncState('parent-page-id');
    state.files['test.md'] = {
      notionPageId: 'existing-page-id',
      contentHash: 'old-different-hash',
      lastSynced: new Date().toISOString(),
    };
    await saveSyncState(state);

    // Run import - should detect change because hash is different
    await importMarkdown(scan, 'parent-page-id', {
      dryRun: true,
      verbose: true,
    });

    // In dry-run, the page ID should remain unchanged
    const updatedState = await loadSyncState('parent-page-id');
    expect(updatedState.files['test.md']?.notionPageId).toBe(
      'existing-page-id'
    );
  });

  test('createRootPage false creates file under destination', async () => {
    const filePath = join(testDir, 'test.md');
    await writeFile(filePath, '# Test');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'test',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    const notion = createMockNotionClient();
    await importMarkdown(scan, 'dest-page-id', {
      notionClient: notion,
      verbose: true,
    });

    const state = await loadSyncState('dest-page-id');
    expect(state.files['test.md']?.notionPageId).toBe('new-page-id');
    expect(notion.pages.create).toHaveBeenCalled();
  });

  test('createRootPage false with isDirectory sets root to destination', async () => {
    await writeFile(join(testDir, 'a.md'), '# A');
    await writeFile(join(testDir, 'b.md'), '# B');

    const scan: ScanResult = {
      inputPath: testDir,
      isDirectory: true,
      rootDir: testDir,
      rootName: 'test-dir',
      mdFiles: [join(testDir, 'a.md'), join(testDir, 'b.md')],
      directories: [],
      createRootPage: false,
    };

    const notion = createMockNotionClient();
    await importMarkdown(scan, 'dest-page-id', {
      notionClient: notion,
      verbose: true,
    });

    const state = await loadSyncState('dest-page-id');
    expect(state.directories['.']?.notionPageId).toBe('dest-page-id');
    expect(state.files['a.md']?.notionPageId).toBe('new-page-id');
    expect(state.files['b.md']?.notionPageId).toBe('new-page-id');
  });

  test('createRootPage true creates root then file', async () => {
    const subdir = join(testDir, 'subdir');
    await mkdir(subdir);
    const filePath = join(subdir, 'note.md');
    await writeFile(filePath, '# Note');

    const scan: ScanResult = {
      inputPath: testDir,
      isDirectory: true,
      rootDir: testDir,
      rootName: 'test-dir',
      mdFiles: [filePath],
      directories: [subdir],
      createRootPage: true,
    };

    const notion = createMockNotionClient();
    await importMarkdown(scan, 'dest-page-id', {
      notionClient: notion,
      verbose: true,
    });

    const state = await loadSyncState('dest-page-id');
    expect(state.directories['.']?.notionPageId).toBe('new-page-id');
    expect(state.directories.subdir?.notionPageId).toBe('new-page-id');
    expect(state.files['subdir/note.md']?.notionPageId).toBe('new-page-id');
    expect(notion.pages.create).toHaveBeenCalled();
  });

  test('update existing page (replacePageBlocks)', async () => {
    const filePath = join(testDir, 'test.md');
    await writeFile(filePath, '# Updated');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'test',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    const state = await loadSyncState('dest-page-id');
    state.files['test.md'] = {
      notionPageId: 'existing-page-id',
      contentHash: 'old-hash',
      lastSynced: new Date().toISOString(),
    };
    await saveSyncState(state);

    const notion = createMockNotionClient();
    (
      notion.blocks.children.list as ReturnType<typeof mock>
    )?.mockResolvedValueOnce({
      results: [{ id: 'block-1' }, { id: 'block-2' }],
      has_more: false,
    });

    await importMarkdown(scan, 'dest-page-id', {
      notionClient: notion,
      force: true,
      verbose: true,
    });

    expect(notion.blocks.delete).toHaveBeenCalled();
    expect(notion.blocks.children.append).toHaveBeenCalled();
    const updated = await loadSyncState('dest-page-id');
    expect(updated.files['test.md']?.notionPageId).toBe('existing-page-id');
  });

  test('resolves wiki-links to page mentions', async () => {
    const subdir = join(testDir, 'A');
    await mkdir(subdir);
    const targetPath = join(subdir, 'Page Foo.md');
    const topPath = join(testDir, 'Top.md');
    await writeFile(targetPath, '# Page Foo');
    await writeFile(topPath, 'See [[A/Page Foo]]');

    const scan: ScanResult = {
      inputPath: testDir,
      isDirectory: true,
      rootDir: testDir,
      rootName: 'test-dir',
      mdFiles: [targetPath, topPath],
      directories: [subdir],
      createRootPage: false,
    };

    const notion = {
      pages: {
        create: mock(
          async (payload: {
            properties?: {
              title?: { title?: { text?: { content?: string } }[] };
            };
          }) => {
            const title =
              payload.properties?.title?.title?.[0]?.text?.content ?? 'unknown';
            return { id: `page-${String(title).replace(/\s+/g, '-')}` };
          }
        ),
      },
      blocks: {
        children: {
          append: mock(async () => ({})),
          list: mock(async () => ({ results: [], has_more: false })),
        },
        delete: mock(async () => ({})),
      },
      fileUploads: {
        create: mock(async () => ({ id: 'upload-id' })),
        send: mock(async () => ({})),
      },
    } as unknown as Client;

    await importMarkdown(scan, 'dest-page-id', {
      notionClient: notion,
      verbose: true,
    });

    const appendMock = notion.blocks.children.append as ReturnType<typeof mock>;
    const topAppendCall = appendMock.mock.calls.find(
      ([args]) => args.block_id === 'page-Top'
    );
    expect(topAppendCall).toBeDefined();
    const topBlocks = topAppendCall?.[0].children ?? [];
    expect(topBlocks[0].paragraph.rich_text[1].type).toBe('mention');
    expect(topBlocks[0].paragraph.rich_text[1].mention.page.id).toBe(
      'page-Page-Foo'
    );
  });

  test('resolves markdown links with subdirectories relative to current file', async () => {
    const subdirA = join(testDir, 'A');
    const subdirAB = join(subdirA, 'B');
    const subdirABC = join(subdirAB, 'C');
    await mkdir(subdirABC, { recursive: true });
    const targetPath = join(subdirABC, 'Target.md');
    const currentPath = join(subdirAB, 'Current.md');
    await writeFile(targetPath, '# Target');
    await writeFile(currentPath, 'See [Target](C/Target.md)');

    const scan: ScanResult = {
      inputPath: testDir,
      isDirectory: true,
      rootDir: testDir,
      rootName: 'test-dir',
      mdFiles: [targetPath, currentPath],
      directories: [subdirA, subdirAB, subdirABC],
      createRootPage: false,
    };

    const notion = {
      pages: {
        create: mock(
          async (payload: {
            properties?: {
              title?: { title?: { text?: { content?: string } }[] };
            };
          }) => {
            const title =
              payload.properties?.title?.title?.[0]?.text?.content ?? 'unknown';
            return { id: `page-${String(title).replace(/\s+/g, '-')}` };
          }
        ),
      },
      blocks: {
        children: {
          append: mock(async () => ({})),
          list: mock(async () => ({ results: [], has_more: false })),
        },
        delete: mock(async () => ({})),
      },
      fileUploads: {
        create: mock(async () => ({ id: 'upload-id' })),
        send: mock(async () => ({})),
      },
    } as unknown as Client;

    await importMarkdown(scan, 'dest-page-id', {
      notionClient: notion,
      verbose: true,
    });

    const appendMock = notion.blocks.children.append as ReturnType<typeof mock>;
    const currentAppendCall = appendMock.mock.calls.find(
      ([args]) => args.block_id === 'page-Current'
    );
    expect(currentAppendCall).toBeDefined();
    const currentBlocks = currentAppendCall?.[0].children ?? [];
    expect(currentBlocks[0].paragraph.rich_text[1].type).toBe('mention');
    expect(currentBlocks[0].paragraph.rich_text[1].mention.page.id).toBe(
      'page-Target'
    );
  });

  test('skip logs when verbose', async () => {
    const filePath = join(testDir, 'test.md');
    await writeFile(filePath, '# Content');
    const { createHash } = await import('node:crypto');
    const fileHash = createHash('sha256')
      .update(Buffer.from('# Content'))
      .digest('hex');
    const state = await loadSyncState('dest-page-id');
    state.files['test.md'] = {
      notionPageId: 'id',
      contentHash: fileHash,
      lastSynced: new Date().toISOString(),
    };
    await saveSyncState(state);

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'test',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    const logSpy = mock(() => {});
    const orig = console.log;
    console.log = logSpy as typeof console.log;
    try {
      await importMarkdown(scan, 'dest-page-id', {
        verbose: true,
        notionClient: createMockNotionClient(),
      });
      expect(logSpy).toHaveBeenCalledWith('skip: test.md');
    } finally {
      console.log = orig;
    }
  });

  test('first pass logs placeholder creation when verbose', async () => {
    const filePath = join(testDir, 'test.md');
    await writeFile(filePath, '# Content');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'test',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    const logSpy = mock(() => {});
    const orig = console.log;
    console.log = logSpy as typeof console.log;
    try {
      await importMarkdown(scan, 'dest-page-id', {
        verbose: true,
        notionClient: createMockNotionClient(),
      });
      expect(logSpy).toHaveBeenCalledWith('create placeholder: test.md');
    } finally {
      console.log = orig;
    }
  });

  test('file with missing image uses placeholder', async () => {
    const filePath = join(testDir, 'doc.md');
    await writeFile(filePath, '# Doc\n\n![missing](nonexistent.png)');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'doc',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    const notion = createMockNotionClient();
    await importMarkdown(scan, 'dest-page-id', {
      notionClient: notion,
      verbose: true,
    });

    const state = await loadSyncState('dest-page-id');
    expect(state.files['doc.md']?.notionPageId).toBe('new-page-id');
    expect(notion.pages.create).toHaveBeenCalled();
  });

  test('throws error when parent page is missing for file in first pass', async () => {
    const subdir = join(testDir, 'subdir');
    await mkdir(subdir);
    const filePath = join(subdir, 'test.md');
    await writeFile(filePath, '# Test');

    const scan: ScanResult = {
      inputPath: testDir,
      isDirectory: true,
      rootDir: testDir,
      rootName: 'test-dir',
      mdFiles: [filePath],
      directories: [], // Not including subdir in directories
      createRootPage: true,
    };

    const notion = createMockNotionClient();

    await expect(
      importMarkdown(scan, 'dest-page-id', {
        notionClient: notion,
      })
    ).rejects.toThrow('Missing parent page for subdir/test.md');
  });

  test('throws error when parent page is missing for file in second pass', async () => {
    const subdir = join(testDir, 'subdir');
    await mkdir(subdir);
    const filePath = join(subdir, 'test.md');
    await writeFile(filePath, '# Test');

    const scan: ScanResult = {
      inputPath: testDir,
      isDirectory: true,
      rootDir: testDir,
      rootName: 'test-dir',
      mdFiles: [filePath],
      directories: [], // Not including subdir in directories
      createRootPage: true,
    };

    // Pre-create the file placeholder so it skips first pass
    const state = await loadSyncState('dest-page-id');
    state.files['subdir/test.md'] = {
      notionPageId: 'placeholder-id',
      contentHash: '',
      lastSynced: new Date(0).toISOString(),
    };
    await saveSyncState(state);

    const notion = createMockNotionClient();

    await expect(
      importMarkdown(scan, 'dest-page-id', {
        notionClient: notion,
        force: true, // Force update to trigger second pass
      })
    ).rejects.toThrow('Missing parent page for subdir/test.md');
  });

  test('creates new page when no existing page found', async () => {
    const filePath = join(testDir, 'new.md');
    await writeFile(filePath, '# New Content');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'new',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    const notion = createMockNotionClient();
    // Pre-create sync state but not for this file
    const state = await loadSyncState('dest-page-id');
    await saveSyncState(state);

    await importMarkdown(scan, 'dest-page-id', {
      notionClient: notion,
      verbose: true,
    });

    const updatedState = await loadSyncState('dest-page-id');
    expect(updatedState.files['new.md']?.notionPageId).toBe('new-page-id');
    expect(notion.pages.create).toHaveBeenCalled();
  });

  test('wraps errors with file context', async () => {
    const filePath = join(testDir, 'error.md');
    await writeFile(filePath, '# Content');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'error',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    const notion = createMockNotionClient();
    // Mock blocks.children.append to throw an error
    (
      notion.blocks.children.append as ReturnType<typeof mock>
    )?.mockRejectedValueOnce(new Error('Notion API error'));

    await expect(
      importMarkdown(scan, 'dest-page-id', {
        notionClient: notion,
      })
    ).rejects.toThrow('Error processing error.md: Notion API error');
  });

  test('uploads local image file when present', async () => {
    const imagePath = join(testDir, 'image.png');
    // Create a valid PNG file (1x1 transparent pixel)
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await writeFile(imagePath, pngData);

    const filePath = join(testDir, 'doc.md');
    await writeFile(filePath, '# Doc\n\n![Image](image.png)');

    const scan: ScanResult = {
      inputPath: filePath,
      isDirectory: false,
      rootDir: testDir,
      rootName: 'doc',
      mdFiles: [filePath],
      directories: [],
      createRootPage: false,
    };

    const notion = createMockNotionClient();
    await importMarkdown(scan, 'dest-page-id', {
      notionClient: notion,
      verbose: true,
    });

    const state = await loadSyncState('dest-page-id');
    expect(state.files['doc.md']?.notionPageId).toBe('new-page-id');
    // Verify the image upload was attempted
    expect(notion.fileUploads.create).toHaveBeenCalled();
  });
});
