# md2html

A minimal CLI tool that converts Markdown files to HTML.

## Features

- Headings (h1–h6)
- Bold (`**text**` and `__text__`)
- Italic (`*text*` and `_text_`)
- Inline code (`` `code` ``)
- Fenced code blocks (with optional language tag)
- Links (`[text](url)`)
- `--watch` mode for auto-recompile on file changes

## Installation

```bash
npm install
npm link   # makes md2html available globally
```

## Usage

```bash
# Convert a file
md2html input.md

# Specify output path
md2html input.md -o output.html

# Watch mode
md2html input.md --watch

# Show version
md2html --version
```

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Requirements

- Node.js >= 18.0.0
