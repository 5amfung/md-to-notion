import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Client } from '@notionhq/client';
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';

// Dynamic import to get fresh module (avoids mock pollution from other tests)
let createNotionClient: typeof import('./client').createNotionClient;
let createPageWithBlocks: typeof import('./client').createPageWithBlocks;
let appendBlocks: typeof import('./client').appendBlocks;
let listAllBlocks: typeof import('./client').listAllBlocks;
let replacePageBlocks: typeof import('./client').replacePageBlocks;

beforeEach(async () => {
  // Re-import the actual module to avoid mock pollution
  const clientModule = await import('./client');
  createNotionClient = clientModule.createNotionClient;
  createPageWithBlocks = clientModule.createPageWithBlocks;
  appendBlocks = clientModule.appendBlocks;
  listAllBlocks = clientModule.listAllBlocks;
  replacePageBlocks = clientModule.replacePageBlocks;
});

describe('createNotionClient', () => {
  test('creates client with API key', async () => {
    const originalKey = process.env.NOTION_API_KEY;
    process.env.NOTION_API_KEY = 'test-key';

    const client = createNotionClient();

    expect(client).toBeInstanceOf(Client);
    process.env.NOTION_API_KEY = originalKey;
  });
});

describe('createPageWithBlocks', () => {
  test('creates page with blocks under 100', async () => {
    const mockClient = {
      pages: {
        create: mock(() =>
          Promise.resolve({
            id: 'page-id',
          })
        ),
      },
      blocks: {
        children: {
          append: mock(() => Promise.resolve({})),
        },
      },
    } as unknown as Client;

    const blocks: BlockObjectRequest[] = Array(50).fill({
      type: 'paragraph',
      paragraph: { rich_text: [] },
    });

    const pageId = await createPageWithBlocks(
      mockClient,
      'parent-id',
      'Test Page',
      blocks
    );

    expect(pageId).toBe('page-id');
    expect(mockClient.pages.create).toHaveBeenCalledTimes(1);
    expect(mockClient.blocks.children.append).toHaveBeenCalledTimes(0);
  });

  test('paginates blocks over 100', async () => {
    const mockClient = {
      pages: {
        create: mock(() =>
          Promise.resolve({
            id: 'page-id',
          })
        ),
      },
      blocks: {
        children: {
          append: mock(() => Promise.resolve({})),
        },
      },
    } as unknown as Client;

    const blocks: BlockObjectRequest[] = Array(250).fill({
      type: 'paragraph',
      paragraph: { rich_text: [] },
    });

    const pageId = await createPageWithBlocks(
      mockClient,
      'parent-id',
      'Test Page',
      blocks
    );

    expect(pageId).toBe('page-id');
    expect(mockClient.pages.create).toHaveBeenCalledTimes(1);
    // Should append 2 more batches (100-199, 200-249)
    expect(mockClient.blocks.children.append).toHaveBeenCalledTimes(2);
  });

  test('exactly 100 blocks', async () => {
    const mockClient = {
      pages: {
        create: mock(() =>
          Promise.resolve({
            id: 'page-id',
          })
        ),
      },
      blocks: {
        children: {
          append: mock(() => Promise.resolve({})),
        },
      },
    } as unknown as Client;

    const blocks: BlockObjectRequest[] = Array(100).fill({
      type: 'paragraph',
      paragraph: { rich_text: [] },
    });

    const pageId = await createPageWithBlocks(
      mockClient,
      'parent-id',
      'Test Page',
      blocks
    );

    expect(pageId).toBe('page-id');
    expect(mockClient.pages.create).toHaveBeenCalledTimes(1);
    expect(mockClient.blocks.children.append).toHaveBeenCalledTimes(0);
  });
});

describe('appendBlocks', () => {
  test('appends blocks in batches', async () => {
    const mockClient = {
      blocks: {
        children: {
          append: mock(() => Promise.resolve({})),
        },
      },
    } as unknown as Client;

    const blocks: BlockObjectRequest[] = Array(250).fill({
      type: 'paragraph',
      paragraph: { rich_text: [] },
    });

    await appendBlocks(mockClient, 'block-id', blocks);

    // Should append in 3 batches (0-99, 100-199, 200-249)
    expect(mockClient.blocks.children.append).toHaveBeenCalledTimes(3);
  });

  test('empty blocks array', async () => {
    const mockClient = {
      blocks: {
        children: {
          append: mock(() => Promise.resolve({})),
        },
      },
    } as unknown as Client;

    await appendBlocks(mockClient, 'block-id', []);

    expect(mockClient.blocks.children.append).toHaveBeenCalledTimes(0);
  });
});

