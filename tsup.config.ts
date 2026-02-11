import { defineConfig } from 'tsup';

export default defineConfig([
  // Core bundle
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    splitting: false,
  },
  // React bundle
  {
    entry: ['src/react/index.ts'],
    outDir: 'dist/react',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    external: ['react', '@cleverence-edge/js-sdk'],
  },
  // Vue bundle
  {
    entry: ['src/vue/index.ts'],
    outDir: 'dist/vue',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    external: ['vue', '@cleverence-edge/js-sdk'],
  },
]);
