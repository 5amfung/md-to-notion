# Notion Block Structures Reference

Complete TypeScript block structures for the Notion API.

## Text Blocks

### Paragraph

```typescript
{
  type: "paragraph",
  paragraph: {
    rich_text: [{ type: "text", text: { content: "Paragraph text" } }],
    color: "default"
  }
}
```

### Headings

```typescript
// Heading 1
{
  type: "heading_1",
  heading_1: {
    rich_text: [{ type: "text", text: { content: "Heading 1" } }],
    is_toggleable: false
  }
}

// Heading 2
{
  type: "heading_2",
  heading_2: {
    rich_text: [{ type: "text", text: { content: "Heading 2" } }],
    is_toggleable: false
  }
}

// Heading 3
{
  type: "heading_3",
  heading_3: {
    rich_text: [{ type: "text", text: { content: "Heading 3" } }],
    is_toggleable: false
  }
}
```

## List Blocks

### Bulleted List Item

```typescript
{
  type: "bulleted_list_item",
  bulleted_list_item: {
    rich_text: [{ type: "text", text: { content: "List item" } }],
    children: [] // Optional nested blocks
  }
}
```

### Numbered List Item

```typescript
{
  type: "numbered_list_item",
  numbered_list_item: {
    rich_text: [{ type: "text", text: { content: "Numbered item" } }],
    children: []
  }
}
```

### To-Do

```typescript
{
  type: "to_do",
  to_do: {
    rich_text: [{ type: "text", text: { content: "Task description" } }],
    checked: false
  }
}
```

## Code Block

```typescript
{
  type: "code",
  code: {
    rich_text: [{ type: "text", text: { content: "const x = 1;" } }],
    language: "typescript", // See language list below
    caption: []
  }
}
```

### Supported Languages

`abap`, `arduino`, `bash`, `basic`, `c`, `clojure`, `coffeescript`, `cpp`, `csharp`, `css`, `dart`, `diff`, `docker`, `elixir`, `elm`, `erlang`, `flow`, `fortran`, `fsharp`, `gherkin`, `glsl`, `go`, `graphql`, `groovy`, `haskell`, `html`, `java`, `javascript`, `json`, `julia`, `kotlin`, `latex`, `less`, `lisp`, `livescript`, `lua`, `makefile`, `markdown`, `markup`, `matlab`, `mermaid`, `nix`, `objective-c`, `ocaml`, `pascal`, `perl`, `php`, `plain text`, `powershell`, `prolog`, `protobuf`, `python`, `r`, `reason`, `ruby`, `rust`, `sass`, `scala`, `scheme`, `scss`, `shell`, `sql`, `swift`, `typescript`, `vb.net`, `verilog`, `vhdl`, `visual basic`, `webassembly`, `xml`, `yaml`, `java/c/c++/c#`

## Quote and Callout

### Quote

```typescript
{
  type: "quote",
  quote: {
    rich_text: [{ type: "text", text: { content: "Quote text" } }],
    color: "default"
  }
}
```

### Callout

```typescript
{
  type: "callout",
  callout: {
    rich_text: [{ type: "text", text: { content: "Callout content" } }],
    icon: { type: "emoji", emoji: "💡" },
    color: "gray_background"
  }
}
```

### Callout Colors

`default`, `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`, plus `_background` variants.

## Media Blocks

### Image (External)

```typescript
{
  type: "image",
  image: {
    type: "external",
    external: { url: "https://example.com/image.png" },
    caption: [{ type: "text", text: { content: "Image caption" } }]
  }
}
```

### Video (External)

```typescript
{
  type: "video",
  video: {
    type: "external",
    external: { url: "https://youtube.com/watch?v=..." }
  }
}
```

### PDF (External)

```typescript
{
  type: "pdf",
  pdf: {
    type: "external",
    external: { url: "https://example.com/document.pdf" }
  }
}
```

### File (External)

```typescript
{
  type: "file",
  file: {
    type: "external",
    external: { url: "https://example.com/file.zip" },
    caption: []
  }
}
```

## Equation

### Block Equation

```typescript
{
  type: "equation",
  equation: {
    expression: "E = mc^2"
  }
}
```

### Inline Equation (in rich_text)

```typescript
{
  type: "equation",
  equation: { expression: "x^2" }
}
```

## Table

### Table Block

```typescript
{
  type: "table",
  table: {
    table_width: 3, // Number of columns
    has_column_header: true,
    has_row_header: false,
    children: [
      // table_row blocks
    ]
  }
}
```

### Table Row

```typescript
{
  type: "table_row",
  table_row: {
    cells: [
      [{ type: "text", text: { content: "Cell 1" } }],
      [{ type: "text", text: { content: "Cell 2" } }],
      [{ type: "text", text: { content: "Cell 3" } }]
    ]
  }
}
```

## Other Blocks

### Divider

```typescript
{
  type: "divider",
  divider: {}
}
```

### Toggle

```typescript
{
  type: "toggle",
  toggle: {
    rich_text: [{ type: "text", text: { content: "Toggle header" } }],
    children: [
      // Nested blocks shown when expanded
    ]
  }
}
```

### Bookmark

```typescript
{
  type: "bookmark",
  bookmark: {
    url: "https://example.com",
    caption: []
  }
}
```

### Embed

```typescript
{
  type: "embed",
  embed: {
    url: "https://twitter.com/..."
  }
}
```

## Rich Text Structure

All text content uses `rich_text` arrays:

```typescript
type RichText = {
  type: "text" | "mention" | "equation";
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  mention?: {
    type: "user" | "page" | "database" | "date";
    // Specific mention data
  };
  equation?: {
    expression: string;
  };
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text?: string;
  href?: string | null;
}[];
```

## Rich Text with Link

```typescript
{
  type: "text",
  text: {
    content: "Click here",
    link: { url: "https://example.com" }
  }
}
```

## Page Properties (for Database Pages)

### Title

```typescript
{
  Name: {
    title: [{ text: { content: "Page Title" } }]
  }
}
```

### Multi-Select (Tags)

```typescript
{
  Tags: {
    multi_select: [
      { name: "tag1" },
      { name: "tag2" }
    ]
  }
}
```

### Date

```typescript
{
  Created: {
    date: {
      start: "2024-01-20",
      end: null,
      time_zone: null
    }
  }
}
```

### Rich Text Property

```typescript
{
  Description: {
    rich_text: [{ text: { content: "Description text" } }]
  }
}
```

### Checkbox

```typescript
{
  Published: {
    checkbox: true
  }
}
```

### URL

```typescript
{
  Link: {
    url: "https://example.com"
  }
}
```
