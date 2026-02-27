/**
 * src/converter.js
 * Orchestrates the Markdown → HTML conversion pipeline.
 * Ties together parser and fileHandler.
 * All exports are named. Pure ESM.
 */

import { parseMarkdown } from './parser.js';
import { readFile, writeFile, deriveOutputPath } from './fileHandler.js';

/**
 * HTML document wrapper template.
 * Produces a minimal but valid HTML5 document.
 *
 * @param {string} body — HTML fragment for the body
 * @param {string} title — document title (derived from input filename)
 * @returns {string} full HTML document
 */
function wrapHtml(body, title = 'Document') {
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
 * Convert a Markdown file to HTML and write the output.
 *
 * @param {string} inputPath — path to the source .md file
 * @param {string} [outputPath] — path for the output .html file.
 *   If omitted, derived from inputPath by swapping .md → .html.
 * @returns {Promise<{ inputPath: string, outputPath: string }>}
 *   Resolves with the resolved paths on success.
 * @throws {Error} if the input file cannot be read or output cannot be written
 */
export async function convert(inputPath, outputPath) {
  const resolvedOutput = outputPath ?? deriveOutputPath(inputPath);

  // Read source markdown
  const markdown = await readFile(inputPath);

  // Parse to HTML fragment
  const htmlFragment = parseMarkdown(markdown);

  // Derive title from filename (strip directory and extension)
  const baseName = inputPath.split('/').pop().split('\\').pop();
  const title = baseName.replace(/\.md$/i, '');

  // Wrap in full HTML document
  const fullHtml = wrapHtml(htmlFragment, title);

  // Write output
  await writeFile(resolvedOutput, fullHtml);

  return { inputPath, outputPath: resolvedOutput };
}
