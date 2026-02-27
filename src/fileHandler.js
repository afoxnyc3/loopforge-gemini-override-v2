/**
 * src/fileHandler.js
 * Async file I/O utilities for reading Markdown and writing HTML.
 */

import { readFile as fsReadFile, writeFile as fsWriteFile, access } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { dirname, extname, basename, join, resolve } from 'node:path';
import { constants } from 'node:fs';

/**
 * Reads a UTF-8 file and returns its contents as a string.
 * Throws a descriptive Error if the file is not found or unreadable.
 *
 * @param {string} filePath - Absolute or relative path to the file
 * @returns {Promise<string>}
 */
export async function readFile(filePath) {
  try {
    return await fsReadFile(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    if (err.code === 'EACCES') {
      throw new Error(`Permission denied reading file: ${filePath}`);
    }
    throw new Error(`Failed to read file "${filePath}": ${err.message}`);
  }
}

/**
 * Writes content to a file, creating parent directories as needed.
 *
 * @param {string} filePath - Absolute or relative path to the output file
 * @param {string} content - Content to write
 * @returns {Promise<void>}
 */
export async function writeFile(filePath, content) {
  try {
    const dir = dirname(resolve(filePath));
    await mkdir(dir, { recursive: true });
    await fsWriteFile(filePath, content, 'utf-8');
  } catch (err) {
    if (err.code === 'EACCES') {
      throw new Error(`Permission denied writing file: ${filePath}`);
    }
    throw new Error(`Failed to write file "${filePath}": ${err.message}`);
  }
}

/**
 * Checks whether a file exists and is readable.
 *
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Derives the output HTML path from an input Markdown path.
 * Replaces the .md extension with .html.
 * If the file has no .md extension, appends .html.
 *
 * @param {string} inputPath - Path to the .md file
 * @param {string} [outputDir] - Optional output directory override
 * @returns {string} - Derived output path
 */
export function deriveOutputPath(inputPath, outputDir) {
  const ext = extname(inputPath);
  const base = basename(inputPath, ext === '.md' ? ext : '');
  const htmlFileName = ext === '.md' ? `${base}.html` : `${basename(inputPath)}.html`;

  if (outputDir) {
    return join(outputDir, htmlFileName);
  }

  return join(dirname(inputPath), htmlFileName);
}
