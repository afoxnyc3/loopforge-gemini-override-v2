# gemini-override-v2

A minimal CLI tool that converts Markdown files to HTML.

## Features

- Headings (`#` through `######`)
- **Bold** (`**text**` and `__text__`)
- *Italic* (`*text*` and `_text_`)
- Inline code (`` `code` ``)
- Fenced code blocks (`` ``` `` with optional language)
- Links (`[text](url)`)
- `--watch` flag for auto-recompile on file changes

## Installation

```bash
npm install
npm link   # makes md2html available globally
```

## Usage

```bash
# Basic conversion
md2html input.md

# Specify output path
md2html input.md output.html

# Watch mode
md2html input.md --watch
md2html input.md output.html -w

# Help
md2html --help

# Version
md2html --version
```

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for full architecture documentation.

### Module Structure

```
bin/md2html.js     — CLI entry point (commander)
src/parser.js      — Markdown-to-HTML parser (regex pipeline)
src/fileHandler.js — File I/O utilities
src/converter.js   — Orchestrator (parser + fileHandler)
src/watcher.js     — File watcher (chokidar)
```

## License

MIT
