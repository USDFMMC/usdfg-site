import path from "path"
import { execSync } from "node:child_process"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { validateProductionSolanaEnv } from './vite-plugin-validate-production-env'

function resolveBuildCommit(): string {
  const fromEnv =
    process.env.VITE_DEPLOY_COMMIT?.trim() ||
    process.env.CF_PAGES_COMMIT_SHA?.trim()
  if (fromEnv) return fromEnv.slice(0, 12)
  try {
    return execSync("git rev-parse --short=12 HEAD", { encoding: "utf8" }).trim()
  } catch {
    return "unknown"
  }
}

const usdfgBuildCommit = resolveBuildCommit()

// https://vite.dev/config/
// Root-relative base so built JS/CSS resolve as /assets/* on deep links (e.g. /admin/disputes).
export default defineConfig({
  define: {
    __USDFG_BUILD_COMMIT__: JSON.stringify(usdfgBuildCommit),
  },
  base: '/',
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
  plugins: [
    validateProductionSolanaEnv(),
    nodePolyfills({ include: ['stream'], globals: { Buffer: true, process: true } }),
    inspectAttr(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
