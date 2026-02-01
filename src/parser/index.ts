import type { Block } from './blocks';
import { parseMarkdownBlocks } from './blocks';
import { stripFrontmatter } from './frontmatter';

export function parseMarkdown(
  content: string,
  markdownFilePath: string
): Block[] {
  const { body } = stripFrontmatter(content);
  return parseMarkdownBlocks(body, markdownFilePath);
}

export type { Block } from './blocks';
