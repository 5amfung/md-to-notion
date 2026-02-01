import { test, expect, describe } from "bun:test";
import { parseMarkdownBlocks, parseFootnotes } from "./blocks";

describe("parseMarkdownBlocks", () => {
  test("paragraph", () => {
  const content = "This is a simple paragraph.";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("paragraph");
  expect(result[0]).toHaveProperty("richText");
  });

  test("multi-line paragraph", () => {
  const content = `This is line one.

This is line two.`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(2);
  expect(result[0]?.type).toBe("paragraph");
  expect(result[1]?.type).toBe("paragraph");
  });

  test("heading 1", () => {
  const content = "# Heading 1";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("heading_1");
  });

  test("heading 2", () => {
  const content = "## Heading 2";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("heading_2");
  });

  test("heading 3", () => {
  const content = "### Heading 3";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("heading_3");
  });

  test("divider with ---", () => {
  const content = "---";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("divider");
  });

  test("divider with ***", () => {
  const content = "***";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("divider");
  });

  test("code block with language", () => {
  const content = "```typescript\nconst x = 1;\n```";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("code");
  if (result[0]?.type === "code") {
    expect(result[0].language).toBe("typescript");
    expect(result[0].text).toBe("const x = 1;");
  }
  });

  test("code block without language", () => {
  const content = "```\nconst x = 1;\n```";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("code");
  if (result[0]?.type === "code") {
    expect(result[0].language).toBe("plain text");
  }
  });

  test("block math single line", () => {
  const content = "$$E = mc^2$$";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("equation");
  if (result[0]?.type === "equation") {
    expect(result[0].expression).toBe("E = mc^2");
  }
  });

  test("block math multi-line", () => {
  const content = "$$\nE = mc^2\n$$";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("equation");
  if (result[0]?.type === "equation") {
    expect(result[0].expression).toBe("E = mc^2");
  }
  });

  test("blockquote", () => {
  const content = "> This is a quote.";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("quote");
  });

  test("multi-line blockquote", () => {
  const content = `> Line one
> Line two`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("quote");
  });

  test("callout tip", () => {
  const content = `> [!tip]
> This is a tip.`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("callout");
  if (result[0]?.type === "callout") {
    expect(result[0].emoji).toBe("💡");
    expect(result[0].color).toBe("yellow_background");
  }
  });

  test("callout warning", () => {
  const content = `> [!warning]
> This is a warning.`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("callout");
  if (result[0]?.type === "callout") {
    expect(result[0].emoji).toBe("⚠️");
    expect(result[0].color).toBe("orange_background");
  }
  });

  test("callout with title", () => {
  const content = `> [!note] Important Note
> This is the content.`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("callout");
  });

  test("bulleted list", () => {
  const content = `- Item 1
- Item 2
- Item 3`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(3);
  expect(result[0]?.type).toBe("bulleted_list_item");
  expect(result[1]?.type).toBe("bulleted_list_item");
  expect(result[2]?.type).toBe("bulleted_list_item");
  });

  test("nested bulleted list", () => {
  const content = `- Item 1
  - Nested 1
  - Nested 2
- Item 2`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(2);
  expect(result[0]?.type).toBe("bulleted_list_item");
  if (result[0]?.type === "bulleted_list_item") {
    expect(result[0].children).toBeDefined();
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children![0]?.type).toBe("bulleted_list_item");
    expect(result[0].children![1]?.type).toBe("bulleted_list_item");
  }
  expect(result[1]?.type).toBe("bulleted_list_item");
  });

  test("numbered list", () => {
  const content = `1. First
2. Second
3. Third`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(3);
  expect(result[0]?.type).toBe("numbered_list_item");
  expect(result[1]?.type).toBe("numbered_list_item");
  expect(result[2]?.type).toBe("numbered_list_item");
  });

  test("nested numbered list", () => {
  const content = `1. Item 1
   1. Nested 1
   2. Nested 2
2. Item 2`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(2);
  expect(result[0]?.type).toBe("numbered_list_item");
  if (result[0]?.type === "numbered_list_item") {
    expect(result[0].children).toBeDefined();
    expect(result[0].children).toHaveLength(2);
  }
  expect(result[1]?.type).toBe("numbered_list_item");
  });

  test("task list unchecked", () => {
  const content = `- [ ] Task 1
- [ ] Task 2`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(2);
  expect(result[0]?.type).toBe("to_do");
  if (result[0]?.type === "to_do") {
    expect(result[0].checked).toBe(false);
  }
  });

  test("task list checked", () => {
  const content = `- [x] Task 1
- [X] Task 2`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(2);
  expect(result[0]?.type).toBe("to_do");
  if (result[0]?.type === "to_do") {
    expect(result[0].checked).toBe(true);
  }
  if (result[1]?.type === "to_do") {
    expect(result[1].checked).toBe(true);
  }
  });

  test("table", () => {
  const content = `| Header 1 | Header 2 |
|----------|---------|
| Cell 1   | Cell 2  |`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("table");
  if (result[0]?.type === "table") {
    expect(result[0].hasColumnHeader).toBe(true);
    // rows includes header row + data rows
    expect(result[0].rows).toHaveLength(2);
  }
  });

  test("table with multiple rows", () => {
  const content = `| Header 1 | Header 2 |
|----------|---------|
| Cell 1   | Cell 2  |
| Cell 3   | Cell 4  |`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("table");
  if (result[0]?.type === "table") {
    // rows includes header row + 2 data rows
    expect(result[0].rows).toHaveLength(3);
  }
  });

  test("image with alt text", () => {
  const content = "![Alt text](image.png)";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("image");
  if (result[0]?.type === "image") {
    expect(result[0].source.type).toBe("local");
  }
  });

  test("image with external URL", () => {
  const content = "![Alt text](https://example.com/image.png)";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("image");
  if (result[0]?.type === "image") {
    expect(result[0].source.type).toBe("external");
    if (result[0].source.type === "external") {
      expect(result[0].source.url).toBe("https://example.com/image.png");
    }
  }
  });

  test("Obsidian image syntax", () => {
  const content = "![[image.png]]";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(1);
  expect(result[0]?.type).toBe("image");
  if (result[0]?.type === "image") {
    expect(result[0].source.type).toBe("local");
  }
  });

  test("footnotes", () => {
  const content = `This is a reference¹.

[^1]: This is the footnote definition.`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result.length).toBeGreaterThan(1);
  // Should have divider and footnote paragraph
  const hasDivider = result.some((b) => b.type === "divider");
  expect(hasDivider).toBe(true);
  });
});

