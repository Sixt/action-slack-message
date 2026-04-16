const tseslint = require('typescript-eslint');
const prettier = require('eslint-plugin-prettier');
const jest = require('eslint-plugin-jest');

module.exports = tseslint.config(
  {
    ignores: ['**/coverage/**', '**/dist/**', '**/lib/**', '**/node_modules/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/__tests__/**/*.ts'],
    plugins: {
      jest,
    },
    ...jest.configs['flat/recommended'],
    rules: {
      ...jest.configs['flat/recommended'].rules,
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
