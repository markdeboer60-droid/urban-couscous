import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Multi-page web build. base: '/' zorgt voor correcte asset-paden op sub-URLs.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        belastingcodes: resolve(__dirname, 'belastingcodes/index.html'),
      },
    },
  },
})
