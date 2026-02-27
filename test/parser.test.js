/**
 * test/parser.test.js
 * Unit tests for src/parser.js
 */

import { describe, it, expect } from 'vitest';
import {
  parseMarkdown,
  parseHeading,
  parseBold,
  parseItalic,
  parseInlineCode,
  parseLinks,
  parseInline,
  escapeHtml,
  extractCodeBlocks,
  restoreCodeBlocks,
} from '../src/parser.js';

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });
  it('escapes less-than', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });
  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });
  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });
  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('extractCodeBlocks', () => {
  it('extracts a simple fenced code block', () => {
    const md = '```\nconsole.log("hello")\n```';
    const { text, blocks } = extractCodeBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('<pre><code>');
    expect(blocks[0]).toContain('console.log');
    expect(text).not.toContain('console.log');
  });

  it('extracts a fenced code block with language', () => {
    const md = '```javascript\nconst x = 1;\n```';
    const { blocks } = extractCodeBlocks(md);
    expect(blocks[0]).toContain('class="language-javascript"');
    expect(blocks[0]).toContain('const x = 1;');
  });

  it('escapes HTML inside code blocks', () => {
    const md = '```\n<div>test</div>\n```';
    const { blocks } = extractCodeBlocks(md);
    expect(blocks[0]).toContain('&lt;div&gt;');
  });

  it('extracts multiple code blocks', () => {
    const md = '```\nfirst\n```\nsome text\n```\nsecond\n```';
    const { blocks } = extractCodeBlocks(md);
    expect(blocks).toHaveLength(2);
  });

  it('leaves text without code blocks unchanged', () => {
    const md = 'Hello world';
    const { text, blocks } = extractCodeBlocks(md);
    expect(text).toBe('Hello world');
    expect(blocks).toHaveLength(0);
  });
});

describe('parseHeading', () => {
  it('parses h1', () => {
    expect(parseHeading('# Hello')).toBe('<h1>Hello</h1>');
  });
  it('parses h2', () => {
    expect(parseHeading('## Hello')).toBe('<h2>Hello</h2>');
  });
  it('parses h3', () => {
    expect(parseHeading('### Hello')).toBe('<h3>Hello</h3>');
  });
  it('parses h4', () => {
    expect(parseHeading('#### Hello')).toBe('<h4>Hello</h4>');
  });
  it('parses h5', () => {
    expect(parseHeading('##### Hello')).toBe('<h5>Hello</h5>');
  });
  it('parses h6', () => {
    expect(parseHeading('###### Hello')).toBe('<h6>Hello</h6>');
  });
  it('returns null for non-heading lines', () => {
    expect(parseHeading('plain text')).toBeNull();
  });
  it('returns null for # without space', () => {
    expect(parseHeading('#NoSpace')).toBeNull();
  });
  it('handles inline formatting in headings', () => {
    expect(parseHeading('# Hello **world**')).toBe('<h1>Hello <strong>world</strong></h1>');
  });
});

describe('parseBold', () => {
  it('converts **text** to <strong>', () => {
    expect(parseBold('Hello **world**')).toBe('Hello <strong>world</strong>');
  });
  it('converts __text__ to <strong>', () => {
    expect(parseBold('Hello __world__')).toBe('Hello <strong>world</strong>');
  });
  it('handles multiple bold spans', () => {
    expect(parseBold('**a** and **b**')).toBe('<strong>a</strong> and <strong>b</strong>');
  });
  it('leaves plain text unchanged', () => {
    expect(parseBold('plain text')).toBe('plain text');
  });
});

describe('parseItalic', () => {
  it('converts *text* to <em>', () => {
    expect(parseItalic('Hello *world*')).toBe('Hello <em>world</em>');
  });
  it('converts _text_ to <em>', () => {
    expect(parseItalic('Hello _world_')).toBe('Hello <em>world</em>');
  });
  it('handles multiple italic spans', () => {
    expect(parseItalic('*a* and *b*')).toBe('<em>a</em> and <em>b</em>');
  });
  it('leaves plain text unchanged', () => {
    expect(parseItalic('plain text')).toBe('plain text');
  });
});

