/**
 * src/converter.js
 * Orchestrates the Markdown→HTML conversion pipeline.
 * Wires together parser.js and fileHandler.js.
 */

import { parseMarkdown } from './parser.js';
import { readFile, writeFile, deriveOutputPath } from './fileHandler.js';
import { basename } from 'path';

/**
 * Wraps an HTML fragment in a minimal valid HTML5 document.
 * @param {string} fragment — inner HTML content
 * @param {string} title — document title (derived from filename)
 * @returns {string} full HTML document string
 */
export function wrapHtmlDocument(fragment, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body>
${fragment}
</body>
</html>
`;
}

/**
 * Converts a Markdown file to HTML and writes the output.
 * @param {string} inputPath — path to the .md source file
 * @param {string} [outputPath] — optional explicit output path;
 *   if omitted, derived via deriveOutputPath(inputPath)
 * @returns {Promise<{ inputPath: string, outputPath: string }>}
 * @throws {Error} if read, parse, or write fails
 */
export async function convert(inputPath, outputPath) {
  const resolvedOutput = outputPath ?? deriveOutputPath(inputPath);

  // Read source
  const markdown = await readFile(inputPath);

  // Parse to HTML fragment
  const fragment = parseMarkdown(markdown);

  // Derive title from filename (strip extension)
  const title = basename(inputPath).replace(/\.md$/i, '');

  // Wrap in full HTML document
  const html = wrapHtmlDocument(fragment, title);

  // Write output
  await writeFile(resolvedOutput, html);

  return { inputPath, outputPath: resolvedOutput };
}
