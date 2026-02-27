#!/usr/bin/env node
/**
 * bin/md2html.js
 * CLI entry point for the md2html Markdown converter.
 * Uses commander for argument parsing.
 */

import { program } from 'commander';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { convert } from '../src/converter.js';
import { watch } from '../src/watcher.js';
import { fileExists, deriveOutputPath } from '../src/fileHandler.js';

// Resolve package.json for version
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

program
  .name('md2html')
  .description('Convert Markdown files to HTML')
  .version(pkg.version, '-V, --version', 'output the current version')
  .argument('<input>', 'path to the input Markdown file')
  .option('-o, --output <path>', 'output file path (default: derived from input)')
  .option('-w, --watch', 'watch for file changes and recompile automatically')
  .action(async (input, options) => {
    const inputPath = resolve(input);

    // Validate input file exists
    const exists = await fileExists(inputPath);
    if (!exists) {
      process.stderr.write(`Error: Input file not found: ${inputPath}\n`);
      process.exit(1);
    }

    // Validate .md extension
    if (!inputPath.endsWith('.md')) {
      process.stderr.write(`Warning: Input file does not have a .md extension: ${inputPath}\n`);
    }

    const outputPath = options.output ? resolve(options.output) : deriveOutputPath(inputPath);

    // Perform initial conversion
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
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
