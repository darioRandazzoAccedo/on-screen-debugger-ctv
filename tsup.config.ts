import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';
import { compile } from 'sass';
import postcss from 'postcss';
import postcssModules from 'postcss-modules';

function sassCssModulesPlugin(): Plugin {
  return {
    name: 'sass-css-modules',
    setup(build) {
      build.onLoad({ filter: /\.scss$/ }, async args => {
        // Compile Sass — handles @use, @forward, and relative imports automatically
        const { css: sassCSS } = compile(args.path);

        // Scope class names and produce the dashesOnly camelCase export map
        const localExports: Record<string, string> = {};
        const { css } = await postcss([
          postcssModules({
            localsConvention: 'dashesOnly',
            getJSON: (_, json) => Object.assign(localExports, json),
          }),
        ]).process(sassCSS, { from: args.path });

        // Return a JS module: inject CSS at runtime + export the class name map
        const contents = [
          `var __css__ = ${JSON.stringify(css)};`,
          `if (typeof document !== 'undefined') {`,
          `  var __el__ = document.createElement('style');`,
          `  __el__.textContent = __css__;`,
          `  document.head.appendChild(__el__);`,
          `}`,
          `export default ${JSON.stringify(localExports)};`,
        ].join('\n');

        return { contents, loader: 'js' };
      });
    },
  };
}

const external = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  '@accedo/xdk-core',
  '@accedo/xdk-virtual-key',
];

const outExtension = ({ format }: { format: string }) => ({
  js: format === 'cjs' ? '.cjs' : '.js',
});

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: false,
    sourcemap: true,
    external,
    esbuildPlugins: [sassCssModulesPlugin()],
    outExtension,
  },
  {
    entry: { OnScreenDebugger: 'src/OnScreenDebugger.tsx' },
    format: ['esm', 'cjs'],
    dts: false,
    sourcemap: true,
    external,
    esbuildPlugins: [sassCssModulesPlugin()],
    outExtension,
  },
]);
