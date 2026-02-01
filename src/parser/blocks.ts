import { parseInline, replaceFootnoteRefs, resolveImagePath } from "./inline";
import type { InlineSegment } from "./inline";

export type ImageSource =
  | { type: "external"; url: string }
  | { type: "local"; path: string };

export type Block =
  | { type: "paragraph"; richText: InlineSegment[] }
  | { type: "heading_1" | "heading_2" | "heading_3"; richText: InlineSegment[] }
  | { type: "bulleted_list_item" | "numbered_list_item"; richText: InlineSegment[]; children?: Block[] }
  | { type: "to_do"; richText: InlineSegment[]; checked: boolean }
  | { type: "code"; language: string; text: string }
  | { type: "quote"; richText: InlineSegment[] }
  | { type: "callout"; richText: InlineSegment[]; emoji: string; color: string }
  | { type: "equation"; expression: string }
  | { type: "divider" }
  | { type: "image"; source: ImageSource; caption: InlineSegment[] }
  | { type: "table"; rows: InlineSegment[][][]; hasColumnHeader: boolean; hasRowHeader: boolean };

type FootnoteMap = Map<string, string>;

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

export function parseFootnotes(content: string): { body: string; footnotes: FootnoteMap } {
  const footnoteDefRegex = /^\[\^(\w+)\]:\s*(.+)$/gm;
  const footnotes = new Map<string, string>();
  let match: RegExpExecArray | null;

  while ((match = footnoteDefRegex.exec(content)) !== null) {
    footnotes.set(match[1]!, match[2]!);
  }

  const body = content.replace(footnoteDefRegex, "").trim();
  return { body, footnotes };
}

function isDivider(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "---" || trimmed === "***";
}

