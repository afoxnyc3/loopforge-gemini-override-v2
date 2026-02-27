/**
 * src/parser.js
 * Pure function Markdown-to-HTML parser using a regex pipeline.
 * Processing order:
 *   1. Extract fenced code blocks as placeholders (protect from further transforms)
 *   2. Block-level: headings, paragraphs
 *   3. Inline: bold, italic, inline code, links
 *   4. Restore code block placeholders
 */

const PLACEHOLDER_PREFIX = '\x00CODE_BLOCK_';
const PLACEHOLDER_SUFFIX = '\x00';

/**
 * Escapes HTML special characters in a string.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Step 1: Extract fenced code blocks, replacing them with placeholders.
 * Supports optional language tag: ```js ... ```
 * @param {string} markdown
 * @returns {{ text: string, blocks: string[] }}
 */
export function extractCodeBlocks(markdown) {
  const blocks = [];
  const text = markdown.replace(
    /```([\w]*)\n?([\s\S]*?)```/g,
    (match, lang, code) => {
      const escaped = escapeHtml(code.replace(/\n$/, ''));
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      const html = `<pre><code${langAttr}>${escaped}</code></pre>`;
      const index = blocks.length;
      blocks.push(html);
      return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
    }
  );
  return { text, blocks };
}

/**
 * Step 2: Process block-level elements.
 * - ATX headings: # through ######
 * - Paragraphs: non-empty lines not already wrapped
 * @param {string} text
 * @returns {string}
 */
export function processBlockElements(text) {
  const lines = text.split('\n');
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ATX Heading: 1-6 # chars followed by space and content
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2].trim();
      output.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    // Placeholder lines — pass through untouched
    if (line.includes(PLACEHOLDER_PREFIX)) {
      output.push(line);
      i++;
      continue;
    }

    // Empty line — skip (paragraph boundary)
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph: collect consecutive non-empty, non-heading, non-placeholder lines
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,6}\s+/) &&
      !lines[i].includes(PLACEHOLDER_PREFIX)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      output.push(`<p>${paraLines.join(' ')}</p>`);
    }
  }

  return output.join('\n');
}

/**
 * Step 3a: Process inline code (backtick spans).
 * Must run before bold/italic to avoid conflict.
 * @param {string} text
 * @returns {string}
 */
export function processInlineCode(text) {
  return text.replace(/`([^`]+)`/g, (match, code) => {
    return `<code>${escapeHtml(code)}</code>`;
  });
}

/**
 * Step 3b: Process bold (** or __).
 * @param {string} text
 * @returns {string}
 */
export function processBold(text) {
  // **text** or __text__
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>');
}

/**
 * Step 3c: Process italic (* or _).
 * Runs after bold to avoid consuming ** as italic.
 * @param {string} text
 * @returns {string}
 */
export function processItalic(text) {
  // *text* or _text_ (single delimiter)
  return text
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
}

/**
 * Step 3d: Process links [text](url).
 * @param {string} text
 * @returns {string}
 */
export function processLinks(text) {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    return `<a href="${escapeHtml(url)}">${linkText}</a>`;
  });
}

/**
 * Step 4: Restore code block placeholders with their HTML.
 * @param {string} text
 * @param {string[]} blocks
 * @returns {string}
 */
export function restoreCodeBlocks(text, blocks) {
  return text.replace(
    new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, 'g'),
    (match, index) => blocks[parseInt(index, 10)]
  );
}

/**
 * Main parser entry point.
 * Converts a Markdown string to an HTML fragment (no <html>/<body> wrapper).
 * @param {string} markdown
 * @returns {string} HTML fragment
 */
export function parseMarkdown(markdown) {
  if (typeof markdown !== 'string') {
    throw new TypeError('parseMarkdown expects a string input');
  }

  // Normalize line endings
  const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 1: Protect code blocks
  const { text: withPlaceholders, blocks } = extractCodeBlocks(normalized);

  // Step 2: Block-level elements
  const withBlocks = processBlockElements(withPlaceholders);

  // Step 3: Inline elements (order matters: code → bold → italic → links)
  let withInline = processInlineCode(withBlocks);
  withInline = processBold(withInline);
  withInline = processItalic(withInline);
  withInline = processLinks(withInline);

  // Step 4: Restore code blocks
  const result = restoreCodeBlocks(withInline, blocks);

  return result;
}
