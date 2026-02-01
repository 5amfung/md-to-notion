import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import type { Block, ImageSource } from '../parser/blocks';
import type { InlineSegment } from '../parser/inline';

type RichText = Record<string, unknown>;
type NotionBlock = Record<string, unknown>;

export type BuildOptions = {
  uploadLocalImage: (filePath: string) => Promise<string>;
  missingImagePlaceholder: (imagePath: string) => NotionBlock;
};

function toRichText(segments: InlineSegment[]): RichText[] {
  return segments.map((segment) => {
    if (segment.type === 'equation') {
      return { type: 'equation', equation: { expression: segment.text } };
    }
    const annotations = segment.annotations || {};
    return {
      type: 'text',
      text: {
        content: segment.text,
        link: segment.link ? { url: segment.link } : undefined,
      },
      annotations:
        Object.keys(annotations).length > 0 ? annotations : undefined,
    };
  });
}

async function buildImageBlock(
  source: ImageSource,
  caption: InlineSegment[],
  options: BuildOptions
): Promise<NotionBlock> {
  if (source.type === 'external') {
    return {
      type: 'image',
      image: {
        type: 'external',
        external: { url: source.url },
        caption: toRichText(caption),
      },
    };
  }

  const file = Bun.file(source.path);
  if (!(await file.exists())) {
    return options.missingImagePlaceholder(source.path);
  }

  const uploadId = await options.uploadLocalImage(source.path);
  return {
    type: 'image',
    image: {
      type: 'file_upload',
      file_upload: { id: uploadId },
      caption: toRichText(caption),
    },
  };
}

export async function buildNotionBlocks(
  blocks: Block[],
  options: BuildOptions
): Promise<BlockObjectRequest[]> {
  const result: NotionBlock[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        result.push({
          type: 'paragraph',
          paragraph: { rich_text: toRichText(block.richText) },
        });
        break;
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        result.push({
          type: block.type,
          [block.type]: { rich_text: toRichText(block.richText) },
        });
        break;
      case 'bulleted_list_item':
      case 'numbered_list_item': {
        const children =
          block.children && block.children.length > 0
            ? await buildNotionBlocks(block.children, options)
            : undefined;
        result.push({
          type: block.type,
          [block.type]: {
            rich_text: toRichText(block.richText),
            children,
          },
        });
        break;
      }
      case 'to_do':
        result.push({
          type: 'to_do',
          to_do: {
            rich_text: toRichText(block.richText),
            checked: block.checked,
          },
        });
        break;
      case 'code':
        result.push({
          type: 'code',
          code: {
            rich_text: [
              {
                type: 'text',
                text: { content: block.text },
              },
            ],
            language: block.language,
          },
        });
        break;
      case 'quote':
        result.push({
          type: 'quote',
          quote: {
            rich_text: toRichText(block.richText),
            color: 'default',
          },
        });
        break;
      case 'callout':
        result.push({
          type: 'callout',
          callout: {
            rich_text: toRichText(block.richText),
            icon: { type: 'emoji', emoji: block.emoji },
            color: block.color,
          },
        });
        break;
      case 'equation':
        result.push({
          type: 'equation',
          equation: { expression: block.expression },
        });
        break;
      case 'divider':
        result.push({ type: 'divider', divider: {} });
        break;
      case 'image':
        result.push(
          await buildImageBlock(block.source, block.caption, options)
        );
        break;
      case 'table': {
        const rows = block.rows.map((row) => ({
          type: 'table_row',
          table_row: {
            cells: row.map((cell) => toRichText(cell)),
          },
        }));
        result.push({
          type: 'table',
          table: {
            table_width: rows[0]?.table_row.cells.length || 1,
            has_column_header: block.hasColumnHeader,
            has_row_header: block.hasRowHeader,
            children: rows,
          },
        });
        break;
      }
      default:
        break;
    }
  }

  return result as BlockObjectRequest[];
}
