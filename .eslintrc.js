/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: '17' },
    'import/resolver': {
      typescript: { alwaysTryTypes: true },
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier', // must be last — disables formatting rules handled by Prettier
  ],
  rules: {
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

    // React — TypeScript covers prop types
    'react/prop-types': 'off',

    // Imports — allow peer deps and devDeps in build config
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['tsup.config.ts'],
        peerDependencies: true,
      },
    ],

    // Useful general rules
    'no-console': 'warn',
    eqeqeq: ['error', 'always'],
  },
  overrides: [
    {
      // Root-level config files are not part of the src tsconfig — disable
      // project-based type-aware linting so ESLint can still parse them.
      files: ['*.config.ts', '*.config.js'],
      parserOptions: { project: null },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
    {
      // Relax rules in ambient declaration files
      files: ['src/types/**/*.d.ts', '*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'import/no-extraneous-dependencies': 'off',
        'import/no-unresolved': 'off',
      },
    },
    {
      // Debugger / navigation instrumentation — console is intentional
      files: [
        'src/hooks/useOnScreenDebugger.ts',
        'src/navigation/**/*.ts',
        'src/storage.ts',
        'src/store/onScreenDebuggerStore.ts',
      ],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/'],
};
