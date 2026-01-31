# Markdown to Notion Conversion Examples

Practical examples for converting common markdown patterns to Notion blocks.

## Basic Paragraph with Formatting

**Markdown:**
```markdown
This is **bold**, *italic*, and `inline code`.
```

**Notion blocks:**
```typescript
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "This is " } },
      { type: "text", text: { content: "bold" }, annotations: { bold: true } },
      { type: "text", text: { content: ", " } },
      { type: "text", text: { content: "italic" }, annotations: { italic: true } },
      { type: "text", text: { content: ", and " } },
      { type: "text", text: { content: "inline code" }, annotations: { code: true } },
      { type: "text", text: { content: "." } },
    ],
  },
}
```

## Nested Lists

**Markdown:**
```markdown
- Item 1
  - Nested item
  - Another nested
- Item 2
```

**Notion blocks:**
```typescript
[
  {
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [{ type: "text", text: { content: "Item 1" } }],
      children: [
        {
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ type: "text", text: { content: "Nested item" } }],
          },
        },
        {
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ type: "text", text: { content: "Another nested" } }],
          },
        },
      ],
    },
  },
  {
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [{ type: "text", text: { content: "Item 2" } }],
    },
  },
]
```

## Obsidian Callout

**Markdown:**
```markdown
> [!tip] Pro Tip
> This is a helpful tip with **bold** text.
```

**Notion block:**
```typescript
{
  type: "callout",
  callout: {
    rich_text: [
      { type: "text", text: { content: "Pro Tip\n" }, annotations: { bold: true } },
      { type: "text", text: { content: "This is a helpful tip with " } },
      { type: "text", text: { content: "bold" }, annotations: { bold: true } },
      { type: "text", text: { content: " text." } },
    ],
    icon: { type: "emoji", emoji: "💡" },
    color: "yellow_background",
  },
}
```

## Code Block with Language

**Markdown:**
````markdown
```typescript
function hello(name: string): string {
  return `Hello, ${name}!`;
}
```
````

**Notion block:**
```typescript
{
  type: "code",
  code: {
    rich_text: [
      {
        type: "text",
        text: {
          content: `function hello(name: string): string {
  return \`Hello, \${name}!\`;
}`,
        },
      },
    ],
    language: "typescript",
  },
}
```

## LaTeX Math

**Markdown:**
```markdown
Inline math: $E = mc^2$

Block math:
$$
\sum_{i=1}^{n} x_i = x_1 + x_2 + \cdots + x_n
$$
```

**Notion blocks:**
```typescript
// Inline math in paragraph
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "Inline math: " } },
      { type: "equation", equation: { expression: "E = mc^2" } },
    ],
  },
}

// Block math
{
  type: "equation",
  equation: {
    expression: "\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n",
  },
}
```

## Table

**Markdown:**
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

**Notion blocks:**
```typescript
{
  type: "table",
  table: {
    table_width: 3,
    has_column_header: true,
    has_row_header: false,
    children: [
      {
        type: "table_row",
        table_row: {
          cells: [
            [{ type: "text", text: { content: "Header 1" } }],
            [{ type: "text", text: { content: "Header 2" } }],
            [{ type: "text", text: { content: "Header 3" } }],
          ],
        },
      },
      {
        type: "table_row",
        table_row: {
          cells: [
            [{ type: "text", text: { content: "Cell 1" } }],
            [{ type: "text", text: { content: "Cell 2" } }],
            [{ type: "text", text: { content: "Cell 3" } }],
          ],
        },
      },
      {
        type: "table_row",
        table_row: {
          cells: [
            [{ type: "text", text: { content: "Cell 4" } }],
            [{ type: "text", text: { content: "Cell 5" } }],
            [{ type: "text", text: { content: "Cell 6" } }],
          ],
        },
      },
    ],
  },
}
```

## Image with Caption

**Markdown:**
```markdown
![Neural Network Diagram](https://example.com/nn.png)
```

**Notion block:**
```typescript
{
  type: "image",
  image: {
    type: "external",
    external: { url: "https://example.com/nn.png" },
    caption: [{ type: "text", text: { content: "Neural Network Diagram" } }],
  },
}
```

## Link in Text

**Markdown:**
```markdown
Check out [Notion API docs](https://developers.notion.com).
```

**Notion block:**
```typescript
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "Check out " } },
      {
        type: "text",
        text: {
          content: "Notion API docs",
          link: { url: "https://developers.notion.com" },
        },
      },
      { type: "text", text: { content: "." } },
    ],
  },
}
```

## Task List

**Markdown:**
```markdown
- [x] Completed task
- [ ] Pending task
```

**Notion blocks:**
```typescript
[
  {
    type: "to_do",
    to_do: {
      rich_text: [{ type: "text", text: { content: "Completed task" } }],
      checked: true,
    },
  },
  {
    type: "to_do",
    to_do: {
      rich_text: [{ type: "text", text: { content: "Pending task" } }],
      checked: false,
    },
  },
]
```

## Complete Page Example

**Markdown file:**
```markdown
---
tags:
  - ML
  - tutorial
