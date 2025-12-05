import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react({
      // Optimize React refresh for better HMR
      fastRefresh: true,
    }),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'sitemap.xml'],
      manifest: {
        name: 'USDFG Arena - Gaming Platform',
        short_name: 'USDFG Arena',
        description: 'Skill-based crypto gaming platform. Compete, earn $USDFG, and prove your gaming prowess.',
        theme_color: '#0B0F1A',
        background_color: '#0B0F1A',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/app',
        icons: [
          {
            src: '/assets/usdfg-144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/assets/usdfg-logo-transparent.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/usdfg-logo-transparent.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        // Exclude large image files from precaching (they'll be cached at runtime)
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
        // Exclude large PNG/WebP files from precaching
        globIgnores: [
          '**/usdfg-og-banner*.png',
          '**/trophies/*.png',
          '**/categories/*.png',
          '**/ads/*.webp',
          '**/ads/*.png'
        ],
        // Increase file size limit for precaching (for other assets)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        // Don't cache JS bundles aggressively - ensure fresh code loads
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(js|css)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-css-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            // Cache large images at runtime (not precached)
            urlPattern: /\.(png|jpg|jpeg|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /\.(woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disable in dev to avoid conflicts
      }
    }),
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
      strictRequires: true,
      esmExternals: true,
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
          // Solana wallet adapters - keep with vendor to avoid loading order issues
          // Don't split wallet adapters separately as they depend on vendor modules
          if (id.includes('@solana/wallet-adapter') || id.includes('@solana/web3.js')) {
            return 'vendor'; // Keep with vendor to ensure proper load order
          }
          // Firebase - can be lazy loaded
          if (id.includes('firebase')) {
            return 'firebase';
          }
          // Don't create a separate vendor-deps chunk - it causes module loading issues
          // Let Vite handle other node_modules automatically
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
