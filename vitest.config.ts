import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Alguns módulos (ex.: supabaseClient) usam window/localStorage ao serem importados
    environment: 'happy-dom',
  },
});
