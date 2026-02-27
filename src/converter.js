/**
 * src/converter.js
 * Orchestrates the Markdown-to-HTML conversion pipeline.
 * Reads input, parses Markdown, wraps in HTML boilerplate, writes output.
 */

import { readFile, writeFile, deriveOutputPath } from './fileHandler.js';
import { parseMarkdown } from './parser.js';
import { basename } from 'node:path';

/**
 * Wraps an HTML fragment in a minimal, valid HTML5 document.
 *
 * @param {string} title - Page title (derived from filename)
 * @param {string} body - HTML fragment for the body
 * @returns {string} - Full HTML document string
 */
function wrapHtml(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body>
${body}
</body>
</html>
`;
}

/**
 * Converts a Markdown file to an HTML file.
 *
 * @param {string} inputPath - Path to the source .md file
 * @param {string} [outputPath] - Optional explicit output path.
 *   If omitted, derived from inputPath (same dir, .html extension).
 * @param {string} [outputDir] - Optional output directory (used only if outputPath is not given).
 * @returns {Promise<{ inputPath: string, outputPath: string }>}
 */
export async function convert(inputPath, outputPath, outputDir) {
  // Resolve output path
  const resolvedOutputPath = outputPath || deriveOutputPath(inputPath, outputDir);

  // Read Markdown source
  const markdown = await readFile(inputPath);

  // Parse to HTML fragment
  const htmlFragment = parseMarkdown(markdown);

  // Derive page title from filename (strip extension)
  const fileBase = basename(inputPath);
  const title = fileBase.replace(/\.md$/i, '');

  // Wrap in full HTML document
  const fullHtml = wrapHtml(title, htmlFragment);

  // Write output
  await writeFile(resolvedOutputPath, fullHtml);

  return { inputPath, outputPath: resolvedOutputPath };
}
