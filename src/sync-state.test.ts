import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SyncState } from './sync-state';
import { getStatePath, loadSyncState, saveSyncState } from './sync-state';

let testDir: string;
let originalCwd: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'md-to-notion-test-'));
  originalCwd = process.cwd();
  process.chdir(testDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(testDir, { recursive: true, force: true });
});

describe('loadSyncState', () => {
  test("creates new state when file doesn't exist", async () => {
    const destinationPageId = 'test-page-id';
    const state = await loadSyncState(destinationPageId);

    expect(state.destinationPageId).toBe(destinationPageId);
    expect(state.files).toEqual({});
    expect(state.directories).toEqual({});
  });

  test('loads existing state', async () => {
    const destinationPageId = 'test-page-id';
    const existingState: SyncState = {
      destinationPageId,
      files: {
        'file1.md': {
          notionPageId: 'page-1',
          contentHash: 'hash1',
          lastSynced: '2024-01-01T00:00:00Z',
        },
      },
      directories: {
        '.': {
          notionPageId: 'root-page',
        },
      },
    };

    await saveSyncState(existingState);
    const loadedState = await loadSyncState(destinationPageId);

    expect(loadedState.destinationPageId).toBe(destinationPageId);
    expect(loadedState.files).toEqual(existingState.files);
    expect(loadedState.directories).toEqual(existingState.directories);
  });

  test('throws on page ID mismatch', async () => {
    const state1: SyncState = {
      destinationPageId: 'page-1',
      files: {},
      directories: {},
    };

    await saveSyncState(state1);

    await expect(loadSyncState('page-2')).rejects.toThrow(
      'Destination page ID mismatch'
    );
  });
});

describe('saveSyncState', () => {
  test('writes state to disk', async () => {
    const state: SyncState = {
      destinationPageId: 'test-page-id',
      files: {
        'file1.md': {
          notionPageId: 'page-1',
          contentHash: 'hash1',
          lastSynced: '2024-01-01T00:00:00Z',
        },
      },
      directories: {
        '.': {
          notionPageId: 'root-page',
        },
      },
    };

    await saveSyncState(state);
    const file = Bun.file(getStatePath());
    expect(await file.exists()).toBe(true);

    const content = await file.text();
    const parsed = JSON.parse(content) as SyncState;
    expect(parsed.destinationPageId).toBe(state.destinationPageId);
    expect(parsed.files).toEqual(state.files);
    expect(parsed.directories).toEqual(state.directories);
  });

  test('preserves file mappings', async () => {
    const state: SyncState = {
      destinationPageId: 'test-page-id',
      files: {
        'file1.md': {
          notionPageId: 'page-1',
          contentHash: 'hash1',
          lastSynced: '2024-01-01T00:00:00Z',
        },
        'subdir/file2.md': {
          notionPageId: 'page-2',
          contentHash: 'hash2',
          lastSynced: '2024-01-02T00:00:00Z',
        },
      },
      directories: {},
    };

    await saveSyncState(state);
    const loaded = await loadSyncState('test-page-id');

    expect(loaded.files).toEqual(state.files);
    expect(loaded.files['file1.md']?.notionPageId).toBe('page-1');
    expect(loaded.files['subdir/file2.md']?.notionPageId).toBe('page-2');
  });

  test('preserves directory mappings', async () => {
    const state: SyncState = {
      destinationPageId: 'test-page-id',
      files: {},
      directories: {
        '.': {
          notionPageId: 'root-page',
        },
        subdir: {
          notionPageId: 'subdir-page',
        },
      },
    };

    await saveSyncState(state);
    const loaded = await loadSyncState('test-page-id');

    expect(loaded.directories).toEqual(state.directories);
    expect(loaded.directories['.']?.notionPageId).toBe('root-page');
    expect(loaded.directories.subdir?.notionPageId).toBe('subdir-page');
  });

  test('overwrites existing state', async () => {
    const state1: SyncState = {
      destinationPageId: 'test-page-id',
      files: {
        'file1.md': {
          notionPageId: 'page-1',
          contentHash: 'hash1',
          lastSynced: '2024-01-01T00:00:00Z',
        },
      },
      directories: {},
    };

    await saveSyncState(state1);

    const state2: SyncState = {
      destinationPageId: 'test-page-id',
      files: {
        'file2.md': {
          notionPageId: 'page-2',
          contentHash: 'hash2',
          lastSynced: '2024-01-02T00:00:00Z',
        },
      },
      directories: {},
    };

    await saveSyncState(state2);
    const loaded = await loadSyncState('test-page-id');

    expect(loaded.files).toEqual(state2.files);
    expect(loaded.files['file1.md']).toBeUndefined();
  });
});

describe('getStatePath', () => {
  test('returns correct path', () => {
    const path = getStatePath();
    expect(path).toContain('.notion-sync.json');
    expect(path).toBe(join(process.cwd(), '.notion-sync.json'));
  });
});
