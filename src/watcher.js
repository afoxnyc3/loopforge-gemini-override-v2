/**
 * src/watcher.js
 * Wraps chokidar to watch a file for changes.
 * Debounces rapid changes (100ms) and logs events to stderr.
 */

import chokidar from 'chokidar';

/**
 * Watches a file for changes and calls onChange when the file is modified.
 * Debounces rapid changes with a 100ms window.
 * Logs watch events to stderr.
 *
 * @param {string} filePath - Path to the file to watch
 * @param {(filePath: string) => void} onChange - Callback invoked on file change
 * @returns {{ close: () => Promise<void> }} - Handle to stop watching
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

  watcher.on('ready', () => {
    process.stderr.write(`[md2html] Watching for changes: ${filePath}\n`);
  });

  watcher.on('change', (changedPath) => {
    process.stderr.write(`[md2html] Change detected: ${changedPath}\n`);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      onChange(changedPath);
    }, 100);
  });

  watcher.on('error', (err) => {
    process.stderr.write(`[md2html] Watcher error: ${err.message}\n`);
  });

  return {
    /**
     * Stops the file watcher and cleans up resources.
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
