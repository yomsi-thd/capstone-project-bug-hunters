import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    // Scoped to src/ from 2026-08-26, when the backend grew a test suite of its own.
    // Vitest's default pattern is the whole repo, so this runner was picking up
    // backend/test/*.test.js and running Express + Postgres tests in jsdom with no
    // database — 12 files failing for a reason that had nothing to do with them.
    // The backend has its own runner and its own config: `cd backend && npm test`.
    include: ['src/**/*.test.{js,jsx}'],
  },
})