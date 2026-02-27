/**
 * src/cli.js
 * Commander-based CLI interface for md2html.
 * Handles argument parsing, validation, conversion, and watch mode.
 */

import { program } from 'commander';
import { resolve } from 'node:path';
import { fileExists } from './fileHandler.js';
import { convert } from './converter.js';
import { watch } from './watcher.js';
import { createRequire } from 'node:module';

// Read version from package.json
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

program
  .name('md2html')
  .description('Convert Markdown files to HTML')
  .version(pkg.version, '-V, --version', 'Output the current version')
  .argument('<input>', 'Path to the Markdown file to convert')
  .option('-o, --output <path>', 'Output file path (default: same dir as input, .html extension)')
  .option('-w, --watch', 'Watch the input file for changes and recompile automatically')
  .helpOption('-h, --help', 'Display help information')
  .action(async (input, options) => {
    const inputPath = resolve(input);

    // Validate input file exists
    const exists = await fileExists(inputPath);
    if (!exists) {
      process.stderr.write(`Error: Input file not found: ${inputPath}\n`);
      process.exit(1);
    }

    // Validate .md extension
    if (!inputPath.toLowerCase().endsWith('.md')) {
      process.stderr.write(`Warning: Input file does not have a .md extension: ${inputPath}\n`);
    }

    const outputPath = options.output ? resolve(options.output) : undefined;

    /**
     * Runs a single conversion and reports results.
     */
    const runConvert = async () => {
      try {
        const result = await convert(inputPath, outputPath);
        process.stdout.write(`Converted: ${result.inputPath} → ${result.outputPath}\n`);
      } catch (err) {
        process.stderr.write(`Error: ${err.message}\n`);
        if (!options.watch) {
          process.exit(1);
        }
      }
    };

    // Initial conversion
    await runConvert();

    // Watch mode
    if (options.watch) {
      const handle = watch(inputPath, async () => {
        await runConvert();
      });

      // Graceful shutdown on SIGINT / SIGTERM
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
