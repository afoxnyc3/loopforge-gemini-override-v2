/**
 * test/converter.test.js
 * Integration tests for the converter orchestrator.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile as fsWrite, readFile as fsRead } from 'node:fs/promises';
import { join, tmpdir } from 'node:path';
import { convert } from '../src/converter.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'md2html-converter-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('convert', () => {
  it('converts a simple Markdown file to HTML', async () => {
    const inputPath = join(tmpDir, 'test.md');
    await fsWrite(inputPath, '# Hello World', 'utf-8');

    const result = await convert(inputPath);

    expect(result.inputPath).toBe(inputPath);
    expect(result.outputPath).toMatch(/test\.html$/);

    const html = await fsRead(result.outputPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<h1>Hello World</h1>');
    expect(html).toContain('<title>test</title>');
  });

  it('writes to an explicit output path', async () => {
    const inputPath = join(tmpDir, 'input.md');
    const outputPath = join(tmpDir, 'custom-output.html');
    await fsWrite(inputPath, '## Subtitle', 'utf-8');

    const result = await convert(inputPath, outputPath);

    expect(result.outputPath).toBe(outputPath);
    const html = await fsRead(outputPath, 'utf-8');
    expect(html).toContain('<h2>Subtitle</h2>');
  });

  it('creates output directory if it does not exist', async () => {
    const inputPath = join(tmpDir, 'input.md');
    const outputPath = join(tmpDir, 'nested', 'dir', 'output.html');
    await fsWrite(inputPath, 'Plain text', 'utf-8');

    await convert(inputPath, outputPath);

    const html = await fsRead(outputPath, 'utf-8');
    expect(html).toContain('<p>Plain text</p>');
  });

  it('produces a valid HTML5 document structure', async () => {
    const inputPath = join(tmpDir, 'doc.md');
    await fsWrite(inputPath, '# Title\n\nParagraph text.', 'utf-8');

    const result = await convert(inputPath);
    const html = await fsRead(result.outputPath, 'utf-8');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta charset="UTF-8">');
    expect(html).toContain('</html>');
  });

  it('throws a descriptive error for missing input file', async () => {
    await expect(convert(join(tmpDir, 'nonexistent.md'))).rejects.toThrow('File not found');
  });

  it('handles a full-featured Markdown document', async () => {
    const md = [
      '# My Document',
      '',
      'This is **bold** and *italic*.',
      '',
      'Visit [Example](https://example.com).',
      '',
      '```js',
      'const x = 42;',
      '```',
      '',
      'Use `inline code` here.',
    ].join('\n');

    const inputPath = join(tmpDir, 'full.md');
    await fsWrite(inputPath, md, 'utf-8');

    const result = await convert(inputPath);
    const html = await fsRead(result.outputPath, 'utf-8');

    expect(html).toContain('<h1>My Document</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<a href="https://example.com">Example</a>');
    expect(html).toContain('<pre><code class="language-js">');
    expect(html).toContain('<code>inline code</code>');
  });
});
