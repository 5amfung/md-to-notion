# md-to-notion

Import markdown files to Notion, preserving directory structure, formatting, equations, and images.

## Features

- **Two pass sync**: Handle Markdown link and wiki-links between pages
- **Directory mirroring**: Folder structure is preserved as nested Notion pages
- **Idempotent**: Re-running the command only syncs changed files
- **Markdown support**: Headings, lists, tables, code blocks, callouts, equations, images
- **Obsidian syntax**: Wiki-links, highlights, callouts
- **Image upload**: Local images are uploaded to Notion automatically

## Sync State

A `.notion-sync.json` file is created in the current working directory to track:
- Which files have been imported
- Content hashes for change detection
- Notion page IDs for updates

This enables incremental syncs and failure recovery.

## Quick Start

The easiest way to use `md-to-notion` is via `bunx` - no installation required!

```bash
bunx @samfung/md-to-notion
```

### Prerequisites

- [Bun](https://bun.sh) (for `bunx`)
- Notion API key

### Configuration

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy the API key and set it in your environment:

```bash
export NOTION_API_KEY=your_api_key_here
```

3. Share the destination Notion page with your integration (click "..." menu → "Add connections" → select your integration)

### Usage

```bash
# Using bunx (Bun)
bunx md-to-notion ./doc <destination_page_id>

# Import directory contents directly under destination (no wrapper page)
bunx md-to-notion ./doc/* <destination_page_id>

# Import a single file
bunx md-to-notion ./doc/file.md <destination_page_id>

# Import multiple specific paths
bunx md-to-notion ./doc/foo ./doc/bar ./doc/readme.md <destination_page_id>

# With options
bunx md-to-notion ./doc <destination_page_id> --verbose --dry-run
```

### Single Directory vs Glob

| Command | Result |
|---------|--------|
| `./doc <page_id>` | Creates `doc` page under destination, contents nested inside |
| `./doc/* <page_id>` | Files and folders go directly under destination (no wrapper) |

### CLI Flags

| Flag | Description |
|------|-------------|
| `--verbose` | Show detailed progress (file count, current file) |
| `--dry-run` | Preview changes without making them |
| `--force` | Re-import all files, ignoring sync state |

### Finding the Page ID

The destination page ID is the 32-character string in the Notion URL:

```
https://www.notion.so/Obsidian-Import-Test-2f9c6073b5798033ae84dba25ed3f741
                                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                           This is the page ID (remove dashes)
```

## Local Development

If you prefer to run from source or contribute to the project:

### Installation

```bash
git clone <repository-url>
cd md-to-notion
bun install
```

### Configuration

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy the API key and set it in your environment or `.env` file.

```bash
export NOTION_API_KEY=your_api_key_here
```

### Usage

```bash
# Import a directory (creates a "doc" page under destination)
bun run src/cli.ts ./doc <destination_page_id>

# Import directory contents directly under destination (no wrapper page)
bun run src/cli.ts ./doc/* <destination_page_id>

# Import a single file
bun run src/cli.ts ./doc/file.md <destination_page_id>

# Import multiple specific paths
bun run src/cli.ts ./doc/foo ./doc/bar ./doc/readme.md <destination_page_id>

# With options
bun run src/cli.ts ./doc <destination_page_id> --verbose --dry-run
```
