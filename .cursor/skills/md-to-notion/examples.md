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
