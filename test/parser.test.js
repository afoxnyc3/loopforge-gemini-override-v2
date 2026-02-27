/**
 * test/parser.test.js
 * Unit tests for src/parser.js
 */

import { describe, it, expect } from 'vitest';
import {
  parseMarkdown,
  escapeHtml,
  extractCodeBlocks,
  processBlockElements,
  processInlineCode,
  processBold,
  processItalic,
  processLinks,
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
  it('returns unchanged string when no special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('extractCodeBlocks', () => {
  it('extracts a plain fenced code block', () => {
    const input = '```\nconsole.log("hi");\n```';
    const { text, blocks } = extractCodeBlocks(input);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('<pre><code>');
    expect(blocks[0]).toContain('console.log');
    expect(text).not.toContain('console.log');
  });

  it('extracts a fenced code block with language tag', () => {
    const input = '```javascript\nconst x = 1;\n```';
    const { text, blocks } = extractCodeBlocks(input);
    expect(blocks[0]).toContain('class="language-javascript"');
  });

  it('escapes HTML inside code blocks', () => {
    const input = '```\n<script>alert(1)</script>\n```';
    const { blocks } = extractCodeBlocks(input);
    expect(blocks[0]).toContain('&lt;script&gt;');
    expect(blocks[0]).not.toContain('<script>');
  });

  it('handles multiple code blocks', () => {
    const input = '```\nblock one\n```\n\n```\nblock two\n```';
    const { blocks } = extractCodeBlocks(input);
    expect(blocks).toHaveLength(2);
  });

  it('returns unchanged text when no code blocks present', () => {
    const input = 'Hello world';
    const { text, blocks } = extractCodeBlocks(input);
    expect(blocks).toHaveLength(0);
    expect(text).toBe('Hello world');
  });
});

describe('Headings', () => {
  it('converts h1', () => {
    expect(parseMarkdown('# Hello')).toContain('<h1>Hello</h1>');
  });
  it('converts h2', () => {
    expect(parseMarkdown('## Hello')).toContain('<h2>Hello</h2>');
  });
  it('converts h3', () => {
    expect(parseMarkdown('### Hello')).toContain('<h3>Hello</h3>');
  });
  it('converts h4', () => {
    expect(parseMarkdown('#### Hello')).toContain('<h4>Hello</h4>');
  });
  it('converts h5', () => {
    expect(parseMarkdown('##### Hello')).toContain('<h5>Hello</h5>');
  });
  it('converts h6', () => {
    expect(parseMarkdown('###### Hello')).toContain('<h6>Hello</h6>');
  });
  it('does not convert 7+ hashes as heading', () => {
    const result = parseMarkdown('####### Not a heading');
    expect(result).not.toContain('<h7>');
  });
  it('requires space after hashes', () => {
    const result = parseMarkdown('#NoSpace');
    expect(result).not.toContain('<h1>');
  });
});

describe('Bold', () => {
  it('converts **bold**', () => {
    expect(parseMarkdown('**bold text**')).toContain('<strong>bold text</strong>');
  });
  it('converts __bold__', () => {
    expect(parseMarkdown('__bold text__')).toContain('<strong>bold text</strong>');
  });
  it('handles bold within a sentence', () => {
    const result = parseMarkdown('This is **important** stuff.');
    expect(result).toContain('<strong>important</strong>');
  });
});

describe('Italic', () => {
  it('converts *italic*', () => {
    expect(parseMarkdown('*italic text*')).toContain('<em>italic text</em>');
  });
  it('converts _italic_', () => {
    expect(parseMarkdown('_italic text_')).toContain('<em>italic text</em>');
  });
  it('handles italic within a sentence', () => {
    const result = parseMarkdown('This is *emphasized* text.');
    expect(result).toContain('<em>emphasized</em>');
  });
});

describe('Inline code', () => {
  it('converts `code`', () => {
    expect(parseMarkdown('Use `console.log()` here.')).toContain('<code>console.log()</code>');
  });
  it('escapes HTML inside inline code', () => {
    const result = parseMarkdown('Use `<div>` element.');
    expect(result).toContain('<code>&lt;div&gt;</code>');
  });
});

describe('Links', () => {
  it('converts [text](url)', () => {
    const result = parseMarkdown('[Google](https://google.com)');
    expect(result).toContain('<a href="https://google.com">Google</a>');
  });
  it('escapes special chars in URL', () => {
    const result = parseMarkdown('[Link](https://example.com?a=1&b=2)');
    expect(result).toContain('href="https://example.com?a=1&amp;b=2"');
  });
});

describe('Fenced code blocks', () => {
  it('wraps in <pre><code>', () => {
    const result = parseMarkdown('```\nhello\n```');
    expect(result).toContain('<pre><code>');
    expect(result).toContain('hello');
  });
  it('adds language class when specified', () => {
    const result = parseMarkdown('```js\nconst x = 1;\n```');
    expect(result).toContain('class="language-js"');
  });
  it('does not process markdown inside code blocks', () => {
    const result = parseMarkdown('```\n**not bold**\n```');
    expect(result).not.toContain('<strong>');
    expect(result).toContain('**not bold**');
  });
  it('escapes HTML inside code blocks', () => {
    const result = parseMarkdown('```\n<b>test</b>\n```');
    expect(result).toContain('&lt;b&gt;');
    expect(result).not.toContain('<b>');
  });
});

describe('Paragraphs', () => {
  it('wraps plain text in <p>', () => {
    const result = parseMarkdown('Hello world');
    expect(result).toContain('<p>Hello world</p>');
  });
  it('handles multiple paragraphs separated by blank line', () => {
    const result = parseMarkdown('First para\n\nSecond para');
    expect(result).toContain('<p>First para</p>');
    expect(result).toContain('<p>Second para</p>');
  });
});

describe('Combined elements', () => {
  it('handles heading + paragraph + bold', () => {
    const md = '# Title\n\nThis is **bold** text.';
    const result = parseMarkdown(md);
    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('handles link with italic text', () => {
    const md = '[*click here*](https://example.com)';
    const result = parseMarkdown(md);
    expect(result).toContain('href="https://example.com"');
  });

  it('does not corrupt code block content with other transforms', () => {
    const md = '# Heading\n\n```\n**not bold** _not italic_\n```\n\nNormal *italic* text.';
    const result = parseMarkdown(md);
    expect(result).toContain('<h1>Heading</h1>');
    expect(result).toContain('**not bold** _not italic_');
    expect(result).toContain('<em>italic</em>');
    expect(result).not.toContain('<strong>not bold</strong>');
  });

  it('throws TypeError for non-string input', () => {
    expect(() => parseMarkdown(null)).toThrow(TypeError);
    expect(() => parseMarkdown(42)).toThrow(TypeError);
  });
});
