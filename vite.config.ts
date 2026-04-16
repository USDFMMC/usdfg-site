import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  base: './',
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
