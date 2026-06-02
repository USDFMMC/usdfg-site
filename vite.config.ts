import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
// Root-relative base so built JS/CSS resolve as /assets/* on deep links (e.g. /admin/disputes).
export default defineConfig({
  base: '/',
  // Pin the dev server to a single origin so the Firebase API key only needs one
  // whitelisted referrer (http://127.0.0.1:5173). strictPort fails fast instead of
  // silently shifting to 5174, which would be blocked by the key's referrer rules.
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    target: ['es2020', 'firefox90', 'chrome90', 'safari14'],
  },
  optimizeDeps: {
    include: [
      '@solana/web3.js',
      '@solana/wallet-adapter-base',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-react-ui',
      '@solana/wallet-adapter-phantom',
      '@solana/wallet-adapter-solflare',
      'borsh',
    ],
  },
  plugins: [nodePolyfills({ include: ['stream'], globals: { Buffer: true, process: true } }), inspectAttr(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