describe("parseFootnotes", () => {
  test("extract footnote definitions", () => {
  const content = `Some text[^1] and more[^2].

[^1]: First footnote
[^2]: Second footnote`;
  const result = parseFootnotes(content);
  expect(result.footnotes.size).toBe(2);
  expect(result.footnotes.get("1")).toBe("First footnote");
  expect(result.footnotes.get("2")).toBe("Second footnote");
  });

  test("return body without footnotes", () => {
  const content = `Some text[^1].

[^1]: First footnote`;
  const result = parseFootnotes(content);
  expect(result.body).not.toContain("[^1]:");
  expect(result.body).toContain("Some text");
  });

  test("no footnotes", () => {
  const content = "Just regular text.";
  const result = parseFootnotes(content);
  expect(result.footnotes.size).toBe(0);
  expect(result.body).toBe("Just regular text.");
  });
});

describe("parseMarkdownBlocks", () => {
  test("complex document", () => {
  const content = `# Title

This is a paragraph.

## Section

- Item 1
- Item 2

\`\`\`javascript
console.log("test");
\`\`\`

> This is a quote.`;
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result.length).toBeGreaterThan(4);
  expect(result[0]?.type).toBe("heading_1");
  expect(result[1]?.type).toBe("paragraph");
  expect(result[2]?.type).toBe("heading_2");
  });

  test("empty content", () => {
  const content = "";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(0);
  });

  test("only whitespace", () => {
  const content = "   \n\n  \n";
  const result = parseMarkdownBlocks(content, "/test.md");
  expect(result).toHaveLength(0);
  });
});
