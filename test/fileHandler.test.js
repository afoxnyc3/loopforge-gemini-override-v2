/**
 * test/fileHandler.test.js
 * Unit tests for src/fileHandler.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, fileExists, deriveOutputPath } from '../src/fileHandler.js';
import { mkdtemp, rm, writeFile as fsWriteFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

let tmpDir;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'md2html-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('readFile', () => {
  it('reads a UTF-8 file successfully', async () => {
    const filePath = join(tmpDir, 'test.md');
    await fsWriteFile(filePath, '# Hello', 'utf-8');
    const content = await readFile(filePath);
    expect(content).toBe('# Hello');
  });

  it('throws descriptive error for missing file', async () => {
    await expect(readFile(join(tmpDir, 'nonexistent.md'))).rejects.toThrow('File not found');
  });
});

describe('writeFile', () => {
  it('writes content to a file', async () => {
    const filePath = join(tmpDir, 'output.html');
    await writeFile(filePath, '<h1>Hello</h1>');
    const content = await readFile(filePath);
    expect(content).toBe('<h1>Hello</h1>');
  });

  it('creates nested directories automatically', async () => {
    const filePath = join(tmpDir, 'nested', 'deep', 'output.html');
    await writeFile(filePath, '<p>test</p>');
    const content = await readFile(filePath);
    expect(content).toBe('<p>test</p>');
  });

  it('overwrites existing file', async () => {
    const filePath = join(tmpDir, 'output.html');
    await writeFile(filePath, 'first');
    await writeFile(filePath, 'second');
    const content = await readFile(filePath);
    expect(content).toBe('second');
  });
});

describe('fileExists', () => {
  it('returns true for an existing file', async () => {
    const filePath = join(tmpDir, 'exists.md');
    await fsWriteFile(filePath, 'content', 'utf-8');
    expect(await fileExists(filePath)).toBe(true);
  });

  it('returns false for a missing file', async () => {
    expect(await fileExists(join(tmpDir, 'missing.md'))).toBe(false);
  });
});

describe('deriveOutputPath', () => {
  it('replaces .md extension with .html', () => {
    const result = deriveOutputPath('/some/path/readme.md');
    expect(result).toMatch(/readme\.html$/);
  });

  it('uses outputDir when provided', () => {
    const result = deriveOutputPath('/some/path/readme.md', '/output');
    expect(result).toMatch(/output.*readme\.html/);
  });

  it('handles file without .md extension', () => {
    const result = deriveOutputPath('/some/path/notes.txt');
    expect(result).toMatch(/notes\.html$/);
  });
});
