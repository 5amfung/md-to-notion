# Implementation Plan: md-to-notion

## Overview

Build a CLI tool that imports Markdown files (including Obsidian-flavored markdown) to Notion while preserving all formatting, links, equations, and embedded images. The directory structure will be mirrored in Notion.

---

## Phase 1: Project Setup

### 1.1 Initialize Node.js Project
- Initialize npm project with `package.json`
- Configure TypeScript for type safety
- Set up ESLint and Prettier for code quality
- Configure build scripts

### 1.2 Dependencies
```json
{
  "@notionhq/client": "^2.2.14",  // Official Notion SDK
  "commander": "^11.x",           // CLI argument parsing
  "marked": "^11.x",              // Markdown parsing
  "gray-matter": "^4.x",          // YAML frontmatter parsing
  "glob": "^10.x",                // File pattern matching
  "mime-types": "^2.x",           // Image MIME type detection
  "dotenv": "^16.x"               // Environment variable management
}
```

### 1.3 Project Structure
```
md-to-notion/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── cli.ts                # CLI argument handling
│   ├── config.ts             # Configuration management
│   ├── notion/
│   │   ├── client.ts         # Notion API client wrapper
│   │   ├── blocks.ts         # Block creation utilities
│   │   └── pages.ts          # Page creation utilities
│   ├── markdown/
│   │   ├── parser.ts         # Markdown parsing logic
│   │   ├── converter.ts      # MD to Notion block converter
│   │   └── handlers/
│   │       ├── text.ts       # Text & formatting handler
│   │       ├── headings.ts   # Heading handler
│   │       ├── lists.ts      # List handler (ordered/unordered/todo)
│   │       ├── code.ts       # Code block handler
│   │       ├── equations.ts  # Math equation handler
│   │       ├── images.ts     # Image handler
│   │       ├── links.ts      # Link handler (internal/external)
│   │       ├── tables.ts     # Table handler
│   │       └── quotes.ts     # Blockquote handler
│   ├── files/
│   │   ├── scanner.ts        # Directory/file scanning
│   │   ├── reader.ts         # File reading utilities
│   │   └── structure.ts      # Directory structure management
│   └── utils/
│       ├── logger.ts         # Logging utilities
│       └── errors.ts         # Error handling
├── tests/
│   ├── fixtures/             # Test markdown files
│   └── *.test.ts             # Test files
├── .env.example              # Environment variable template
├── tsconfig.json
├── package.json
└── README.md
```

---

## Phase 2: Core Markdown Parsing

### 2.1 Markdown Parser Implementation
- Use `marked` library with custom extensions
- Parse standard Markdown elements:
  - Headings (H1-H6)
  - Paragraphs
  - Bold, italic, strikethrough, inline code
  - Links and images
  - Ordered and unordered lists
  - Task lists (checkboxes)
  - Code blocks with language
  - Blockquotes
  - Horizontal rules
  - Tables

### 2.2 Obsidian-Specific Extensions
- **Wikilinks**: `[[Page Name]]` or `[[Page Name|Display Text]]`
- **Embedded content**: `![[filename]]` for images and other files
- **Tags**: `#tag` format
- **Inline equations**: `$E = mc^2$`
- **Block equations**: `$$\int_0^\infty e^{-x^2} dx$$`
- **Callouts/Admonitions**: `> [!note]` syntax
- **Frontmatter**: YAML metadata at the top

### 2.3 AST Generation
- Convert Markdown to Abstract Syntax Tree (AST)
- Normalize AST for consistent processing
- Handle nested structures (lists within lists, etc.)

---

## Phase 3: Notion Block Converter

### 3.1 Block Type Mapping

| Markdown Element | Notion Block Type |
|-----------------|-------------------|
| Heading 1 | `heading_1` |
| Heading 2 | `heading_2` |
| Heading 3 | `heading_3` |
| Heading 4-6 | `heading_3` (Notion only supports 3 levels) |
| Paragraph | `paragraph` |
| Unordered list | `bulleted_list_item` |
| Ordered list | `numbered_list_item` |
| Task list | `to_do` |
| Code block | `code` |
| Blockquote | `quote` |
| Image | `image` |
| Horizontal rule | `divider` |
| Table | `table` |
| Equation block | `equation` |

### 3.2 Rich Text Formatting

Notion uses rich text arrays for inline formatting:
- **Bold**: `{ annotations: { bold: true } }`
- **Italic**: `{ annotations: { italic: true } }`
- **Strikethrough**: `{ annotations: { strikethrough: true } }`
- **Code**: `{ annotations: { code: true } }`
- **Links**: `{ href: "url" }`
- **Inline equations**: `{ type: "equation", equation: { expression: "..." } }`

### 3.3 Nested Block Handling
- Notion blocks can have children (max 2 levels of nesting for some blocks)
- Implement recursive block creation
- Handle Notion's block nesting limitations gracefully

---

## Phase 4: Special Content Handlers

### 4.1 Equation Handler
- **Inline equations**: Convert `$...$` to inline equation rich text
- **Block equations**: Convert `$$...$$` to equation blocks
- Preserve LaTeX syntax exactly
- Handle multi-line equations

### 4.2 Image Handler
- **Local images**: 
  - Read image file
  - Upload to a hosting service or use Notion's external file URL
  - Note: Notion API doesn't support direct file uploads for images, so we need to:
    - Option A: Require images to be hosted externally
    - Option B: Upload to a service like Imgur (requires API key)
    - Option C: Use base64 data URLs (limited support)
  - Recommended: Support external URLs and warn about local images
