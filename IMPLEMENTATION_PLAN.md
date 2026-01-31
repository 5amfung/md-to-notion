# Implementation Plan: md-to-notion

## Overview

Build a CLI tool that imports Markdown files (especially from Obsidian) to Notion while preserving all formatting, links, embedded images, and equations.

---

## Architecture

```
md-to-notion/
├── src/
│   ├── cli.py              # CLI entry point
│   ├── notion_client.py    # Notion API wrapper
│   ├── markdown_parser.py  # MD parsing & conversion
│   ├── image_handler.py    # Image upload handling
│   ├── file_scanner.py     # Directory scanning
│   └── models.py           # Data models
├── tests/
│   ├── test_parser.py
│   ├── test_notion_client.py
│   └── fixtures/           # Test md files
├── pyproject.toml
├── requirements.txt
└── README.md
```

---

## Phase 1: Core Infrastructure

### 1.1 Project Setup
- Initialize Python project with `pyproject.toml`
- Set up dependencies:
  - `notion-client` - Official Notion SDK for Python
  - `markdown-it-py` - Markdown parser with plugin support
  - `click` - CLI framework
  - `Pillow` - Image processing (if needed)
  - `python-dotenv` - Environment variable management
  - `requests` - HTTP requests for image handling
- Configure entry point for `md-to-notion` command

### 1.2 CLI Interface
```python
# Usage examples:
$ md-to-notion ./doc 12345
$ md-to-notion ./doc/foo.md 12345
$ md-to-notion --api-key $NOTION_KEY ./doc 12345
```

Arguments:
- `source` (required): Path to markdown file or directory
- `page_id` (required): Destination Notion page ID

Options:
- `--api-key`: Notion API key (or use `NOTION_API_KEY` env var)
- `--dry-run`: Preview without making changes
- `--verbose`: Detailed logging

---

## Phase 2: Markdown Parsing

### 2.1 Basic Markdown Elements
Convert standard markdown to Notion blocks:

| Markdown | Notion Block Type |
|----------|-------------------|
| `# H1` | `heading_1` |
| `## H2` | `heading_2` |
| `### H3` | `heading_3` |
| `paragraph` | `paragraph` |
| `- item` | `bulleted_list_item` |
| `1. item` | `numbered_list_item` |
| `> quote` | `quote` |
| `` `code` `` | inline `code` annotation |
| ```` ```code```` ``` | `code` block |
| `---` | `divider` |
| `- [ ] task` | `to_do` |

### 2.2 Rich Text Annotations
Handle inline formatting within text:
- **Bold** → `bold: true`
- *Italic* → `italic: true`
- ~~Strikethrough~~ → `strikethrough: true`
- `inline code` → `code: true`
- [Links](url) → `link: { url: "..." }`

### 2.3 Equations (LaTeX)
Critical for Obsidian compatibility:
- Inline: `$E=mc^2$` → `equation` rich text with `expression`
- Block: `$$\int_0^\infty...$$` → `equation` block

Implementation:
```python
# Detect equation patterns
INLINE_EQUATION = r'\$([^\$]+)\$'
BLOCK_EQUATION = r'\$\$([^\$]+)\$\$'
```

### 2.4 Internal Links (Obsidian-style)
Handle various link formats:
- `[[Page Name]]` → Link to created Notion page (if exists) or text
- `[[Page Name|Display Text]]` → Link with custom display
- `[[Page Name#Section]]` → Link with anchor (may need special handling)

Strategy:
1. First pass: Collect all internal links
2. Create all pages
3. Second pass: Update links to point to created Notion page IDs

### 2.5 Embedded Images
Handle image references:
- Standard: `![alt](path/to/image.png)`
- Obsidian: `![[image.png]]`

Strategy:
1. Detect image references
2. Resolve relative paths
3. Upload to a hosting service or use external URL
4. Create `image` block in Notion

---

## Phase 3: Notion API Integration

### 3.1 Notion Client Wrapper
```python
class NotionClient:
    def create_page(self, parent_id, title, children) -> str
    def append_blocks(self, page_id, blocks) -> None
    def upload_file(self, file_path) -> str  # Returns URL
```

### 3.2 Block Creation
Map parsed markdown to Notion block format:
```python
{
    "object": "block",
    "type": "paragraph",
    "paragraph": {
        "rich_text": [
            {
                "type": "text",
                "text": {"content": "Hello"},
                "annotations": {"bold": True}
            }
        ]
    }
}
```

### 3.3 Rate Limiting & Batching
- Notion API has rate limits (3 requests/second for free tier)
- Batch block creation (max 100 blocks per request)
- Implement exponential backoff for retries

---

## Phase 4: Directory Structure Mirroring

### 4.1 File Scanner
```python
def scan_directory(path: Path) -> FileTree:
    """
    Recursively scan directory for .md files
    Returns tree structure preserving hierarchy
    """
```

