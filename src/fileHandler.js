/**
 * src/fileHandler.js
 * Async file I/O utilities for the md2html pipeline.
 * All exports are named. Pure ESM.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Read a file as UTF-8 text.
 *
 * @param {string} filePath — absolute or relative path to the file
 * @returns {Promise<string>} file contents
 * @throws {Error} with descriptive message if file is not found or unreadable
 */
export async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    if (err.code === 'EACCES') {
      throw new Error(`Permission denied reading file: ${filePath}`);
    }
    throw new Error(`Failed to read file ${filePath}: ${err.message}`);
  }
}

/**
 * Write content to a file, creating parent directories as needed (mkdir -p).
 *
 * @param {string} filePath — absolute or relative path to the output file
 * @param {string} content — string content to write
 * @returns {Promise<void>}
 * @throws {Error} with descriptive message on failure
 */
export async function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (err) {
    if (err.code === 'EACCES') {
      throw new Error(`Permission denied writing file: ${filePath}`);
    }
    throw new Error(`Failed to write file ${filePath}: ${err.message}`);
  }
}

/**
 * Check whether a file exists and is accessible.
 *
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Derive the HTML output path from a Markdown input path.
 * Replaces the .md extension with .html.
 * If the input has no .md extension, appends .html.
 *
 * @param {string} inputPath — path to the .md source file
 * @returns {string} corresponding .html output path
 *
 * @example
 * deriveOutputPath('docs/readme.md') // => 'docs/readme.html'
 * deriveOutputPath('notes.md')        // => 'notes.html'
 * deriveOutputPath('file.txt')        // => 'file.txt.html'
 */
export function deriveOutputPath(inputPath) {
  const ext = path.extname(inputPath);
  if (ext.toLowerCase() === '.md') {
    return inputPath.slice(0, -ext.length) + '.html';
  }
  return inputPath + '.html';
}
