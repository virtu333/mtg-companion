import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['**/dist/', '**/node_modules/', '**/.turbo/'],
  },

  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules (type-aware not needed — keeps it fast)
  ...tseslint.configs.recommended,

  // Project-wide rule overrides
  {
    rules: {
      // Allow unused vars with underscore prefix (_req, _err, etc.)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // React hooks rules — only for the web app
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
);
