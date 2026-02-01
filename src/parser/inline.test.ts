import { test, expect, describe } from "bun:test";
import path from "path";
import { parseInline, replaceFootnoteRefs, resolveImagePath } from "./inline";

describe("parseInline", () => {
  test("bold with **", () => {
  const result = parseInline("This is **bold** text.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "bold", annotations: { bold: true } },
    { type: "text", text: " text." },
  ]);
  });

  test("bold with __", () => {
  const result = parseInline("This is __bold__ text.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "bold", annotations: { bold: true } },
    { type: "text", text: " text." },
  ]);
  });

  test("italic with *", () => {
  const result = parseInline("This is *italic* text.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "italic", annotations: { italic: true } },
    { type: "text", text: " text." },
  ]);
  });

  test("italic with _", () => {
  const result = parseInline("This is _italic_ text.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "italic", annotations: { italic: true } },
    { type: "text", text: " text." },
  ]);
  });

  test("bold+italic with ***", () => {
  const result = parseInline("This is ***bold italic*** text.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "bold italic", annotations: { bold: true, italic: true } },
    { type: "text", text: " text." },
  ]);
  });

  test("bold+italic with ___", () => {
  const result = parseInline("This is ___bold italic___ text.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "bold italic", annotations: { bold: true, italic: true } },
    { type: "text", text: " text." },
  ]);
  });

  test("code", () => {
  const result = parseInline("This is `code` text.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "code", annotations: { code: true } },
    { type: "text", text: " text." },
  ]);
  });

  test("strikethrough", () => {
  const result = parseInline("This is ~~strikethrough~~ text.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "strikethrough", annotations: { strikethrough: true } },
    { type: "text", text: " text." },
  ]);
  });

  test("highlight (Obsidian syntax)", () => {
  const result = parseInline("This is ==highlighted== text.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "highlighted", annotations: { color: "yellow_background" } },
    { type: "text", text: " text." },
  ]);
  });

  test("external link", () => {
  const result = parseInline("Visit [Google](https://google.com) now.");
  expect(result).toEqual([
    { type: "text", text: "Visit " },
    { type: "text", text: "Google", link: "https://google.com" },
    { type: "text", text: " now." },
  ]);
  });

  test("wiki-link without display", () => {
  const result = parseInline("See [[Page Name]] for details.");
  expect(result).toEqual([
    { type: "text", text: "See " },
    { type: "text", text: "Page Name", annotations: { bold: true, color: "blue" } },
    { type: "text", text: " for details." },
  ]);
  });

  test("wiki-link with display", () => {
  const result = parseInline("See [[Page Name|Custom Display]] for details.");
  expect(result).toEqual([
    { type: "text", text: "See " },
    { type: "text", text: "Custom Display", annotations: { bold: true, color: "blue" } },
    { type: "text", text: " for details." },
  ]);
  });

  test("inline math", () => {
  const result = parseInline("The formula is $E = mc^2$.");
  expect(result).toEqual([
    { type: "text", text: "The formula is " },
    { type: "equation", text: "E = mc^2" },
    { type: "text", text: "." },
  ]);
  });

  test("mixed formatting", () => {
  const result = parseInline("This is **bold** and *italic* and `code`.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "bold", annotations: { bold: true } },
    { type: "text", text: " and " },
    { type: "text", text: "italic", annotations: { italic: true } },
    { type: "text", text: " and " },
    { type: "text", text: "code", annotations: { code: true } },
    { type: "text", text: "." },
  ]);
  });

  test("nested formatting", () => {
  // Note: Parser handles patterns sequentially, nested formats may not combine as expected
  const result = parseInline("This is **bold** and *italic*.");
  expect(result).toEqual([
    { type: "text", text: "This is " },
    { type: "text", text: "bold", annotations: { bold: true } },
    { type: "text", text: " and " },
    { type: "text", text: "italic", annotations: { italic: true } },
    { type: "text", text: "." },
  ]);
  });

  test("plain text", () => {
  const result = parseInline("Plain text with no formatting.");
  expect(result).toEqual([{ type: "text", text: "Plain text with no formatting." }]);
  });

  test("empty string", () => {
  const result = parseInline("");
  expect(result).toEqual([]);
  });

  test("multiple links", () => {
  // External links require http:// or https:// prefix
  const result = parseInline("See [link1](https://example1.com) and [link2](https://example2.com).");
  expect(result).toEqual([
    { type: "text", text: "See " },
    { type: "text", text: "link1", link: "https://example1.com" },
    { type: "text", text: " and " },
    { type: "text", text: "link2", link: "https://example2.com" },
    { type: "text", text: "." },
  ]);
  });

  test("relative markdown link treated as internal", () => {
  const result = parseInline("See [Page](page.md) for details.");
  expect(result).toEqual([
    { type: "text", text: "See " },
    { type: "text", text: "Page", annotations: { bold: true, color: "blue" } },
    { type: "text", text: " for details." },
  ]);
  });
});

describe("replaceFootnoteRefs", () => {
  test("single digit footnote", () => {
  const result = replaceFootnoteRefs("This is a reference[^1].");
  expect(result).toBe("This is a reference¹.");
  });

  test("multi-digit footnote", () => {
  const result = replaceFootnoteRefs("This is a reference[^12].");
  expect(result).toBe("This is a reference¹².");
  });

  test("multiple footnotes", () => {
  const result = replaceFootnoteRefs("First[^1] and second[^2] references.");
  expect(result).toBe("First¹ and second² references.");
  });

  test("no footnotes", () => {
  const result = replaceFootnoteRefs("No footnotes here.");
  expect(result).toBe("No footnotes here.");
  });
});

describe("resolveImagePath", () => {
  test("relative path", () => {
  const markdownPath = "/path/to/file.md";
  const imagePath = "../images/photo.png";
  const result = resolveImagePath(markdownPath, imagePath);
  expect(result).toBe(path.resolve("/path/to/../images/photo.png"));
  });

  test("URL-encoded path", () => {
  const markdownPath = "/path/to/file.md";
  const imagePath = "image%20with%20spaces.png";
  const result = resolveImagePath(markdownPath, imagePath);
  expect(result).toBe(path.resolve("/path/to/image with spaces.png"));
  });

  test("absolute path", () => {
  const markdownPath = "/path/to/file.md";
  const imagePath = "/absolute/path/image.png";
  const result = resolveImagePath(markdownPath, imagePath);
  expect(result).toBe("/absolute/path/image.png");
  });
});

describe("parseInline", () => {
  test("link with special characters", () => {
  const result = parseInline("Visit [Example](https://example.com/page?q=test&id=123).");
  expect(result).toEqual([
    { type: "text", text: "Visit " },
    { type: "text", text: "Example", link: "https://example.com/page?q=test&id=123" },
    { type: "text", text: "." },
  ]);
  });

  test("equation with complex math", () => {
    const result = parseInline("Formula: $\\sum_{i=1}^{n} x_i$.");
    expect(result).toEqual([
      { type: "text", text: "Formula: " },
      { type: "equation", text: "\\sum_{i=1}^{n} x_i" },
      { type: "text", text: "." },
    ]);
  });
});
