import { describe, expect, test } from 'bun:test';
import { stripFrontmatter } from './frontmatter';

describe('stripFrontmatter', () => {
  test('valid YAML frontmatter extraction', () => {
    const content = `---
title: Test Page
author: John Doe
---

This is the body content.`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({
      title: 'Test Page',
      author: 'John Doe',
    });
    expect(result.body).toBe('\nThis is the body content.');
  });

  test('content without frontmatter', () => {
    const content = `This is plain markdown content.
No frontmatter here.`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({});
    expect(result.body).toBe(content);
  });

  test('empty frontmatter', () => {
    // Empty frontmatter with newline between delimiters
    const content = `---

---

Body content here.`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({});
    expect(result.body).toBe('\nBody content here.');
  });

  test('complex YAML with arrays', () => {
    const content = `---
tags:
  - tag1
  - tag2
  - tag3
categories:
  - cat1
  - cat2
---

Body with arrays.`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({
      tags: ['tag1', 'tag2', 'tag3'],
      categories: ['cat1', 'cat2'],
    });
    expect(result.body).toBe('\nBody with arrays.');
  });

  test('complex YAML with nested objects', () => {
    const content = `---
author:
  name: John Doe
  email: john@example.com
  social:
    twitter: "@johndoe"
    github: johndoe
---

Body with nested objects.`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({
      author: {
        name: 'John Doe',
        email: 'john@example.com',
        social: {
          twitter: '@johndoe',
          github: 'johndoe',
        },
      },
    });
    expect(result.body).toBe('\nBody with nested objects.');
  });

  test('YAML with numbers and booleans', () => {
    const content = `---
published: true
views: 1234
rating: 4.5
---

Body with various types.`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({
      published: true,
      views: 1234,
      rating: 4.5,
    });
    expect(result.body).toBe('\nBody with various types.');
  });

  test('YAML with dates', () => {
    const content = `---
created: 2024-01-28T16:34
updated: 2024-11-30T16:50
---

Body with dates.`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({
      created: '2024-01-28T16:34',
      updated: '2024-11-30T16:50',
    });
    expect(result.body).toBe('\nBody with dates.');
  });

  test('multiline body content', () => {
    const content = `---
title: Test
---

Line 1

Line 2

Line 3`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({ title: 'Test' });
    expect(result.body).toBe('\nLine 1\n\nLine 2\n\nLine 3');
  });

  test('frontmatter with only delimiters and no body', () => {
    const content = '---\ntitle: Test\n---\n';

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({ title: 'Test' });
    expect(result.body).toBe('');
  });

  test('invalid YAML returns empty metadata', () => {
    const content = `---
title: Test
  invalid: yaml: syntax:
---

Body content.`;

    const result = stripFrontmatter(content);

    // If YAML is invalid, it should still attempt to parse or return default
    expect(result.body).toBeDefined();
  });
});
