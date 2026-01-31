import { stripFrontmatter } from "./frontmatter";
import { parseMarkdownBlocks } from "./blocks";
import type { Block } from "./blocks";

export function parseMarkdown(content: string, markdownFilePath: string): Block[] {
  const { body } = stripFrontmatter(content);
  return parseMarkdownBlocks(body, markdownFilePath);
}

export type { Block } from "./blocks";