### 4.2 Notion Page Hierarchy
Mirror directory structure in Notion:
```
./doc/
  ├── intro.md        → Page under parent
  ├── guide/
  │   ├── start.md    → Page under "guide" page
  │   └── advanced.md → Page under "guide" page
  └── api/
      └── ref.md      → Page under "api" page
```

Implementation:
1. Create folder as Notion page (use folder name as title)
2. Create child pages under folder pages
3. Track created page IDs for internal link resolution

---

## Phase 5: Image Handling

### 5.1 Image Detection & Resolution
```python
def resolve_image_path(md_file: Path, image_ref: str) -> Path:
    """Resolve relative/absolute image paths"""
```

### 5.2 Image Upload Strategy
Options:
1. **External URL**: If image is already hosted online, use directly
2. **File Upload**: Notion API doesn't support direct file upload for images
   - Option A: Require user to provide image hosting (S3, Imgur, etc.)
   - Option B: Use a temporary hosting service
   - Option C: Base64 encode small images (limited support)

Recommended approach:
- Support external URLs directly
- For local files, provide option to:
  - Skip with warning
  - Upload to configured hosting service
  - Use a public image hosting API (e.g., Imgur)

---

## Phase 6: Testing

### 6.1 Unit Tests
- Markdown parser tests with various formats
- Equation parsing tests
- Link resolution tests
- Block conversion tests

### 6.2 Integration Tests
- Mock Notion API responses
- End-to-end import tests

### 6.3 Test Fixtures
Create sample markdown files:
- `basic.md` - Standard formatting
- `equations.md` - Inline and block equations
- `links.md` - Internal links
- `images.md` - Embedded images
- `complex.md` - All features combined

---

## Implementation Order

### Milestone 1: Basic Import (Days 1-2)
- [ ] Project setup and dependencies
- [ ] CLI skeleton
- [ ] Basic markdown parsing (headers, paragraphs, lists)
- [ ] Notion API connection
- [ ] Single file import

### Milestone 2: Rich Formatting (Days 3-4)
- [ ] Rich text annotations (bold, italic, code, links)
- [ ] Code blocks with language
- [ ] Block quotes
- [ ] Dividers and checkboxes

### Milestone 3: Equations (Day 5)
- [ ] Inline equation parsing
- [ ] Block equation parsing
- [ ] Notion equation block creation

### Milestone 4: Directory & Links (Days 6-7)
- [ ] Directory scanning
- [ ] Page hierarchy creation
- [ ] Internal link detection
- [ ] Link resolution and mapping

### Milestone 5: Images (Days 8-9)
- [ ] Image reference detection
- [ ] Path resolution
- [ ] External URL support
- [ ] Local file upload solution

### Milestone 6: Polish (Day 10)
- [ ] Error handling and logging
- [ ] Progress indicators
- [ ] Documentation
- [ ] Edge case handling

---

## Technical Decisions

### Language: Python
- Rich ecosystem for markdown parsing
- Official Notion SDK available
- Easy CLI development with Click

### Key Dependencies
```
notion-client>=2.0.0    # Official Notion SDK
markdown-it-py>=3.0.0   # Extensible markdown parser
mdit-py-plugins>=0.4.0  # Plugins for equations, etc.
click>=8.0.0            # CLI framework
python-dotenv>=1.0.0    # Environment variables
requests>=2.28.0        # HTTP client
rich>=13.0.0            # Beautiful terminal output
```

### Error Handling Strategy
1. Validate inputs early (file exists, page_id valid)
2. Graceful degradation for unsupported formats
3. Detailed error messages with file/line info
4. Transaction-like behavior (track what was created for cleanup)

### Logging
- Use `rich` for beautiful console output
- Progress bars for multi-file imports
- Verbose mode for debugging

---

## API Considerations

### Notion API Limitations
1. **Block children limit**: 100 blocks per append request
2. **Page content limit**: ~100KB per page
3. **Rate limits**: 3 req/s (average), handle with backoff
4. **Image blocks**: Only support external URLs
5. **Equation support**: Full LaTeX support in equation blocks

### Authentication
- Notion Integration Token required
- Must share target page with integration
- Document setup in README

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Complex nested markdown | Use battle-tested parser (markdown-it-py) |
| Notion API rate limits | Implement batching and backoff |
| Image hosting | Document options, provide flexible solution |
| Internal link cycles | Track visited pages, detect cycles |
| Large files | Stream parsing, chunked uploads |

---

## Success Criteria

1. ✅ Import single .md file with basic formatting
2. ✅ Preserve inline and block equations
3. ✅ Handle embedded images (external URLs)
4. ✅ Mirror directory structure in Notion
5. ✅ Resolve internal links between imported pages
6. ✅ Clear CLI with helpful error messages
7. ✅ Comprehensive test coverage

---

## Next Steps

1. Set up project structure and dependencies
2. Implement CLI skeleton
3. Start with basic markdown to Notion block conversion
4. Build incrementally, testing each feature
