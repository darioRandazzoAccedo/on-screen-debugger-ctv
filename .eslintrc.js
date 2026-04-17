/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.eslint.json',
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
        devDependencies: ['rollup.config.ts'],
        peerDependencies: true,
      },
    ],

    // Useful general rules
    'no-console': 'warn',
    eqeqeq: ['error', 'always'],
  },
  overrides: [
    {
      // Relax rules in ambient declaration files
      files: ['src/types/**/*.d.ts', '*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/'],
};
