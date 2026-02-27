/**
 * src/parser.js
 * Pure Markdown-to-HTML parser using a regex pipeline.
 * All exports are named. No side effects.
 */

// Placeholder token used to protect fenced code blocks
const CODE_BLOCK_PLACEHOLDER = '\x00CODE_BLOCK_\x00';

/**
 * Extract fenced code blocks from markdown, replacing them with
 * placeholder tokens so subsequent transforms don't corrupt their content.
 *
 * @param {string} markdown
 * @returns {{ text: string, blocks: string[] }}
 */
export function extractCodeBlocks(markdown) {
  const blocks = [];
  const text = markdown.replace(
    /```([\w]*)\n?([\s\S]*?)```/g,
    (_match, lang, code) => {
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      const html = `<pre><code${langAttr}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`;
      blocks.push(html);
      return `${CODE_BLOCK_PLACEHOLDER}${blocks.length - 1}\x00`;
    }
  );
  return { text, blocks };
}

/**
 * Restore code block placeholders with their rendered HTML.
 *
 * @param {string} text
 * @param {string[]} blocks
 * @returns {string}
 */
export function restoreCodeBlocks(text, blocks) {
  return text.replace(
    new RegExp(`${CODE_BLOCK_PLACEHOLDER}(\\d+)\x00`, 'g'),
    (_match, index) => blocks[parseInt(index, 10)]
  );
}

/**
 * Escape HTML special characters to prevent XSS in code content.
 *
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
 * Process ATX-style headings (# through ######).
 * Must be applied to individual lines.
 *
 * @param {string} line
 * @returns {string}
 */
export function parseHeading(line) {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return null;
  const level = match[1].length;
  const content = match[2].trim();
  return `<h${level}>${parseInline(content)}</h${level}>`;
}

/**
 * Process inline bold: **text** and __text__
 *
 * @param {string} text
 * @returns {string}
 */
export function parseBold(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>');
}

/**
 * Process inline italic: *text* and _text_
 * Applied after bold to avoid conflicts with ** vs *.
 *
 * @param {string} text
 * @returns {string}
 */
export function parseItalic(text) {
  return text
    .replace(/\*(?!\*)(.+?)(?<!\*)\*/g, '<em>$1</em>')
    .replace(/_(?!_)(.+?)(?<!_)_/g, '<em>$1</em>');
}

/**
 * Process inline code: `code`
 * Applied before bold/italic to protect code spans.
 *
 * @param {string} text
 * @returns {string}
 */
export function parseInlineCode(text) {
  return text.replace(/`([^`]+)`/g, (_match, code) => `<code>${escapeHtml(code)}</code>`);
}

/**
 * Process inline links: [text](url)
 * Supports bold/italic inside link text.
 *
 * @param {string} text
 * @returns {string}
 */
export function parseLinks(text) {
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, linkText, url) => {
      const processedText = parseBold(parseItalic(linkText));
      return `<a href="${escapeHtml(url)}">${processedText}</a>`;
    }
  );
}

/**
 * Apply all inline transforms in correct order:
 * inline code → links → bold → italic
 *
 * Inline code is first to protect backtick content.
 * Links before bold/italic so nested formatting inside link text works.
 * Bold before italic to handle *** correctly.
 *
 * @param {string} text
 * @returns {string}
 */
export function parseInline(text) {
  let result = text;
  result = parseInlineCode(result);
  result = parseLinks(result);
  result = parseBold(result);
  result = parseItalic(result);
  return result;
}

/**
 * Process a block of lines that are not headings or code blocks.
 * Wraps non-empty content in <p> tags.
 *
 * @param {string[]} lines
 * @returns {string}
 */
export function parseParagraph(lines) {
  const content = lines.join(' ').trim();
  if (!content) return '';
  return `<p>${parseInline(content)}</p>`;
}

/**
 * Main parser entry point.
 * Converts a Markdown string to an HTML fragment (not a full document).
 *
 * Pipeline:
 * 1. Extract fenced code blocks (protect from other transforms)
 * 2. Split into lines
 * 3. Process block-level elements line by line (headings, blank lines)
 * 4. Accumulate paragraph lines and flush on blank/heading
 * 5. Apply inline transforms to paragraph content
 * 6. Restore code block placeholders
 *
 * @param {string} markdown
 * @returns {string} HTML fragment
 */
export function parseMarkdown(markdown) {
  if (typeof markdown !== 'string') {
    throw new TypeError(`parseMarkdown expects a string, got ${typeof markdown}`);
  }

  // Step 1: Extract fenced code blocks
  const { text: protectedText, blocks } = extractCodeBlocks(markdown);

  // Step 2: Split into lines
  const lines = protectedText.split('\n');

  const outputParts = [];
  let paragraphLines = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      const para = parseParagraph(paragraphLines);
      if (para) outputParts.push(para);
      paragraphLines = [];
    }
  };

  for (const line of lines) {
    // Check if this line is a code block placeholder
    const placeholderMatch = line.match(
      new RegExp(`^${CODE_BLOCK_PLACEHOLDER}(\\d+)\x00$`)
    );
    if (placeholderMatch) {
      flushParagraph();
      outputParts.push(line); // will be restored later
      continue;
    }

    // Blank line: flush paragraph
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // Heading
    const heading = parseHeading(line);
    if (heading !== null) {
      flushParagraph();
      outputParts.push(heading);
      continue;
    }

    // Regular text: accumulate for paragraph
    paragraphLines.push(line);
  }

  // Flush any remaining paragraph
  flushParagraph();

  // Step 6: Restore code blocks
  const joined = outputParts.join('\n');
  return restoreCodeBlocks(joined, blocks);
}
