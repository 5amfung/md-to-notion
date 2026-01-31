---
name: md-to-notion
description: Convert markdown files to Notion pages using the Notion SDK for JavaScript. Handles Obsidian-specific syntax including wiki-links, callouts, embeds, frontmatter, LaTeX math, and images. Use when importing markdown to Notion, syncing Obsidian notes to Notion, or building markdown-to-Notion converters.
---

# Markdown to Notion Conversion

Convert markdown files to Notion pages using `@notionhq/client`. This skill covers parsing markdown, mapping elements to Notion blocks, and handling Obsidian-specific syntax.

## Setup

```typescript
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
```

Required environment variable: `NOTION_API_KEY` (create at https://www.notion.so/my-integrations)

## Conversion Workflow

1. **Parse frontmatter** - Extract YAML metadata (tags, aliases, dates)
2. **Parse markdown** - Use a markdown parser (remark, marked, or manual regex)
3. **Map to Notion blocks** - Convert each element to Notion block format
4. **Handle special syntax** - Process Obsidian wiki-links, callouts, embeds
5. **Upload images** - Host externally or use Notion's file upload
6. **Create page** - Use `notion.pages.create()` with blocks

## Core API Methods

### Create a Page

```typescript
const page = await notion.pages.create({
  parent: { database_id: "DATABASE_ID" }, // or { page_id: "PAGE_ID" }
  properties: {
    Name: { title: [{ text: { content: "Page Title" } }] },
    Tags: { multi_select: [{ name: "tag1" }, { name: "tag2" }] },
  },
  children: blocks, // Array of block objects
});
```

### Append Blocks to Page

```typescript
await notion.blocks.children.append({
  block_id: pageId,
  children: blocks,
});
```

**Important**: Notion limits `children` to 100 blocks per request. Batch accordingly.

## Block Type Mapping

| Markdown | Notion Block Type |
|----------|-------------------|
| `# Heading` | `heading_1` |
| `## Heading` | `heading_2` |
| `### Heading` | `heading_3` |
| Paragraph | `paragraph` |
| `- item` | `bulleted_list_item` |
| `1. item` | `numbered_list_item` |
| `- [ ] task` | `to_do` |
| `` `code` `` | `code` (inline in rich_text) |
| Code block | `code` |
| `> quote` | `quote` |
| `---` | `divider` |
| `![alt](url)` | `image` |
| Table | `table` + `table_row` |
| `$...$` | `equation` (inline) |
| `$$...$$` | `equation` (block) |

See [notion-blocks.md](notion-blocks.md) for complete block structures.

## Obsidian-Specific Handling

### Wiki-Links

Convert `[[Page Name]]` and `[[Page Name|Display Text]]`:

```typescript
function parseWikiLink(text: string): { target: string; display: string } | null {
  const match = text.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (!match) return null;
  return { target: match[1], display: match[2] || match[1] };
}
```

**Strategy**: Convert to regular links pointing to your Notion page URL mapping, or convert to plain text with formatting.

### Callouts

Convert Obsidian callouts `> [!type] Title`:

```typescript
function parseCallout(line: string): { type: string; title?: string } | null {
  const match = line.match(/^>\s*\[!(\w+)\]\s*(.*)?$/);
  if (!match) return null;
  return { type: match[1], title: match[2]?.trim() };
}
```

Map to Notion `callout` block with appropriate emoji:

| Obsidian Type | Notion Emoji |
|---------------|--------------|
| `tip` | 💡 |
| `info` | ℹ️ |
| `warning` | ⚠️ |
| `danger` | 🚫 |
| `note` | 📝 |
| `example` | 📋 |
| `quote` | 💬 |

### Embeds

Convert `![[filename]]` embeds:
- **Images**: Convert to `image` block
- **Notes**: Inline the content or create a link
- **PDFs**: Convert to `pdf` block (external URL required)

### Frontmatter

Parse YAML frontmatter for page properties:

```typescript
function parseFrontmatter(content: string): { metadata: Record<string, any>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: content };
  // Parse YAML (use js-yaml or simple regex for basic cases)
  return { metadata: parseYaml(match[1]), body: match[2] };
}
```

Map frontmatter to Notion database properties:
- `tags` → `multi_select`
- `created`/`updated` → `date`
- `aliases` → `rich_text` or custom property

## Image Handling

Notion requires externally hosted images. Options:

1. **Use existing URLs** - If images are already hosted
2. **Upload to cloud storage** - S3, Cloudflare R2, etc.
3. **Use Notion's temporary upload** (limited, not recommended for bulk)

```typescript
const imageBlock = {
  type: "image",
  image: {
    type: "external",
    external: { url: "https://example.com/image.png" },
  },
};
```

For Obsidian relative paths like `![](folder/image.png)`, resolve the full path and upload.

## LaTeX Math

### Inline Math

Convert `$E = mc^2$` to inline equation:

```typescript
{
  type: "equation",
  equation: { expression: "E = mc^2" }
}
```

### Block Math

Convert `$$...$$` to equation block:

```typescript
{
  type: "equation",
  equation: { expression: "\\sum_{i=1}^n x_i" }
}
```

## Rich Text Formatting

Notion uses `rich_text` arrays for formatted text:

```typescript
const richText = [
  { type: "text", text: { content: "Normal text " } },
  { type: "text", text: { content: "bold" }, annotations: { bold: true } },
  { type: "text", text: { content: " and " } },
  { type: "text", text: { content: "italic" }, annotations: { italic: true } },
];
```

### Annotations

```typescript
{
  bold: boolean,
  italic: boolean,
  strikethrough: boolean,
  underline: boolean,
  code: boolean,
  color: "default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red"
}
```

## Error Handling

```typescript
try {
  await notion.pages.create({ ... });
} catch (error) {
  if (error.code === "validation_error") {
    // Invalid block structure
  } else if (error.code === "rate_limited") {
    // Wait and retry (respect Retry-After header)
  }
}
```

## Batch Processing

For large vaults, process files in batches:

```typescript
const BATCH_SIZE = 100;

async function createPageWithBlocks(parentId: string, title: string, blocks: Block[]) {
  const page = await notion.pages.create({
    parent: { database_id: parentId },
    properties: { Name: { title: [{ text: { content: title } }] } },
    children: blocks.slice(0, BATCH_SIZE),
  });

  // Append remaining blocks in batches
  for (let i = BATCH_SIZE; i < blocks.length; i += BATCH_SIZE) {
    await notion.blocks.children.append({
      block_id: page.id,
      children: blocks.slice(i, i + BATCH_SIZE),
    });
  }

  return page;
}
```

## Additional Resources

- For complete Notion block structures, see [notion-blocks.md](notion-blocks.md)
- For conversion examples, see [examples.md](examples.md)
- [Notion API Reference](https://developers.notion.com/reference)
