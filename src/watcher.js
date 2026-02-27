/**
 * src/watcher.js
 * Wraps chokidar to watch a file for changes.
 * Debounces rapid changes at 100ms.
 * All exports are named. Pure ESM.
 */

import chokidar from 'chokidar';

/**
 * Watch a file for changes and invoke a callback on each change event.
 * Uses chokidar with polling disabled (native fs events) and a 100ms
 * debounce to avoid firing multiple times for a single save.
 *
 * @param {string} filePath — path to the file to watch
 * @param {function(string): void} onChange — callback invoked with the
 *   file path whenever a change is detected
 * @returns {{ close: function(): Promise<void> }} watcher handle
 *
 * @example
 * const handle = watch('README.md', (fp) => convert(fp));
 * // later:
 * await handle.close();
 */
export function watch(filePath, onChange) {
  let debounceTimer = null;

  const watcher = chokidar.watch(filePath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  const handleChange = (changedPath) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      process.stderr.write(`[md2html] Change detected: ${changedPath}\n`);
      onChange(changedPath);
      debounceTimer = null;
    }, 100);
  };

  watcher
    .on('change', handleChange)
    .on('error', (err) => {
      process.stderr.write(`[md2html] Watcher error: ${err.message}\n`);
    });

  process.stderr.write(`[md2html] Watching ${filePath} for changes...\n`);

  return {
    /**
     * Stop watching the file and clean up resources.
     * @returns {Promise<void>}
     */
    close: async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await watcher.close();
      process.stderr.write(`[md2html] Stopped watching ${filePath}.\n`);
    },
  };
}
