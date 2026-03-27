import { defineConfig } from 'tsup';
import { sassPlugin } from 'esbuild-sass-plugin';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    '@accedo/xdk-core',
    '@accedo/xdk-virtual-key',
  ],
  esbuildPlugins: [sassPlugin()],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
