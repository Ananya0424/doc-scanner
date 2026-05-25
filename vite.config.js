import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ['tesseract.js'],   // ✅ INCLUDE not exclude — tells Vite to pre-bundle it
  },
  // ✅ Needed for tesseract worker files to load correctly
  worker: {
    format: 'es',
  },
})