import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.vite/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'livros/**',
      '.gs42/**',
      '.agents/**',
      '.opencode/**',
      '.hermes/**',
      '.pi/**',
      '.cursor/**',
      'openspec/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['packages/kernel/src/**/*.ts', 'packages/simulation/src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'Use simulation ticks, not wall-clock time.' },
        { name: 'performance', message: 'Use simulation ticks, not wall-clock time.' },
        { name: 'window', message: 'The simulation must stay headless.' },
        { name: 'document', message: 'The simulation must stay headless.' },
        { name: 'localStorage', message: 'The simulation must stay headless.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG.' },
        { object: 'Math', property: 'sin', message: 'Use the direction table or unit vectors.' },
        { object: 'Math', property: 'cos', message: 'Use the direction table or unit vectors.' },
        { object: 'Math', property: 'tan', message: 'Use the direction table or unit vectors.' },
        { object: 'Math', property: 'atan2', message: 'Use the direction table or unit vectors.' },
        { object: 'Math', property: 'exp', message: 'Keep the simulation deterministic.' },
        { object: 'Math', property: 'log', message: 'Keep the simulation deterministic.' },
        { object: 'Math', property: 'pow', message: 'Keep the simulation deterministic.' },
        { object: 'Math', property: 'hypot', message: 'Use Math.sqrt.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'three',
            'three/*',
            'react',
            'react-dom',
            '@prestes/view3d',
            '@prestes/content',
            'node:*',
            'fs',
            'path',
            'os',
          ],
        },
      ],
    },
  },
  {
    files: ['apps/game/src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[A-Za-z]/]',
          message: 'Use the i18n catalog instead of hardcoded JSX text.',
        },
      ],
    },
  },
);
