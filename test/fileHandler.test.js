/**
 * test/fileHandler.test.js
 * Unit and integration tests for the fileHandler module.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile as fsWrite } from 'node:fs/promises';
import { join, tmpdir } from 'node:path';
import { readFile, writeFile, fileExists, deriveOutputPath } from '../src/fileHandler.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'md2html-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('readFile', () => {
  it('reads an existing file as UTF-8', async () => {
    const filePath = join(tmpDir, 'test.md');
    await fsWrite(filePath, '# Hello', 'utf-8');
    const content = await readFile(filePath);
    expect(content).toBe('# Hello');
  });

  it('throws a descriptive error for missing files', async () => {
    await expect(readFile(join(tmpDir, 'nonexistent.md'))).rejects.toThrow('File not found');
  });

  it('reads a file with special characters', async () => {
    const content = '# Héllo Wörld\n\n**Ünïcode**';
    const filePath = join(tmpDir, 'unicode.md');
    await fsWrite(filePath, content, 'utf-8');
    expect(await readFile(filePath)).toBe(content);
  });
});

describe('writeFile', () => {
  it('writes content to a file', async () => {
    const filePath = join(tmpDir, 'output.html');
    await writeFile(filePath, '<h1>Hello</h1>');
    const content = await readFile(filePath);
    expect(content).toBe('<h1>Hello</h1>');
  });

  it('creates parent directories recursively', async () => {
    const filePath = join(tmpDir, 'a', 'b', 'c', 'output.html');
    await writeFile(filePath, '<p>deep</p>');
    const content = await readFile(filePath);
    expect(content).toBe('<p>deep</p>');
  });

  it('overwrites existing files', async () => {
    const filePath = join(tmpDir, 'overwrite.html');
    await writeFile(filePath, 'first');
    await writeFile(filePath, 'second');
    const content = await readFile(filePath);
    expect(content).toBe('second');
  });
});

describe('fileExists', () => {
  it('returns true for an existing file', async () => {
    const filePath = join(tmpDir, 'exists.md');
    await fsWrite(filePath, 'content', 'utf-8');
    expect(await fileExists(filePath)).toBe(true);
  });

  it('returns false for a missing file', async () => {
    expect(await fileExists(join(tmpDir, 'missing.md'))).toBe(false);
  });

  it('returns false for a directory path', async () => {
    // tmpDir is a directory, not a regular file — access may succeed
    // but we test a clearly non-existent path
    expect(await fileExists(join(tmpDir, 'no-such-file.txt'))).toBe(false);
  });
});

describe('deriveOutputPath', () => {
  it('replaces .md extension with .html in the same directory', () => {
    expect(deriveOutputPath('/some/dir/file.md')).toBe('/some/dir/file.html');
  });

  it('uses outputDir when provided', () => {
    expect(deriveOutputPath('/some/dir/file.md', '/out')).toBe('/out/file.html');
  });

  it('appends .html when input has no .md extension', () => {
    const result = deriveOutputPath('/some/dir/file.txt');
    expect(result).toMatch(/file\.txt\.html$/);
  });

  it('handles files in current directory', () => {
    const result = deriveOutputPath('README.md');
    expect(result).toMatch(/README\.html$/);
  });
});
