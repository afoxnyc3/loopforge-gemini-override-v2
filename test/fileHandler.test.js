/**
 * test/fileHandler.test.js
 * Unit tests for src/fileHandler.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, fileExists, deriveOutputPath } from '../src/fileHandler.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'md2html-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('readFile', () => {
  it('reads an existing file', async () => {
    const filePath = path.join(tmpDir, 'test.md');
    await fs.writeFile(filePath, '# Hello', 'utf-8');
    const content = await readFile(filePath);
    expect(content).toBe('# Hello');
  });

  it('throws descriptive error for missing file', async () => {
    const filePath = path.join(tmpDir, 'nonexistent.md');
    await expect(readFile(filePath)).rejects.toThrow('File not found');
  });

  it('reads UTF-8 content correctly', async () => {
    const filePath = path.join(tmpDir, 'unicode.md');
    const content = 'Hello 🌍 — café';
    await fs.writeFile(filePath, content, 'utf-8');
    const result = await readFile(filePath);
    expect(result).toBe(content);
  });
});

describe('writeFile', () => {
  it('writes content to a file', async () => {
    const filePath = path.join(tmpDir, 'output.html');
    await writeFile(filePath, '<h1>Hello</h1>');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('<h1>Hello</h1>');
  });

  it('creates parent directories recursively', async () => {
    const filePath = path.join(tmpDir, 'deep', 'nested', 'dir', 'output.html');
    await writeFile(filePath, '<p>test</p>');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('<p>test</p>');
  });

  it('overwrites existing files', async () => {
    const filePath = path.join(tmpDir, 'output.html');
    await writeFile(filePath, 'first');
    await writeFile(filePath, 'second');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('second');
  });
});

describe('fileExists', () => {
  it('returns true for an existing file', async () => {
    const filePath = path.join(tmpDir, 'exists.md');
    await fs.writeFile(filePath, 'content', 'utf-8');
    expect(await fileExists(filePath)).toBe(true);
  });

  it('returns false for a non-existent file', async () => {
    const filePath = path.join(tmpDir, 'nope.md');
    expect(await fileExists(filePath)).toBe(false);
  });

  it('returns true for an existing directory', async () => {
    expect(await fileExists(tmpDir)).toBe(true);
  });
});

describe('deriveOutputPath', () => {
  it('replaces .md with .html', () => {
    expect(deriveOutputPath('docs/readme.md')).toBe('docs/readme.html');
  });

  it('handles file in root directory', () => {
    expect(deriveOutputPath('notes.md')).toBe('notes.html');
  });

  it('handles .MD extension (case-insensitive)', () => {
    expect(deriveOutputPath('FILE.MD')).toBe('FILE.html');
  });

  it('appends .html for non-.md files', () => {
    expect(deriveOutputPath('file.txt')).toBe('file.txt.html');
  });

  it('handles deeply nested paths', () => {
    expect(deriveOutputPath('a/b/c/deep.md')).toBe('a/b/c/deep.html');
  });
});
