import { describe, expect, test } from 'bun:test';
import { type Block, parseMarkdown } from './index';

describe('parseMarkdown', () => {
  test('parses content via index', () => {
    const content = `# Hello
Paragraph here.`;
    const blocks = parseMarkdown(content, '/doc.md');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.type).toBe('heading_1');
    expect(blocks[1]?.type).toBe('paragraph');
  });

  test('strips frontmatter then parses blocks', () => {
    const content = `---
title: Doc
---
## Section
Text.`;
    const blocks = parseMarkdown(content, '/doc.md');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.type).toBe('heading_2');
    expect(blocks[1]?.type).toBe('paragraph');
  });
});

describe('Block type', () => {
  test('is re-exported', () => {
    const blocks: Block[] = [{ type: 'paragraph', richText: [] }];
    expect(blocks[0]?.type).toBe('paragraph');
  });
});
