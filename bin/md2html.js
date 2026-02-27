#!/usr/bin/env node
/**
 * bin/md2html.js
 * CLI entry point for the md2html Markdown-to-HTML converter.
 * Uses commander for argument parsing.
 */

import { program } from 'commander';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { convert } from '../src/converter.js';
import { fileExists } from '../src/fileHandler.js';
import { watch } from '../src/watcher.js';

// Resolve package.json for version string
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

program
  .name('md2html')
  .description('Convert Markdown files to HTML')
  .version(pkg.version, '-V, --version', 'output the current version')
  .argument('<input>', 'path to the input Markdown file')
  .argument('[output]', 'path to the output HTML file (default: derived from input)')
  .option('-w, --watch', 'watch the input file and recompile on changes')
  .helpOption('-h, --help', 'display help for command')
  .action(async (input, output, options) => {
    const inputPath = resolve(input);

    // Validate input file exists
    const exists = await fileExists(inputPath);
    if (!exists) {
      process.stderr.write(`Error: Input file not found: ${inputPath}\n`);
      process.exit(1);
    }

    // Validate input is a .md file
    if (!inputPath.toLowerCase().endsWith('.md')) {
      process.stderr.write(`Warning: Input file does not have a .md extension: ${inputPath}\n`);
    }

    const outputPath = output ? resolve(output) : undefined;

    // Initial conversion
    try {
      const result = await convert(inputPath, outputPath);
      process.stdout.write(`Converted: ${result.inputPath} → ${result.outputPath}\n`);
    } catch (err) {
      process.stderr.write(`Error during conversion: ${err.message}\n`);
      process.exit(1);
    }

    // Watch mode
    if (options.watch) {
      const handle = watch(inputPath, async (changedPath) => {
        try {
          const result = await convert(changedPath, outputPath);
          process.stdout.write(`Recompiled: ${result.inputPath} → ${result.outputPath}\n`);
        } catch (err) {
          process.stderr.write(`Error during recompile: ${err.message}\n`);
          // Don't exit in watch mode — keep watching
        }
      });

      // Graceful shutdown
      const shutdown = async () => {
        await handle.close();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    }
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`Unexpected error: ${err.message}\n`);
  process.exit(1);
});
