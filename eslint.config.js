import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // backend/ and scripts/ are CommonJS on Node (require/module/process) — this config
  // targets browser ESM, so linting them here produces only false `no-undef` noise.
  // scripts/ holds the manual test scripts (see scripts/README.md); it is git-ignored,
  // but eslint has its own ignore list and does not read .git/info/exclude, so adding
  // the folder without this line turns `npm run lint` red.
  globalIgnores(['dist', 'backend', 'scripts']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
