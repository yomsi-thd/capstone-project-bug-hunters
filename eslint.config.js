import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // backend/ and scripts/ are CommonJS on Node (require/module/process). This config
  // targets browser ESM, so linting them here only produces false `no-undef` errors.
  // scripts/ is git-ignored, but eslint keeps its own ignore list and does not read
  // .git/info/exclude, so without this line `npm run lint` goes red.
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
