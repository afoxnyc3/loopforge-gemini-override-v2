/**
 * src/watcher.js
 * Wraps chokidar to watch a file for changes.
 * Debounces rapid changes with a 100ms window.
 * Logs events to stderr.
 */

import chokidar from 'chokidar';

const DEBOUNCE_MS = 100;

/**
 * Watches a file for changes and calls onChange on each debounced change event.
 *
 * @param {string} filePath — path to the file to watch
 * @param {(filePath: string) => void | Promise<void>} onChange — callback invoked on change
 * @returns {{ close: () => Promise<void> }} handle with a close() method
 */
export function watch(filePath, onChange) {
  let debounceTimer = null;

  const watcher = chokidar.watch(filePath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
  });

  const handleChange = (changedPath) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      process.stderr.write(`[md2html] File changed: ${changedPath}\n`);
      try {
        await onChange(changedPath);
      } catch (err) {
        process.stderr.write(`[md2html] Error processing change: ${err.message}\n`);
      }
    }, DEBOUNCE_MS);
  };

  watcher
    .on('change', handleChange)
    .on('add', handleChange)
    .on('error', (err) => {
      process.stderr.write(`[md2html] Watcher error: ${err.message}\n`);
    });

  process.stderr.write(`[md2html] Watching: ${filePath}\n`);

  return {
    /**
     * Stops the file watcher.
     * @returns {Promise<void>}
     */
    close: async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await watcher.close();
      process.stderr.write(`[md2html] Stopped watching: ${filePath}\n`);
    },
  };
}
