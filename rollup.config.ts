import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

const external = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  '@accedo/xdk-core',
  '@accedo/xdk-virtual-key',
];

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.js',  format: 'esm', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', sourcemap: true },
    ],
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.build.json' }),
      postcss({
        modules: true,
        inject: true,
        use: ['sass'],
      }),
    ],
  },
  {
    input: 'src/OnScreenDebugger.tsx',
    output: [
      { file: 'dist/OnScreenDebugger.js',  format: 'esm', sourcemap: true },
      { file: 'dist/OnScreenDebugger.cjs', format: 'cjs', exports: 'auto', sourcemap: true },
    ],
    external,
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.build.json' }),
      postcss({
        modules: true,
        extract: false,
        use: ['sass'],
      }),
    ],
  },
];