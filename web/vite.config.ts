import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// VITE_BASE is the path the site is served from, e.g. "/nela/" on GitHub Pages.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
})
