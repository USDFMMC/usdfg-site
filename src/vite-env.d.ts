/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_ORIGIN?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_SOLANA_CLUSTER?: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_SOLANA_RPC_ENDPOINT?: string;
  readonly VITE_USDFG_PROGRAM_ID?: string;
  readonly VITE_USDFG_MINT?: string;
  readonly VITE_USDFG_ADMIN_WALLET?: string;
  readonly VITE_USDFG_PLATFORM_WALLET?: string;
  /** Optional Cloudflare Preview labels (e.g. $CF_PAGES_BRANCH in build env). */
  readonly VITE_DEPLOY_BRANCH?: string;
  readonly VITE_DEPLOY_COMMIT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by vite.config.ts `define` at build time. */
declare const __USDFG_BUILD_COMMIT__: string;
