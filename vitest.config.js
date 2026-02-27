import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
    },
  },
});
