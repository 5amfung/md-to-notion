import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Block } from '../parser/blocks';
import type { BuildOptions } from './blocks';
import { buildNotionBlocks } from './blocks';

const mockUploadLocalImage = async (filePath: string): Promise<string> => {
  return `upload-id-${filePath}`;
};

const mockMissingImagePlaceholder = (imagePath: string) => ({
  type: 'paragraph',
  paragraph: {
    rich_text: [
      { type: 'text', text: { content: `[Missing image: ${imagePath}]` } },
    ],
  },
});

const buildOptions: BuildOptions = {
  uploadLocalImage: mockUploadLocalImage,
  missingImagePlaceholder: mockMissingImagePlaceholder,
};

describe('buildNotionBlocks', () => {
  test('paragraph block', async () => {
    const blocks: Block[] = [
      {
        type: 'paragraph',
        richText: [{ type: 'text', text: 'Hello world' }],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'paragraph');
    expect(result[0]).toHaveProperty('paragraph');
  });

  test('heading 1', async () => {
    const blocks: Block[] = [
      {
        type: 'heading_1',
        richText: [{ type: 'text', text: 'Heading' }],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'heading_1');
  });

  test('heading 2', async () => {
    const blocks: Block[] = [
      {
        type: 'heading_2',
        richText: [{ type: 'text', text: 'Heading' }],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'heading_2');
  });

  test('heading 3', async () => {
    const blocks: Block[] = [
      {
        type: 'heading_3',
        richText: [{ type: 'text', text: 'Heading' }],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'heading_3');
  });

  test('bulleted list item', async () => {
    const blocks: Block[] = [
      {
        type: 'bulleted_list_item',
        richText: [{ type: 'text', text: 'Item 1' }],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'bulleted_list_item');
  });

  test('bulleted list item with children', async () => {
    const blocks: Block[] = [
      {
        type: 'bulleted_list_item',
        richText: [{ type: 'text', text: 'Parent' }],
        children: [
          {
            type: 'bulleted_list_item',
            richText: [{ type: 'text', text: 'Child' }],
          },
        ],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'bulleted_list_item');
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const item = result[0] as any;
    expect(item.bulleted_list_item.children).toBeDefined();
    expect(item.bulleted_list_item.children.length).toBe(1);
  });

  test('bulleted list item with empty children omits children', async () => {
    const blocks: Block[] = [
      {
        type: 'bulleted_list_item',
        richText: [{ type: 'text', text: 'Leaf item' }],
        children: [],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const item = result[0] as any;
    expect(item.bulleted_list_item.children).toBeUndefined();
  });

  test('numbered list item', async () => {
    const blocks: Block[] = [
      {
        type: 'numbered_list_item',
        richText: [{ type: 'text', text: 'Item 1' }],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'numbered_list_item');
  });

  test('to_do unchecked', async () => {
    const blocks: Block[] = [
      {
        type: 'to_do',
        richText: [{ type: 'text', text: 'Task' }],
        checked: false,
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'to_do');
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const todo = result[0] as any;
    expect(todo.to_do.checked).toBe(false);
  });

  test('to_do checked', async () => {
    const blocks: Block[] = [
      {
        type: 'to_do',
        richText: [{ type: 'text', text: 'Task' }],
        checked: true,
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const todo = result[0] as any;
    expect(todo.to_do.checked).toBe(true);
  });

  test('code block', async () => {
    const blocks: Block[] = [
      {
        type: 'code',
        language: 'typescript',
        text: 'const x = 1;',
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'code');
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const code = result[0] as any;
    expect(code.code.language).toBe('typescript');
    expect(code.code.rich_text[0].text.content).toBe('const x = 1;');
  });

  test('quote block', async () => {
    const blocks: Block[] = [
      {
        type: 'quote',
        richText: [{ type: 'text', text: 'This is a quote' }],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'quote');
  });

  test('callout block', async () => {
    const blocks: Block[] = [
      {
        type: 'callout',
        richText: [{ type: 'text', text: 'This is a tip' }],
        emoji: '💡',
        color: 'yellow_background',
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'callout');
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const callout = result[0] as any;
    expect(callout.callout.icon.emoji).toBe('💡');
    expect(callout.callout.color).toBe('yellow_background');
  });

  test('equation block', async () => {
    const blocks: Block[] = [
      {
        type: 'equation',
        expression: 'E = mc^2',
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'equation');
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const equation = result[0] as any;
    expect(equation.equation.expression).toBe('E = mc^2');
  });

  test('divider block', async () => {
    const blocks: Block[] = [{ type: 'divider' }];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'divider');
  });

  test('table block', async () => {
    const blocks: Block[] = [
      {
        type: 'table',
        rows: [
          [
            [{ type: 'text', text: 'Header 1' }],
            [{ type: 'text', text: 'Header 2' }],
          ],
          [
            [{ type: 'text', text: 'Cell 1' }],
            [{ type: 'text', text: 'Cell 2' }],
          ],
        ],
        hasColumnHeader: true,
        hasRowHeader: false,
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'table');
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const table = result[0] as any;
    expect(table.table.has_column_header).toBe(true);
    expect(table.table.has_row_header).toBe(false);
    expect(table.table.children.length).toBe(2);
  });

  test('image block with external URL', async () => {
    const blocks: Block[] = [
      {
        type: 'image',
        source: { type: 'external', url: 'https://example.com/image.png' },
        caption: [{ type: 'text', text: 'Caption' }],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('type', 'image');
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const image = result[0] as any;
    expect(image.image.type).toBe('external');
    expect(image.image.external.url).toBe('https://example.com/image.png');
  });

  test('image block with local file (missing)', async () => {
    // When local file doesn't exist, missingImagePlaceholder is called
    const blocks: Block[] = [
      {
        type: 'image',
        source: { type: 'local', path: '/nonexistent/path/to/image.png' },
        caption: [],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    // Since file doesn't exist, returns placeholder paragraph
    expect(result[0]).toHaveProperty('type', 'paragraph');
  });

  test('image block with local file (exists)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'md-to-notion-img-'));
    const imagePath = join(dir, 'image.png');
    await writeFile(imagePath, 'fake png content');
    try {
      const blocks: Block[] = [
        {
          type: 'image',
          source: { type: 'local', path: imagePath },
          caption: [{ type: 'text', text: 'Local' }],
        },
      ];

      const result = await buildNotionBlocks(blocks, buildOptions);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('type', 'image');
      // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
      const image = result[0] as any;
      expect(image.image.type).toBe('file_upload');
      expect(image.image.file_upload.id).toBe(`upload-id-${imagePath}`);
      expect(image.image.caption).toBeDefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('rich text with annotations', async () => {
    const blocks: Block[] = [
      {
        type: 'paragraph',
        richText: [
          { type: 'text', text: 'Bold ', annotations: { bold: true } },
          { type: 'text', text: 'italic', annotations: { italic: true } },
        ],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const paragraph = result[0] as any;
    expect(paragraph.paragraph.rich_text.length).toBe(2);
    expect(paragraph.paragraph.rich_text[0].annotations.bold).toBe(true);
    expect(paragraph.paragraph.rich_text[1].annotations.italic).toBe(true);
  });

  test('rich text with link', async () => {
    const blocks: Block[] = [
      {
        type: 'paragraph',
        richText: [{ type: 'text', text: 'Link', link: 'https://example.com' }],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const paragraph = result[0] as any;
    expect(paragraph.paragraph.rich_text[0].text.link.url).toBe(
      'https://example.com'
    );
  });

  test('wiki-link resolves to page mention', async () => {
    const blocks: Block[] = [
      {
        type: 'paragraph',
        richText: [
          { type: 'wiki_link', target: 'Page Name', display: 'Custom Display' },
        ],
      },
    ];

    const result = await buildNotionBlocks(blocks, {
      ...buildOptions,
      resolveWikiLink: (target) =>
        target === 'Page Name' ? 'page-id-123' : null,
    });

    expect(result).toHaveLength(1);
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const paragraph = result[0] as any;
    expect(paragraph.paragraph.rich_text[0].type).toBe('mention');
    expect(paragraph.paragraph.rich_text[0].mention.page.id).toBe(
      'page-id-123'
    );
  });

  test('wiki-link falls back to styled text when unresolved', async () => {
    const blocks: Block[] = [
      {
        type: 'paragraph',
        richText: [
          {
            type: 'wiki_link',
            target: 'Missing Page',
            display: 'Missing Page',
          },
        ],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const paragraph = result[0] as any;
    expect(paragraph.paragraph.rich_text[0].text.content).toBe('Missing Page');
    expect(paragraph.paragraph.rich_text[0].annotations.bold).toBe(true);
    expect(paragraph.paragraph.rich_text[0].annotations.color).toBe('blue');
  });

  test('inline equation', async () => {
    const blocks: Block[] = [
      {
        type: 'paragraph',
        richText: [
          { type: 'text', text: 'Formula: ' },
          { type: 'equation', text: 'E = mc^2' },
        ],
      },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(1);
    // biome-ignore lint/suspicious/noExplicitAny: Notion SDK types are complex discriminated unions
    const paragraph = result[0] as any;
    expect(paragraph.paragraph.rich_text.length).toBe(2);
    expect(paragraph.paragraph.rich_text[1].type).toBe('equation');
    expect(paragraph.paragraph.rich_text[1].equation.expression).toBe(
      'E = mc^2'
    );
  });

  test('multiple blocks', async () => {
    const blocks: Block[] = [
      { type: 'heading_1', richText: [{ type: 'text', text: 'Title' }] },
      { type: 'paragraph', richText: [{ type: 'text', text: 'Content' }] },
      { type: 'divider' },
    ];

    const result = await buildNotionBlocks(blocks, buildOptions);

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('type', 'heading_1');
    expect(result[1]).toHaveProperty('type', 'paragraph');
    expect(result[2]).toHaveProperty('type', 'divider');
  });
});
