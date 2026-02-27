/**
 * test/converter.test.js
 * Integration tests for src/converter.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { convert } from '../src/converter.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'md2html-converter-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('convert', () => {
  it('converts a markdown file to HTML and writes output', async () => {
    const inputPath = path.join(tmpDir, 'test.md');
    const outputPath = path.join(tmpDir, 'test.html');
    await fs.writeFile(inputPath, '# Hello\n\nA paragraph.', 'utf-8');

    const result = await convert(inputPath, outputPath);

    expect(result.inputPath).toBe(inputPath);
    expect(result.outputPath).toBe(outputPath);

    const html = await fs.readFile(outputPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<p>A paragraph.</p>');
  });

  it('derives output path when not specified', async () => {
    const inputPath = path.join(tmpDir, 'readme.md');
    await fs.writeFile(inputPath, '# README', 'utf-8');

    const result = await convert(inputPath);

    const expectedOutput = path.join(tmpDir, 'readme.html');
    expect(result.outputPath).toBe(expectedOutput);

    const html = await fs.readFile(expectedOutput, 'utf-8');
    expect(html).toContain('<h1>README</h1>');
  });

  it('wraps output in a valid HTML5 document', async () => {
    const inputPath = path.join(tmpDir, 'doc.md');
    await fs.writeFile(inputPath, '# Doc', 'utf-8');

    await convert(inputPath);

    const html = await fs.readFile(path.join(tmpDir, 'doc.html'), 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta charset="UTF-8">');
    expect(html).toContain('<title>doc</title>');
    expect(html).toContain('</body>');
    expect(html).toContain('</html>');
  });

  it('throws when input file does not exist', async () => {
    const inputPath = path.join(tmpDir, 'nonexistent.md');
    await expect(convert(inputPath)).rejects.toThrow('File not found');
  });

  it('creates output directory if it does not exist', async () => {
    const inputPath = path.join(tmpDir, 'test.md');
    const outputPath = path.join(tmpDir, 'nested', 'output.html');
    await fs.writeFile(inputPath, '# Test', 'utf-8');

    await convert(inputPath, outputPath);

    const html = await fs.readFile(outputPath, 'utf-8');
    expect(html).toContain('<h1>Test</h1>');
  });

  it('handles complex markdown with code blocks', async () => {
    const md = '# Title\n\n```javascript\nconst x = 1;\n```\n\nEnd.';
    const inputPath = path.join(tmpDir, 'complex.md');
    await fs.writeFile(inputPath, md, 'utf-8');

    await convert(inputPath);

    const html = await fs.readFile(path.join(tmpDir, 'complex.html'), 'utf-8');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('class="language-javascript"');
    expect(html).toContain('const x = 1;');
    expect(html).toContain('<p>End.</p>');
  });
});
