/**
 * test/parser.test.js
 * Unit tests for the Markdown parser pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  parseMarkdown,
  extractCodeBlocks,
  restoreCodeBlocks,
  escapeHtml,
  transformHeadings,
  transformBold,
  transformItalic,
  transformInlineCode,
  transformLinks,
  transformParagraphs,
} from '../src/parser.js';

describe('escapeHtml', () => {
  it('escapes & < > " \' characters', () => {
    expect(escapeHtml('a & b < c > d " e \'')).toBe('a &amp; b &lt; c &gt; d &quot; e &#39;');
  });

  it('returns unchanged string when no special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('extractCodeBlocks', () => {
  it('extracts a plain fenced code block', () => {
    const input = '```\nconsole.log("hi")\n```';
    const { text, blocks } = extractCodeBlocks(input);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toBe('<pre><code>console.log(&quot;hi&quot;)</code></pre>');
    expect(text).toContain('\x00CODE_BLOCK_0\x00');
  });

  it('extracts a language-tagged fenced code block', () => {
    const input = '```js\nconst x = 1;\n```';
    const { text, blocks } = extractCodeBlocks(input);
    expect(blocks[0]).toBe('<pre><code class="language-js">const x = 1;</code></pre>');
  });

  it('extracts multiple code blocks', () => {
    const input = '```\nfirst\n```\n\n```\nsecond\n```';
    const { text, blocks } = extractCodeBlocks(input);
    expect(blocks).toHaveLength(2);
  });

  it('escapes HTML inside code blocks', () => {
    const input = '```\n<div>&</div>\n```';
    const { blocks } = extractCodeBlocks(input);
    expect(blocks[0]).toContain('&lt;div&gt;&amp;&lt;/div&gt;');
  });
});

describe('restoreCodeBlocks', () => {
  it('restores placeholders with block HTML', () => {
    const blocks = ['<pre><code>hello</code></pre>'];
    const text = 'before\n\x00CODE_BLOCK_0\x00\nafter';
    expect(restoreCodeBlocks(text, blocks)).toContain('<pre><code>hello</code></pre>');
  });
});

describe('transformHeadings', () => {
  it('converts # to <h1>', () => {
    expect(transformHeadings('# Hello')).toBe('<h1>Hello</h1>');
  });

  it('converts ## to <h2>', () => {
    expect(transformHeadings('## World')).toBe('<h2>World</h2>');
  });

  it('converts ###### to <h6>', () => {
    expect(transformHeadings('###### Deep')).toBe('<h6>Deep</h6>');
  });

  it('does not convert lines with no space after #', () => {
    const result = transformHeadings('#NoSpace');
    expect(result).toBe('#NoSpace');
  });

  it('trims trailing hashes and spaces', () => {
    expect(transformHeadings('# Title   ')).toBe('<h1>Title</h1>');
  });

  it('handles multiple headings', () => {
    const input = '# One\n## Two\n### Three';
    const result = transformHeadings(input);
    expect(result).toContain('<h1>One</h1>');
    expect(result).toContain('<h2>Two</h2>');
    expect(result).toContain('<h3>Three</h3>');
  });
});

describe('transformBold', () => {
  it('converts **text** to <strong>', () => {
    expect(transformBold('**bold**')).toBe('<strong>bold</strong>');
  });

  it('converts __text__ to <strong>', () => {
    expect(transformBold('__bold__')).toBe('<strong>bold</strong>');
  });

  it('handles multiple bold spans', () => {
    const result = transformBold('**a** and **b**');
    expect(result).toBe('<strong>a</strong> and <strong>b</strong>');
  });

  it('leaves non-bold text unchanged', () => {
    expect(transformBold('normal text')).toBe('normal text');
  });
});

describe('transformItalic', () => {
  it('converts *text* to <em>', () => {
    expect(transformItalic('*italic*')).toBe('<em>italic</em>');
  });

  it('converts _text_ to <em>', () => {
    expect(transformItalic('_italic_')).toBe('<em>italic</em>');
  });

  it('handles multiple italic spans', () => {
    const result = transformItalic('*a* and *b*');
    expect(result).toBe('<em>a</em> and <em>b</em>');
  });

  it('leaves non-italic text unchanged', () => {
    expect(transformItalic('normal text')).toBe('normal text');
  });
});

describe('transformInlineCode', () => {
  it('converts `code` to <code>', () => {
    expect(transformInlineCode('`hello`')).toBe('<code>hello</code>');
  });

  it('escapes HTML inside inline code', () => {
    expect(transformInlineCode('`<div>`')).toBe('<code>&lt;div&gt;</code>');
  });

  it('handles multiple inline code spans', () => {
    const result = transformInlineCode('`a` and `b`');
    expect(result).toBe('<code>a</code> and <code>b</code>');
  });
});

describe('transformLinks', () => {
  it('converts [text](url) to <a>', () => {
    expect(transformLinks('[Google](https://google.com)')).toBe('<a href="https://google.com">Google</a>');
  });

  it('handles multiple links', () => {
    const result = transformLinks('[A](http://a.com) and [B](http://b.com)');
    expect(result).toContain('<a href="http://a.com">A</a>');
    expect(result).toContain('<a href="http://b.com">B</a>');
  });

  it('leaves non-link text unchanged', () => {
    expect(transformLinks('no links here')).toBe('no links here');
  });
});

describe('transformParagraphs', () => {
  it('wraps plain text in <p>', () => {
    expect(transformParagraphs('Hello world')).toBe('<p>Hello world</p>');
  });

  it('does not wrap block-level elements in <p>', () => {
    const result = transformParagraphs('<h1>Title</h1>');
    expect(result).toBe('<h1>Title</h1>');
  });

  it('wraps multiple paragraphs separated by blank lines', () => {
    const result = transformParagraphs('First\n\nSecond');
    expect(result).toContain('<p>First</p>');
    expect(result).toContain('<p>Second</p>');
  });
});

describe('parseMarkdown (integration)', () => {
  it('converts a heading', () => {
    expect(parseMarkdown('# Hello')).toContain('<h1>Hello</h1>');
  });

  it('converts bold text', () => {
    expect(parseMarkdown('**bold**')).toContain('<strong>bold</strong>');
  });

  it('converts italic text', () => {
    expect(parseMarkdown('*italic*')).toContain('<em>italic</em>');
  });

  it('converts inline code', () => {
    expect(parseMarkdown('`code`')).toContain('<code>code</code>');
  });

  it('converts a link', () => {
    expect(parseMarkdown('[Link](http://example.com)')).toContain('<a href="http://example.com">Link</a>');
  });

  it('converts a fenced code block', () => {
    const result = parseMarkdown('```js\nconst x = 1;\n```');
    expect(result).toContain('<pre><code class="language-js">const x = 1;</code></pre>');
  });

  it('does not apply inline transforms inside code blocks', () => {
    const result = parseMarkdown('```\n**not bold**\n```');
    expect(result).not.toContain('<strong>');
    expect(result).toContain('**not bold**');
  });

  it('handles a full document', () => {
    const md = [
      '# Title',
      '',
      'This is **bold** and *italic* text.',
      '',
      'Visit [Example](https://example.com) for more.',
      '',
      '```js',
      'const x = 42;',
      '```',
      '',
      'Inline `code` here.',
    ].join('\n');

    const result = parseMarkdown(md);
    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<a href="https://example.com">Example</a>');
    expect(result).toContain('<pre><code class="language-js">');
    expect(result).toContain('<code>code</code>');
  });

  it('normalizes Windows line endings', () => {
    const result = parseMarkdown('# Title\r\n\r\nParagraph');
    expect(result).toContain('<h1>Title</h1>');
  });
});
