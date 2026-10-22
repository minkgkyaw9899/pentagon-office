module.exports = [{
  files: ['**/*.cjs'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
    globals: Object.fromEntries(['Buffer','console','process','__dirname'].map(name => [name,'readonly']))
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-unreachable': 'error',
    'no-constant-condition': 'error',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'valid-typeof': 'error',
    'eqeqeq': 'error'
  }
}];
