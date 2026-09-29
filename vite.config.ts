import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works under any GitHub Pages subpath (/<repo>/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