- **External images**: Use URL directly in Notion image block
- **Obsidian embedded images**: `![[image.png]]` conversion

### 4.3 Link Handler
- **External links**: Convert to Notion link rich text
- **Internal/Wiki links**: 
  - Track all created pages and their IDs
  - Create a mapping of file paths to Notion page IDs
  - After all pages are created, update internal links
  - Handle `[[Page]]` and `[[Page|Display]]` syntax

### 4.4 Table Handler
- Convert Markdown tables to Notion table blocks
- Handle column alignment
- Support basic cell formatting

---

## Phase 5: Directory Structure Mirroring

### 5.1 File Scanner
- Recursively scan input directory
- Filter for `.md` files
- Build a tree structure representing the directory hierarchy
- Handle symbolic links gracefully

### 5.2 Structure Preservation
- Create Notion pages in a hierarchy matching the directory structure
- Directories become parent pages with child pages for files
- Files become pages with their content

### 5.3 Import Strategy
```
docs/
├── getting-started/
│   ├── installation.md
│   └── configuration.md
└── api/
    └── reference.md
```
Becomes in Notion:
```
[Parent Page]
└── docs (page, empty or with index.md content)
    ├── getting-started (page)
    │   ├── installation (page with content)
    │   └── configuration (page with content)
    └── api (page)
        └── reference (page with content)
```

### 5.4 Page Naming
- Use filename without `.md` extension as page title
- If frontmatter has `title` field, use that instead
- Handle special characters in filenames

---

## Phase 6: CLI Implementation

### 6.1 Command Interface
```bash
md-to-notion <path> <page_id> [options]

Arguments:
  path      Path to markdown file or directory
  page_id   Destination Notion page ID

Options:
  -r, --recursive     Import directories recursively (default: true)
  -d, --dry-run       Preview what would be imported without making changes
  -v, --verbose       Show detailed progress
  --skip-images       Skip image imports
  --image-prefix      Base URL prefix for local images
  --help              Show help
  --version           Show version
```

### 6.2 Environment Configuration
```bash
# .env
NOTION_API_KEY=secret_xxx
```

### 6.3 Progress Reporting
- Show progress bar for multiple files
- Display success/failure count
- List any skipped or failed items with reasons

---

## Phase 7: Error Handling & Edge Cases

### 7.1 API Rate Limiting
- Implement exponential backoff for Notion API calls
- Batch operations where possible
- Queue system for large imports

### 7.2 Content Limitations
- Notion blocks have a 2000 character limit for text
- Split long paragraphs across multiple blocks
- Handle deeply nested content

### 7.3 Error Recovery
- Log failed imports with file paths
- Option to resume failed imports
- Detailed error messages with suggested fixes

### 7.4 Validation
- Validate Notion API key before starting
- Validate target page exists and is accessible
- Validate input path exists

---

## Phase 8: Testing

### 8.1 Unit Tests
- Parser tests for each Markdown element
- Converter tests for each Notion block type
- Handler tests for special content (equations, images, links)

### 8.2 Integration Tests
- End-to-end import tests with mock Notion API
- Directory structure tests
- Link resolution tests

### 8.3 Test Fixtures
Create sample Markdown files covering:
- All standard Markdown syntax
- Obsidian-specific syntax
- Edge cases (empty files, special characters, etc.)

---

## Implementation Order

### Sprint 1: Foundation
1. Project setup and configuration
2. Basic CLI structure
3. Notion client wrapper
4. File scanner

### Sprint 2: Core Parsing
5. Markdown parser with standard elements
6. Basic Notion block converter
7. Simple text formatting

### Sprint 3: Advanced Features
8. Equation handlers (inline and block)
9. Image handler
10. Internal link tracking and resolution

### Sprint 4: Structure & Polish
11. Directory structure mirroring
12. Table support
13. Error handling and edge cases
14. Progress reporting

### Sprint 5: Testing & Documentation
15. Comprehensive test suite
16. Documentation and examples
17. Final polish and optimization

---

## API Usage Examples

### Creating a Page
```typescript
const response = await notion.pages.create({
  parent: { page_id: parentPageId },
  properties: {
    title: [{ text: { content: "Page Title" } }]
  },
  children: blocks
});
```

### Creating Blocks
```typescript
// Paragraph with formatting
{
  type: "paragraph",
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "Normal " } },
      { type: "text", text: { content: "bold" }, annotations: { bold: true } }
    ]
  }
}

// Equation block
{
  type: "equation",
  equation: { expression: "E = mc^2" }
}

// Image block
{
  type: "image",
  image: {
    type: "external",
    external: { url: "https://example.com/image.png" }
  }
}
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Notion API rate limits | High | Implement queuing and backoff |
| Local image handling | Medium | Document limitations, provide alternatives |
| Complex nested Markdown | Medium | Flatten when necessary, warn user |
| Large file imports | Medium | Implement chunking and progress tracking |
| Internal link resolution | High | Two-pass approach: create pages, then update links |

---

## Success Criteria

1. ✅ All standard Markdown elements render correctly in Notion
2. ✅ Inline and block equations are preserved
3. ✅ Internal links are resolved and functional
4. ✅ Directory structure is accurately mirrored
5. ✅ External images are displayed correctly
6. ✅ CLI provides clear feedback and error messages
7. ✅ Handles large directory imports efficiently
