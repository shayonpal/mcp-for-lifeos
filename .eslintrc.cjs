module.exports = {
  root: true,
  env: {
    es2023: true,
    node: true,
    jest: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [],
  ignorePatterns: [
    'dist/',
    'docs/',
    'config-examples/',
    'public/',
    'scripts/',
    'tests/',
    'dev/',
    '**/*.js'
  ],
  rules: {}
};
