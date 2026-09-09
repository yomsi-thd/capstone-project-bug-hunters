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
    // Scoped to src/. Vitest's default pattern is the whole repo, so this runner
    // picked up backend/test/*.test.js and ran Express + Postgres tests in jsdom with
    // no database. The backend has its own runner: `cd backend && npm test`.
    include: ['src/**/*.test.{js,jsx}'],
  },
})