describe('parseInlineCode', () => {
  it('converts `code` to <code>', () => {
    expect(parseInlineCode('use `console.log` here')).toBe('use <code>console.log</code> here');
  });
  it('escapes HTML inside inline code', () => {
    expect(parseInlineCode('`<div>`')).toBe('<code>&lt;div&gt;</code>');
  });
  it('handles multiple inline code spans', () => {
    expect(parseInlineCode('`a` and `b`')).toBe('<code>a</code> and <code>b</code>');
  });
});

describe('parseLinks', () => {
  it('converts [text](url) to <a>', () => {
    expect(parseLinks('[Google](https://google.com)')).toBe('<a href="https://google.com">Google</a>');
  });
  it('handles bold inside link text', () => {
    const result = parseLinks('[**bold**](https://example.com)');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('href="https://example.com"');
  });
  it('handles italic inside link text', () => {
    const result = parseLinks('[*italic*](https://example.com)');
    expect(result).toContain('<em>italic</em>');
  });
  it('escapes URL special chars', () => {
    const result = parseLinks('[click](https://example.com/path?a=1&b=2)');
    expect(result).toContain('&amp;');
  });
});

describe('parseInline (combined)', () => {
  it('handles bold and italic together', () => {
    const result = parseInline('**bold** and *italic*');
    expect(result).toBe('<strong>bold</strong> and <em>italic</em>');
  });
  it('handles link with bold text', () => {
    const result = parseInline('[**bold link**](https://example.com)');
    expect(result).toContain('<strong>bold link</strong>');
    expect(result).toContain('href="https://example.com"');
  });
  it('handles inline code protecting content', () => {
    const result = parseInline('`**not bold**`');
    expect(result).toContain('<code>');
    expect(result).not.toContain('<strong>');
  });
});

describe('parseMarkdown (integration)', () => {
  it('throws TypeError for non-string input', () => {
    expect(() => parseMarkdown(null)).toThrow(TypeError);
    expect(() => parseMarkdown(42)).toThrow(TypeError);
  });

  it('converts h1 heading', () => {
    expect(parseMarkdown('# Hello')).toBe('<h1>Hello</h1>');
  });

  it('converts h2 heading', () => {
    expect(parseMarkdown('## World')).toBe('<h2>World</h2>');
  });

  it('converts a paragraph', () => {
    expect(parseMarkdown('Hello world')).toBe('<p>Hello world</p>');
  });

  it('converts bold text in paragraph', () => {
    expect(parseMarkdown('Hello **world**')).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('converts italic text in paragraph', () => {
    expect(parseMarkdown('Hello *world*')).toBe('<p>Hello <em>world</em></p>');
  });

  it('converts a fenced code block', () => {
    const md = '```\nconsole.log("hello")\n```';
    const result = parseMarkdown(md);
    expect(result).toContain('<pre><code>');
    expect(result).toContain('console.log');
  });

  it('does not apply bold/italic inside code blocks', () => {
    const md = '```\n**not bold**\n```';
    const result = parseMarkdown(md);
    expect(result).not.toContain('<strong>');
    expect(result).toContain('**not bold**');
  });

  it('converts a link', () => {
    const result = parseMarkdown('[Google](https://google.com)');
    expect(result).toContain('<a href="https://google.com">Google</a>');
  });

  it('handles multiple blocks separated by blank lines', () => {
    const md = '# Title\n\nA paragraph.\n\n## Section';
    const result = parseMarkdown(md);
    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<p>A paragraph.</p>');
    expect(result).toContain('<h2>Section</h2>');
  });

  it('handles a fenced code block with language', () => {
    const md = '```js\nconst x = 1;\n```';
    const result = parseMarkdown(md);
    expect(result).toContain('class="language-js"');
  });

  it('handles empty string', () => {
    expect(parseMarkdown('')).toBe('');
  });

  it('handles mixed inline formatting', () => {
    const md = 'Text with **bold**, *italic*, and `code`.';
    const result = parseMarkdown(md);
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code>code</code>');
  });

  it('handles code block between headings', () => {
    const md = '# Title\n\n```\ncode here\n```\n\n## End';
    const result = parseMarkdown(md);
    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<pre><code>');
    expect(result).toContain('<h2>End</h2>');
  });
});
