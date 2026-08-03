import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['client/**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      // Paramètres d'injection (rng, horloge, config) utilisés progressivement
      // au fil des tickets : seules les variables locales inutilisées comptent.
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
    },
  },
);
