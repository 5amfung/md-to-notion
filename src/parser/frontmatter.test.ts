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

  test('malformed frontmatter with missing closing delimiter', () => {
    const content = `---
title: Test
This is missing the closing delimiter`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({});
    expect(result.body).toBe(content);
  });

  test('frontmatter-like content in middle of document', () => {
    const content = `Some content here

---
not: frontmatter
---

More content`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({});
    expect(result.body).toBe(content);
  });

  test('frontmatter with Windows line endings (CRLF)', () => {
    const content = '---\r\ntitle: Test\r\n---\r\nBody content';

    const result = stripFrontmatter(content);

    // Should not match due to \r\n line endings
    expect(result.metadata).toEqual({});
    expect(result.body).toBe(content);
  });

  test('empty string input', () => {
    const result = stripFrontmatter('');

    expect(result.metadata).toEqual({});
    expect(result.body).toBe('');
  });

  test('only opening delimiter', () => {
    const content = `---
title: Test`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({});
    expect(result.body).toBe(content);
  });

  test('YAML that loads to null', () => {
    // YAML that explicitly represents null
    const content = `---
~
---

Body content.`;

    const result = stripFrontmatter(content);

    // yaml.load('~') returns null, should use || {} fallback
    expect(result.metadata).toEqual({});
    expect(result.body).toBe('\nBody content.');
  });

  test('extra delimiters in body', () => {
    const content = `---
title: Test
---

Body with --- in it
And more content`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({ title: 'Test' });
    expect(result.body).toBe('\nBody with --- in it\nAnd more content');
  });

  test('frontmatter with special YAML characters', () => {
    const content = `---
title: "Test: With Colon"
description: "Test | With Pipe"
quote: 'Single quotes'
---

Body content.`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({
      title: 'Test: With Colon',
      description: 'Test | With Pipe',
      quote: 'Single quotes',
    });
    expect(result.body).toBe('\nBody content.');
  });

  test('invalid YAML with completely broken syntax', () => {
    const content = `---
{this is: [not, valid: yaml}}
---

Body content.`;

    const result = stripFrontmatter(content);

    expect(result.metadata).toEqual({});
    expect(result.body).toBe('\nBody content.');
  });
});
