import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path:
// - GitHub Actions (Pages deploy): '/Detox-Timer/'
// - Local dev / Capacitor Android:  './'
const base = process.env.GITHUB_ACTIONS ? '/Detox-Timer/' : './';

export default defineConfig({
  plugins: [react()],
  base,
})
