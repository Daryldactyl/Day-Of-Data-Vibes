/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Allow Cloudflare quick-tunnel hosts so we can test on real phones over HTTPS.
  // (Vite blocks unknown Host headers by default as DNS-rebinding protection.)
  server: { allowedHosts: ['.trycloudflare.com'] },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
