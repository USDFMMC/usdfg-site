import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react({
      // Optimize React refresh for better HMR
      fastRefresh: true,
    }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/firestore',
      '@solana/web3.js',
      '@solana/wallet-adapter-base',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-react-ui',
      '@solana/wallet-adapter-phantom',
      '@solana/wallet-adapter-solflare',
      '@solana-mobile/wallet-adapter-mobile',
    ],
    exclude: [
      '@coral-xyz/borsh',
      '@coral-xyz/anchor',
    ],
  },
  resolve: {
    alias: {
      "@db": path.resolve(import.meta.dirname, "db"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"), // ✅ explicitly set public directory
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"), // ✅ output directly to dist/
    emptyOutDir: true,
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      safari10: true,
      format: {
        comments: false,
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React and core dependencies - always needed, keep together
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor';
          }
          // Radix UI components - lazy load these
          if (id.includes('@radix-ui')) {
            return 'ui';
          }
          // Solana wallet adapters - can be lazy loaded
          if (id.includes('@solana/wallet-adapter') || id.includes('@solana/web3.js')) {
            return 'wallet';
          }
          // Firebase - can be lazy loaded
          if (id.includes('firebase')) {
            return 'firebase';
          }
          // Large node_modules dependencies
          if (id.includes('node_modules')) {
            return 'vendor-deps';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1', // Use localhost IP instead of 'true' to avoid network interface issues
    strictPort: false, // Allow Vite to use a different port if 5173 is busy
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      // Don't specify port - let Vite use the same port as the dev server
    },
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
    },
  },
});
