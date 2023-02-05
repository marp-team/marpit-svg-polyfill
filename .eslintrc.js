module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  parser: '@babel/eslint-parser',
  parserOptions: {
    babelOptions: {
      plugins: [require.resolve('@babel/plugin-syntax-import-assertions')],
    },
    requireConfigFile: false,
  },
  rules: {
    'import/order': ['error', { alphabetize: { order: 'asc' } }],
  },
  settings: {
    'import/ignore': ['@rollup/plugin-node-resolve'],
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript',
        'prettier',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
  ],
}