function isHeading(line: string): RegExpMatchArray | null {
  return line.match(/^(#{1,3})\s+(.+)$/);
}

function isCodeFence(line: string): RegExpMatchArray | null {
  return line.match(/^```(\w*)\s*$/);
}

function isBlockMathStart(line: string): boolean {
  return line.trim().startsWith("$$");
}

function isCallout(line: string): RegExpMatchArray | null {
  return line.match(/^>\s*\[!(\w+)\]\s*(.*)?$/);
}

function isBlockquote(line: string): boolean {
  return /^>\s+/.test(line);
}

function isTaskItem(line: string): RegExpMatchArray | null {
  return line.match(/^(\s*)-\s+\[([ xX])\]\s+(.+)$/);
}

function isBulletedItem(line: string): RegExpMatchArray | null {
  return line.match(/^(\s*)[-*]\s+(.+)$/);
}

function isNumberedItem(line: string): RegExpMatchArray | null {
  return line.match(/^(\s*)\d+\.\s+(.+)$/);
}

function isTableRow(line: string): boolean {
  return /\|/.test(line);
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?\s*$/.test(line);
}

function parseImageLine(
  line: string,
  markdownFilePath: string
): { source: ImageSource; caption: InlineSegment[] } | null {
  const trimmed = line.trim();
  let match = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (match) {
    const alt = match[1] ?? "";
    const url = match[2]!;
    if (/^https?:\/\//i.test(url)) {
      return { source: { type: "external", url }, caption: parseInline(alt) };
    }
    return {
      source: { type: "local", path: resolveImagePath(markdownFilePath, url) },
      caption: parseInline(alt),
    };
  }

  match = trimmed.match(/^!\[\[([^\]]+)\]\]$/);
  if (match) {
    const url = match[1]!;
    return {
      source: { type: "local", path: resolveImagePath(markdownFilePath, url) },
      caption: [],
    };
  }

  return null;
}

function collectQuoteLines(lines: string[], startIndex: number): { text: string; nextIndex: number } {
  const parts: string[] = [];
  let i = startIndex;
  while (i < lines.length && isBlockquote(lines[i]!) && !isCallout(lines[i]!)) {
    parts.push(lines[i]!.replace(/^>\s?/, ""));
    i += 1;
  }
  return { text: parts.join("\n"), nextIndex: i };
}

function parseList(
  lines: string[],
  startIndex: number
): { blocks: Block[]; nextIndex: number } {
  const blocks: Block[] = [];
  const stack: { indent: number; block: Block }[] = [];

  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i]!;
    const taskMatch = isTaskItem(line);
    const bulletMatch = !taskMatch ? isBulletedItem(line) : null;
    const numberMatch = !taskMatch && !bulletMatch ? isNumberedItem(line) : null;

    if (!taskMatch && !bulletMatch && !numberMatch) break;

    const indent = (taskMatch?.[1] ?? bulletMatch?.[1] ?? numberMatch?.[1] ?? "").length;
    const normalizedIndent = Math.floor(indent / 2);

    let block: Block;
    if (taskMatch) {
      block = {
        type: "to_do",
        richText: parseInline(taskMatch[3]!),
        checked: taskMatch[2]!.toLowerCase() === "x",
      };
    } else if (numberMatch) {
      block = {
        type: "numbered_list_item",
        richText: parseInline(numberMatch[2]!),
        children: [],
      };
    } else {
      block = {
        type: "bulleted_list_item",
        richText: parseInline(bulletMatch![2]!),
        children: [],
      };
    }

    while (stack.length > 0 && stack[stack.length - 1]!.indent >= normalizedIndent) {
      stack.pop();
    }

    if (stack.length === 0) {
      blocks.push(block);
    } else {
      const parent = stack[stack.length - 1]!.block;
      if ("children" in parent) {
        parent.children = parent.children || [];
        parent.children.push(block);
      }
    }

    stack.push({ indent: normalizedIndent, block });
    i += 1;
  }

  return { blocks, nextIndex: i };
}

function parseTable(
  lines: string[],
  startIndex: number
): { block: Block | null; nextIndex: number } {
  if (startIndex + 1 >= lines.length) {
    return { block: null, nextIndex: startIndex };
  }

  if (!isTableRow(lines[startIndex]!) || !isTableSeparator(lines[startIndex + 1]!)) {
    return { block: null, nextIndex: startIndex };
  }

  const rows: InlineSegment[][][] = [];
  let i = startIndex;
  while (i < lines.length && isTableRow(lines[i]!)) {
    if (i === startIndex + 1) {
      i += 1;
      continue;
    }
    const cells = lines[i]!
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => parseInline(cell.trim()));
    rows.push(cells);
    i += 1;
  }

  const block: Block = {
    type: "table",
    rows,
    hasColumnHeader: true,
    hasRowHeader: false,
  };

  return { block, nextIndex: i };
}

export function parseMarkdownBlocks(content: string, markdownFilePath: string): Block[] {
  const { body, footnotes } = parseFootnotes(content);
  const normalizedBody = replaceFootnoteRefs(body);
  const lines = normalizedBody.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const codeFence = isCodeFence(line);
    if (codeFence) {
      const language = codeFence[1] || "plain text";
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i]!.trim().startsWith("```")) {
        codeLines.push(lines[i]!);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", language, text: codeLines.join("\n") });
      continue;
    }

    if (isBlockMathStart(line)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
        const expression = trimmed.slice(2, -2).trim();
        blocks.push({ type: "equation", expression });
        i += 1;
        continue;
      }
      const mathLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i]!.trim().startsWith("$$")) {
        mathLines.push(lines[i]!);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "equation", expression: mathLines.join("\n") });
      continue;
    }

    const calloutMatch = isCallout(line);
    if (calloutMatch) {
      const calloutType = calloutMatch[1]!.toLowerCase();
      const title = calloutMatch[2]?.trim();
      const config = CALLOUT_CONFIG[calloutType] ?? CALLOUT_CONFIG.note!;
      const calloutLines: string[] = [];
      i += 1;
      while (i < lines.length && isBlockquote(lines[i]!)) {
        calloutLines.push(lines[i]!.replace(/^>\s?/, ""));
        i += 1;
      }
      const richText: InlineSegment[] = [];
      if (title) {
        richText.push({ type: "text", text: `${title}\n`, annotations: { bold: true } });
      }
      richText.push(...parseInline(calloutLines.join("\n")));
      blocks.push({ type: "callout", richText, emoji: config.emoji, color: config.color });
      continue;
    }

    if (isBlockquote(line)) {
      const { text, nextIndex } = collectQuoteLines(lines, i);
      blocks.push({ type: "quote", richText: parseInline(text) });
      i = nextIndex;
      continue;
    }

    const headingMatch = isHeading(line);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const headingType = `heading_${level}` as "heading_1" | "heading_2" | "heading_3";
      blocks.push({ type: headingType, richText: parseInline(headingMatch[2]!) });
      i += 1;
      continue;
    }

    if (isDivider(line)) {
      blocks.push({ type: "divider" });
      i += 1;
      continue;
    }

    const imageBlock = parseImageLine(line, markdownFilePath);
    if (imageBlock) {
      blocks.push({ type: "image", ...imageBlock });
      i += 1;
      continue;
    }

    const tableResult = parseTable(lines, i);
    if (tableResult.block) {
      blocks.push(tableResult.block);
      i = tableResult.nextIndex;
      continue;
    }

    const listResult = parseList(lines, i);
    if (listResult.blocks.length > 0) {
      blocks.push(...listResult.blocks);
      i = listResult.nextIndex;
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== "") {
      const currentLine = lines[i]!;
      if (
        isHeading(currentLine) ||
        isCodeFence(currentLine) ||
        isBlockMathStart(currentLine) ||
        isCallout(currentLine) ||
        isBlockquote(currentLine) ||
        isDivider(currentLine) ||
        parseImageLine(currentLine, markdownFilePath) ||
        (isTableRow(currentLine) && isTableSeparator(lines[i + 1] ?? "")) ||
        isTaskItem(currentLine) ||
        isBulletedItem(currentLine) ||
        isNumberedItem(currentLine)
      ) {
        break;
      }
      paragraphLines.push(currentLine);
      i += 1;
    }
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", richText: parseInline(paragraphLines.join("\n")) });
      continue;
    }

    i += 1;
  }

  if (footnotes.size > 0) {
    blocks.push({ type: "divider" });
    for (const [key, value] of footnotes.entries()) {
      const label = key.replace(/\d/g, (digit) => {
        const superscripts = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
        return superscripts[Number.parseInt(digit, 10)]!;
      });
      blocks.push({
        type: "paragraph",
        richText: parseInline(`${label} ${value}`.trim()),
      });
    }
  }

  return blocks;
}