created: 2024-01-20T23:02
---

# Neural Networks

Neural networks mimic the brain's structure.

## Key Concepts

- Layers organize neurons
- Activation functions add non-linearity

> [!tip] Remember
> Start with simple architectures.

$$
a_j^{[l]} = g(W_j^{[l]} \cdot a^{[l-1]} + b_j^{[l]})
$$
```

**Notion API call:**
```typescript
const page = await notion.pages.create({
  parent: { database_id: "YOUR_DATABASE_ID" },
  properties: {
    Name: { title: [{ text: { content: "Neural Networks" } }] },
    Tags: { multi_select: [{ name: "ML" }, { name: "tutorial" }] },
    Created: { date: { start: "2024-01-20" } },
  },
  children: [
    {
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "Neural networks mimic the brain's structure." } }],
      },
    },
    {
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "Key Concepts" } }],
      },
    },
    {
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Layers organize neurons" } }],
      },
    },
    {
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Activation functions add non-linearity" } }],
      },
    },
    {
      type: "callout",
      callout: {
        rich_text: [
          { type: "text", text: { content: "Remember\n" }, annotations: { bold: true } },
          { type: "text", text: { content: "Start with simple architectures." } },
        ],
        icon: { type: "emoji", emoji: "💡" },
        color: "yellow_background",
      },
    },
    {
      type: "equation",
      equation: {
        expression: "a_j^{[l]} = g(W_j^{[l]} \\cdot a^{[l-1]} + b_j^{[l]})",
      },
    },
  ],
});
```

## Parsing Helper Functions

### Parse Inline Formatting

```typescript
interface RichTextSegment {
  type: "text" | "equation";
  content: string;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
  };
}

