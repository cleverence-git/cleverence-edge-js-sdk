import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Point to the SDK source for development
      // Order matters - more specific paths first
      {
        find: '@cleverence/edge-js-sdk/react',
        replacement: path.resolve(__dirname, '../../src/react/index.ts'),
      },
      {
        find: '@cleverence/edge-js-sdk',
        replacement: path.resolve(__dirname, '../../src/index.ts'),
      },
    ],
  },
  server: {
    port: 3000,
    host: true, // Allow access from network (for testing on mobile)
  },
});
