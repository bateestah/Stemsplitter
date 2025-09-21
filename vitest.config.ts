import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: '@vitest/environment-jsdom',
      setupFiles: ['./src/tests/setupTests.ts'],
      globals: true,
      clearMocks: true
    }
  })
);