function parseInlineFormatting(text: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let remaining = text;

  // Patterns in order of precedence
  const patterns = [
    { regex: /\$([^$]+)\$/, type: "equation" as const },
    { regex: /\*\*([^*]+)\*\*/, annotation: "bold" },
    { regex: /\*([^*]+)\*/, annotation: "italic" },
    { regex: /`([^`]+)`/, annotation: "code" },
    { regex: /~~([^~]+)~~/, annotation: "strikethrough" },
  ];

  while (remaining.length > 0) {
    let earliestMatch: { index: number; pattern: typeof patterns[0]; match: RegExpMatchArray } | null = null;

    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && match.index !== undefined) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = { index: match.index, pattern, match };
        }
      }
    }

    if (!earliestMatch) {
      if (remaining) segments.push({ type: "text", content: remaining });
      break;
    }

    // Add text before match
    if (earliestMatch.index > 0) {
      segments.push({ type: "text", content: remaining.slice(0, earliestMatch.index) });
    }

    // Add formatted segment
    const { pattern, match } = earliestMatch;
    if (pattern.type === "equation") {
      segments.push({ type: "equation", content: match[1] });
    } else {
      segments.push({
        type: "text",
        content: match[1],
        annotations: { [pattern.annotation!]: true },
      });
    }

    remaining = remaining.slice(earliestMatch.index + match[0].length);
  }

  return segments;
}
```

### Convert to Notion Rich Text

```typescript
function toNotionRichText(segments: RichTextSegment[]): any[] {
  return segments.map((seg) => {
    if (seg.type === "equation") {
      return { type: "equation", equation: { expression: seg.content } };
    }
    return {
      type: "text",
      text: { content: seg.content },
      annotations: seg.annotations || {},
    };
  });
}
```

## Highlights (Obsidian Syntax)

**Markdown:**
```markdown
This word is ==highlighted== for emphasis.
```

**Notion block:**
```typescript
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "This word is " } },
      {
        type: "text",
        text: { content: "highlighted" },
        annotations: { color: "yellow_background" },
      },
      { type: "text", text: { content: " for emphasis." } },
    ],
  },
}
```

**Parser helper:**
```typescript
function parseHighlights(text: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  const regex = /==([^=]+)==/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({
      type: "text",
      content: match[1],
      annotations: { color: "yellow_background" },
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}
```

## Wiki-Links (Obsidian Syntax)

**Markdown:**
```markdown
See [[Neural Networks]] for more details.
Also check [[Machine Learning|ML basics]].
```

**Notion blocks (as plain text with formatting):**
```typescript
// Option 1: Convert to formatted text (when no URL mapping exists)
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "See " } },
      {
        type: "text",
        text: { content: "Neural Networks" },
        annotations: { bold: true, color: "blue" },
      },
      { type: "text", text: { content: " for more details." } },
    ],
  },
}

// Option 2: Convert to link (when URL mapping exists)
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "See " } },
      {
        type: "text",
        text: {
          content: "Neural Networks",
          link: { url: "https://notion.so/page-id-for-neural-networks" },
        },
      },
      { type: "text", text: { content: " for more details." } },
    ],
  },
}
```

**Parser helper:**
```typescript
function parseWikiLinks(text: string): { target: string; display: string; start: number; end: number }[] {
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const links: { target: string; display: string; start: number; end: number }[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    links.push({
      target: match[1],
      display: match[2] || match[1],
      start: match.index,
      end: regex.lastIndex,
    });
  }

  return links;
}
```

## Relative Markdown Links

**Markdown:**
```markdown
See [Conditional Probability](W1%20Introduction/Conditional%20Probability.md) for details.
Check the [book notes](../../../Books/Make%20it%20Stick.md).
```

**Notion block (convert to plain text or mapped URL):**
```typescript
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "See " } },
      {
        type: "text",
        text: {
          content: "Conditional Probability",
          // If you have a mapping of md files to Notion page IDs:
          link: { url: "https://notion.so/your-page-id" },
        },
      },
      { type: "text", text: { content: " for details." } },
    ],
  },
}
```

## Footnotes

**Markdown:**
```markdown
This statement needs a citation.[^1]

Another claim here.[^2]

[^1]: Source: Think Bayes 2nd Edition
[^2]: Proverbs 16:9
```

**Notion blocks (footnotes as numbered references with content inline or at end):**
```typescript
// Main paragraph with superscript reference
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "This statement needs a citation." } },
      {
        type: "text",
        text: { content: "¹" },
        annotations: { color: "gray" },
      },
    ],
  },
}

// Footnote section at end of page
{
  type: "divider",
  divider: {},
}
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "¹ " }, annotations: { color: "gray" } },
      { type: "text", text: { content: "Source: Think Bayes 2nd Edition" } },
    ],
  },
}
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "² " }, annotations: { color: "gray" } },
      { type: "text", text: { content: "Proverbs 16:9" } },
    ],
  },
}
```

**Parser helper:**
```typescript
function parseFootnotes(content: string): {
  body: string;
  footnotes: Map<string, string>;
} {
  const footnoteDefRegex = /^\[\^(\w+)\]:\s*(.+)$/gm;
  const footnotes = new Map<string, string>();
  let match;

  while ((match = footnoteDefRegex.exec(content)) !== null) {
    footnotes.set(match[1], match[2]);
  }

  // Remove footnote definitions from body
  const body = content.replace(footnoteDefRegex, "").trim();

  return { body, footnotes };
}

function replaceFootnoteRefs(text: string, footnotes: Map<string, string>): string {
  // Convert [^1] to superscript ¹
  const superscripts = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
  return text.replace(/\[\^(\d+)\]/g, (_, num) => {
    return num.split("").map((d: string) => superscripts[parseInt(d)]).join("");
  });
}
```

## Blockquotes (Plain, Not Callouts)

**Markdown:**
```markdown
> Keep on asking, and you will receive what you ask for.
> Keep on seeking, and you will find.
```

**Notion block:**
```typescript
{
  type: "quote",
  quote: {
    rich_text: [
      {
        type: "text",
        text: {
          content: "Keep on asking, and you will receive what you ask for.\nKeep on seeking, and you will find.",
        },
      },
    ],
    color: "default",
  },
}
```

## Additional Callout Types

**Markdown:**
```markdown
> [!note]
> Conjunction is commutative, but conditional probability is not.

> [!warning] Be Careful
> This operation is irreversible.

> [!recommended]
> Start with simple architectures before scaling up.
```

**Notion blocks:**
```typescript
// Note callout
{
  type: "callout",
  callout: {
    rich_text: [
      { type: "text", text: { content: "Conjunction is commutative, but conditional probability is not." } },
    ],
    icon: { type: "emoji", emoji: "📝" },
    color: "gray_background",
  },
}

// Warning callout
{
  type: "callout",
  callout: {
    rich_text: [
      { type: "text", text: { content: "Be Careful\n" }, annotations: { bold: true } },
      { type: "text", text: { content: "This operation is irreversible." } },
    ],
    icon: { type: "emoji", emoji: "⚠️" },
    color: "orange_background",
  },
}

// Recommended callout (custom type - map to appropriate emoji)
{
  type: "callout",
  callout: {
    rich_text: [
      { type: "text", text: { content: "Start with simple architectures before scaling up." } },
    ],
    icon: { type: "emoji", emoji: "👍" },
    color: "green_background",
  },
}
```

**Callout type mapping:**
```typescript
const CALLOUT_CONFIG: Record<string, { emoji: string; color: string }> = {
  tip: { emoji: "💡", color: "yellow_background" },
  note: { emoji: "📝", color: "gray_background" },
  info: { emoji: "ℹ️", color: "blue_background" },
  warning: { emoji: "⚠️", color: "orange_background" },
  danger: { emoji: "🚫", color: "red_background" },
  example: { emoji: "📋", color: "purple_background" },
  quote: { emoji: "💬", color: "gray_background" },
  recommended: { emoji: "👍", color: "green_background" },
  abstract: { emoji: "📄", color: "blue_background" },
  success: { emoji: "✅", color: "green_background" },
  question: { emoji: "❓", color: "yellow_background" },
  failure: { emoji: "❌", color: "red_background" },
  bug: { emoji: "🐛", color: "red_background" },
};
```

## Local/Relative Image Paths

**Markdown:**
```markdown
![](Neural%20Networks-assets/Pasted%20image%2020241227175542.png)
![Architecture diagram](Activation%20Function-assets/image%203.png)
```

**Notion block (requires uploading image to external host first):**
```typescript
// After uploading to external storage (S3, Cloudflare R2, etc.)
{
  type: "image",
  image: {
    type: "external",
    external: { url: "https://your-bucket.s3.amazonaws.com/Neural-Networks-assets/image.png" },
    caption: [], // Empty if no alt text, or include alt text
  },
}

// With caption from alt text
{
  type: "image",
  image: {
    type: "external",
    external: { url: "https://your-bucket.s3.amazonaws.com/image-3.png" },
    caption: [{ type: "text", text: { content: "Architecture diagram" } }],
  },
}
```

**Helper to resolve relative paths:**
```typescript
function resolveImagePath(markdownFilePath: string, imagePath: string): string {
  // Decode URL-encoded spaces
  const decodedPath = decodeURIComponent(imagePath);
  // Resolve relative to the markdown file's directory
  const mdDir = path.dirname(markdownFilePath);
  return path.resolve(mdDir, decodedPath);
}
```

## Multi-line LaTeX (aligned, split, cases)

**Markdown:**
```markdown
$$
\begin{aligned}
Z_j &= \overrightarrow{W}_j \cdot \overrightarrow{X} + b_j \\
a_1 &= \frac{e^{Z_1}}{e^{Z_1} + e^{Z_2} + ... + e^{Z_N}}
\end{aligned}
$$
```

**Notion block:**
```typescript
{
  type: "equation",
  equation: {
    expression: "\\begin{aligned}\nZ_j &= \\overrightarrow{W}_j \\cdot \\overrightarrow{X} + b_j \\\\\na_1 &= \\frac{e^{Z_1}}{e^{Z_1} + e^{Z_2} + ... + e^{Z_N}}\n\\end{aligned}",
  },
}
```

**Markdown (cases):**
```markdown
$$
loss(a_1, ..., a_N, y) =
\begin{cases}
-log(a_1) &\text{if y = 1} \\
-log(a_2) &\text{if y = 2} \\
-log(a_N) &\text{if y = N}
\end{cases}
$$
```

**Notion block:**
```typescript
{
  type: "equation",
  equation: {
    expression: "loss(a_1, ..., a_N, y) =\n\\begin{cases}\n-log(a_1) &\\text{if y = 1} \\\\\n-log(a_2) &\\text{if y = 2} \\\\\n-log(a_N) &\\text{if y = N}\n\\end{cases}",
  },
}
```

## Numbered Lists

**Markdown:**
```markdown
1. How to choose what feature to split?
2. When do you stop splitting?
3. Compute weighted average with entropy.
```

**Notion blocks:**
```typescript
[
  {
    type: "numbered_list_item",
    numbered_list_item: {
      rich_text: [{ type: "text", text: { content: "How to choose what feature to split?" } }],
    },
  },
  {
    type: "numbered_list_item",
    numbered_list_item: {
      rich_text: [{ type: "text", text: { content: "When do you stop splitting?" } }],
    },
  },
  {
    type: "numbered_list_item",
    numbered_list_item: {
      rich_text: [{ type: "text", text: { content: "Compute weighted average with entropy." } }],
    },
  },
]
```

## Headings with Emoji

**Markdown:**
```markdown
## 🚧 3 Must Do Today
## 📓 Notes from Today
```

**Notion blocks:**
```typescript
// Emoji are preserved as-is in rich_text
{
  type: "heading_2",
  heading_2: {
    rich_text: [{ type: "text", text: { content: "🚧 3 Must Do Today" } }],
  },
}
{
  type: "heading_2",
  heading_2: {
    rich_text: [{ type: "text", text: { content: "📓 Notes from Today" } }],
  },
}
```

## YouTube Links

**Markdown:**
```markdown
[Transformers Explained Visually](https://youtu.be/wjZofJX0v4M?si=WbfUfQgHobfyWsNv)
```

**Notion blocks (two options):**
```typescript
// Option 1: As a bookmark (shows preview)
{
  type: "bookmark",
  bookmark: {
    url: "https://youtu.be/wjZofJX0v4M?si=WbfUfQgHobfyWsNv",
    caption: [{ type: "text", text: { content: "Transformers Explained Visually" } }],
  },
}

// Option 2: As an embed (embeds the video player)
{
  type: "embed",
  embed: {
    url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
  },
}

// Option 3: As a regular link in paragraph
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      {
        type: "text",
        text: {
          content: "Transformers Explained Visually",
          link: { url: "https://youtu.be/wjZofJX0v4M?si=WbfUfQgHobfyWsNv" },
        },
      },
    ],
  },
}
```

**YouTube URL normalizer:**
```typescript
function normalizeYouTubeUrl(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    /(?:https?:\/\/)?youtu\.be\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
  }

  return null;
}
