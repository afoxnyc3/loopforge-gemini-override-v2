/**
 * src/fileHandler.js
 * Async file I/O utilities using fs/promises.
 * All functions are named exports for ESM compatibility.
 */

import { readFile as fsReadFile, writeFile as fsWriteFile, access } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { dirname, extname, join, resolve, basename } from 'path';
import { constants } from 'fs';

/**
 * Reads a UTF-8 text file.
 * @param {string} filePath — absolute or relative path to file
 * @returns {Promise<string>} file contents
 * @throws {Error} with descriptive message if file not found or unreadable
 */
export async function readFile(filePath) {
  const resolved = resolve(filePath);
  try {
    return await fsReadFile(resolved, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${resolved}`);
    }
    if (err.code === 'EACCES') {
      throw new Error(`Permission denied reading file: ${resolved}`);
    }
    throw new Error(`Failed to read file ${resolved}: ${err.message}`);
  }
}

/**
 * Writes content to a file, creating parent directories as needed.
 * @param {string} filePath — destination path
 * @param {string} content — text content to write
 * @returns {Promise<void>}
 * @throws {Error} with descriptive message on failure
 */
export async function writeFile(filePath, content) {
  const resolved = resolve(filePath);
  const dir = dirname(resolved);
  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to create directory ${dir}: ${err.message}`);
  }
  try {
    await fsWriteFile(resolved, content, 'utf-8');
  } catch (err) {
    if (err.code === 'EACCES') {
      throw new Error(`Permission denied writing file: ${resolved}`);
    }
    throw new Error(`Failed to write file ${resolved}: ${err.message}`);
  }
}

/**
 * Checks whether a file exists and is readable.
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    await access(resolve(filePath), constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Derives the output HTML path from an input Markdown path.
 * Replaces the .md extension with .html.
 * If the input has no .md extension, appends .html.
 * @param {string} inputPath — path to the .md source file
 * @param {string} [outputDir] — optional output directory override
 * @returns {string} derived output path
 */
export function deriveOutputPath(inputPath, outputDir) {
  const ext = extname(inputPath);
  const base = basename(inputPath, ext === '.md' ? '.md' : ext);
  const htmlFilename = `${base}.html`;

  if (outputDir) {
    return join(outputDir, htmlFilename);
  }

  const dir = dirname(inputPath);
  return join(dir, htmlFilename);
}
