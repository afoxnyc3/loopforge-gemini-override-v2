/**
 * src/parser.js
 * Pure function Markdown-to-HTML parser using a regex pipeline.
 * No external Markdown libraries — custom transforms only.
 */

/**
 * Extracts fenced code blocks and replaces them with placeholders.
 * Returns { text, blocks } where blocks is an array of HTML strings.
 *
 * @param {string} text
 * @returns {{ text: string, blocks: string[] }}
 */
function extractCodeBlocks(text) {
  const blocks = [];
  const result = text.replace(
    /^```([\w-]*)\n([\s\S]*?)^```/gm,
    (_, lang, code) => {
      const langAttr = lang ? ` class="language-${lang}"` : '';
      const escaped = escapeHtml(code.replace(/\n$/, ''));
      blocks.push(`<pre><code${langAttr}>${escaped}</code></pre>`);
      return `\x00CODE_BLOCK_${blocks.length - 1}\x00`;
    }
  );
  return { text: result, blocks };
}

/**
 * Restores code block placeholders with their HTML equivalents.
 *
 * @param {string} text
 * @param {string[]} blocks
 * @returns {string}
 */
function restoreCodeBlocks(text, blocks) {
  return text.replace(/\x00CODE_BLOCK_(\d+)\x00/g, (_, i) => blocks[Number(i)]);
}

/**
 * Escapes HTML special characters.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts ATX headings (# through ######) to <h1>–<h6>.
 *
 * @param {string} text
 * @returns {string}
 */
function transformHeadings(text) {
  return text.replace(/^(#{1,6})[ \t]+(.+?)[ \t]*$/gm, (_, hashes, content) => {
    const level = hashes.length;
    return `<h${level}>${content.trim()}</h${level}>`;
  });
}

/**
 * Converts **text** and __text__ to <strong>.
 *
 * @param {string} text
 * @returns {string}
 */
function transformBold(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>');
}

/**
 * Converts *text* and _text_ to <em>.
 * Avoids matching bold markers.
 *
 * @param {string} text
 * @returns {string}
 */
function transformItalic(text) {
  return text
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');
}

/**
 * Converts `code` to <code>.
 *
 * @param {string} text
 * @returns {string}
 */
function transformInlineCode(text) {
  return text.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);
}

/**
 * Converts [text](url) to <a href="url">text</a>.
 *
 * @param {string} text
 * @returns {string}
 */
function transformLinks(text) {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/**
 * Wraps non-empty lines that are not already block-level HTML elements in <p> tags.
 * Blank lines separate paragraphs.
 *
 * @param {string} text
 * @returns {string}
 */
function transformParagraphs(text) {
  const blockTags = /^(<h[1-6]|<pre|<ul|<ol|<li|<blockquote|<hr|<table|\x00CODE_BLOCK)/;
  const lines = text.split('\n');
  const output = [];
  let paragraphLines = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      const content = paragraphLines.join(' ').trim();
      if (content) {
        output.push(`<p>${content}</p>`);
      }
      paragraphLines = [];
    }
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flushParagraph();
    } else if (blockTags.test(line.trim())) {
      flushParagraph();
      output.push(line);
    } else {
      paragraphLines.push(line);
    }
  }

  flushParagraph();
  return output.join('\n');
}

/**
 * Main parser entry point.
 * Runs the full Markdown-to-HTML pipeline on the input string.
 *
 * @param {string} markdown - Raw Markdown string
 * @returns {string} - HTML string (fragment, no <html>/<body> wrapper)
 */
export function parseMarkdown(markdown) {
  // Normalize line endings
  let text = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 1: Extract fenced code blocks (protect from further transforms)
  const { text: textWithPlaceholders, blocks } = extractCodeBlocks(text);
  text = textWithPlaceholders;

  // Step 2: Transform headings
  text = transformHeadings(text);

  // Step 3: Transform inline elements (order matters: bold before italic)
  text = transformBold(text);
  text = transformItalic(text);
  text = transformInlineCode(text);
  text = transformLinks(text);

  // Step 4: Wrap paragraphs
  text = transformParagraphs(text);

  // Step 5: Restore code blocks
  text = restoreCodeBlocks(text, blocks);

  return text;
}

// Named exports for testing individual transforms
export {
  extractCodeBlocks,
  restoreCodeBlocks,
  escapeHtml,
  transformHeadings,
  transformBold,
  transformItalic,
  transformInlineCode,
  transformLinks,
  transformParagraphs,
};
