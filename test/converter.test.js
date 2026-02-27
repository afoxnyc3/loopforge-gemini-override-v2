/**
 * test/converter.test.js
 * Integration tests for src/converter.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { convert, wrapHtmlDocument } from '../src/converter.js';
import { readFile } from '../src/fileHandler.js';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

let tmpDir;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'md2html-converter-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('wrapHtmlDocument', () => {
  it('produces a valid HTML5 document', () => {
    const html = wrapHtmlDocument('<h1>Hello</h1>', 'Test');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Test</title>');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('</body>');
    expect(html).toContain('</html>');
  });

  it('includes charset meta tag', () => {
    const html = wrapHtmlDocument('', 'Empty');
    expect(html).toContain('charset="UTF-8"');
  });
});

describe('convert', () => {
  it('converts a markdown file and writes HTML output', async () => {
    const inputPath = join(tmpDir, 'test.md');
    const outputPath = join(tmpDir, 'test.html');
    await writeFile(inputPath, '# Hello World\n\nThis is **bold**.');

    const result = await convert(inputPath, outputPath);

    expect(result.outputPath).toBe(outputPath);
    const html = await readFile(outputPath);
    expect(html).toContain('<h1>Hello World</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('derives output path when not specified', async () => {
    const inputPath = join(tmpDir, 'readme.md');
    await writeFile(inputPath, '# README');

    const result = await convert(inputPath);

    expect(result.outputPath).toMatch(/readme\.html$/);
    const html = await readFile(result.outputPath);
    expect(html).toContain('<h1>README</h1>');
  });

  it('sets document title from filename', async () => {
    const inputPath = join(tmpDir, 'my-doc.md');
    await writeFile(inputPath, '# Content');

    await convert(inputPath, join(tmpDir, 'my-doc.html'));
    const html = await readFile(join(tmpDir, 'my-doc.html'));
    expect(html).toContain('<title>my-doc</title>');
  });

  it('throws if input file does not exist', async () => {
    await expect(
      convert(join(tmpDir, 'nonexistent.md'), join(tmpDir, 'out.html'))
    ).rejects.toThrow('File not found');
  });

  it('handles empty markdown file', async () => {
    const inputPath = join(tmpDir, 'empty.md');
    const outputPath = join(tmpDir, 'empty.html');
    await writeFile(inputPath, '');

    await convert(inputPath, outputPath);
    const html = await readFile(outputPath);
    expect(html).toContain('<!DOCTYPE html>');
  });
});