describe('listAllBlocks', () => {
  test('lists all blocks with pagination', async () => {
    const mockClient = {
      blocks: {
        children: {
          list: mock((params: { block_id: string; start_cursor?: string }) => {
            if (!params.start_cursor) {
              return Promise.resolve({
                results: Array(100).fill({ id: 'block-id' }),
                has_more: true,
                next_cursor: 'cursor-1',
              });
            }
            if (params.start_cursor === 'cursor-1') {
              return Promise.resolve({
                results: Array(50).fill({ id: 'block-id-2' }),
                has_more: false,
              });
            }
            return Promise.resolve({
              results: [],
              has_more: false,
            });
          }),
        },
      },
    } as unknown as Client;

    const blockIds = await listAllBlocks(mockClient, 'page-id');

    expect(blockIds.length).toBe(150);
    expect(mockClient.blocks.children.list).toHaveBeenCalledTimes(2);
  });

  test('no pagination needed', async () => {
    const mockClient = {
      blocks: {
        children: {
          list: mock(() =>
            Promise.resolve({
              results: Array(50).fill({ id: 'block-id' }),
              has_more: false,
            })
          ),
        },
      },
    } as unknown as Client;

    const blockIds = await listAllBlocks(mockClient, 'page-id');

    expect(blockIds.length).toBe(50);
    expect(mockClient.blocks.children.list).toHaveBeenCalledTimes(1);
  });

  test('empty page', async () => {
    const mockClient = {
      blocks: {
        children: {
          list: mock(() =>
            Promise.resolve({
              results: [],
              has_more: false,
            })
          ),
        },
      },
    } as unknown as Client;

    const blockIds = await listAllBlocks(mockClient, 'page-id');

    expect(blockIds.length).toBe(0);
  });
});

describe('replacePageBlocks', () => {
  test('deletes existing blocks and appends new ones', async () => {
    const existingBlockIds = ['block-1', 'block-2', 'block-3'];
    const mockClient = {
      blocks: {
        children: {
          list: mock(() =>
            Promise.resolve({
              results: existingBlockIds.map((id) => ({ id })),
              has_more: false,
            })
          ),
          append: mock(() => Promise.resolve({})),
        },
        delete: mock(() => Promise.resolve({})),
      },
    } as unknown as Client;

    const newBlocks: BlockObjectRequest[] = [
      { type: 'paragraph', paragraph: { rich_text: [] } },
      { type: 'paragraph', paragraph: { rich_text: [] } },
    ];

    await replacePageBlocks(mockClient, 'page-id', newBlocks);

    // Should delete all existing blocks
    expect(mockClient.blocks.delete).toHaveBeenCalledTimes(3);
    expect(mockClient.blocks.delete).toHaveBeenCalledWith({
      block_id: 'block-1',
    });
    expect(mockClient.blocks.delete).toHaveBeenCalledWith({
      block_id: 'block-2',
    });
    expect(mockClient.blocks.delete).toHaveBeenCalledWith({
      block_id: 'block-3',
    });

    // Should append new blocks
    expect(mockClient.blocks.children.append).toHaveBeenCalledTimes(1);
  });

  test('empty page', async () => {
    const mockClient = {
      blocks: {
        children: {
          list: mock(() =>
            Promise.resolve({
              results: [],
              has_more: false,
            })
          ),
          append: mock(() => Promise.resolve({})),
        },
        delete: mock(() => Promise.resolve({})),
      },
    } as unknown as Client;

    const newBlocks: BlockObjectRequest[] = [
      { type: 'paragraph', paragraph: { rich_text: [] } },
    ];

    await replacePageBlocks(mockClient, 'page-id', newBlocks);

    expect(mockClient.blocks.delete).toHaveBeenCalledTimes(0);
    expect(mockClient.blocks.children.append).toHaveBeenCalledTimes(1);
  });

  test('paginated deletion', async () => {
    const existingBlockIds = Array(250)
      .fill(null)
      .map((_, i) => `block-${i}`);
    const mockClient = {
      blocks: {
        children: {
          list: mock(() =>
            Promise.resolve({
              results: existingBlockIds.map((id) => ({ id })),
              has_more: false,
            })
          ),
          append: mock(() => Promise.resolve({})),
        },
        delete: mock(() => Promise.resolve({})),
      },
    } as unknown as Client;

    const newBlocks: BlockObjectRequest[] = [
      { type: 'paragraph', paragraph: { rich_text: [] } },
    ];

    await replacePageBlocks(mockClient, 'page-id', newBlocks);

    // Should delete all 250 blocks
    expect(mockClient.blocks.delete).toHaveBeenCalledTimes(250);
  });
});
