/**
 * Centralized Solana / USDFG environment configuration.
 *
 * Defaults to devnet for local dev, staging, and preview builds.
 * Production guard (Vite): fails build only when VITE_APP_ENV=production and cluster is devnet.
 *
 * Override via .env / Cloudflare environment variables — see .env.example.
 */

import { PublicKey } from '@solana/web3.js';

export type SolanaCluster = 'devnet' | 'mainnet-beta' | 'testnet';

export type AppEnvironment = 'development' | 'staging' | 'production';

/** Devnet deployment defaults (current Playground program). */
const DEVNET_DEFAULTS = {
  programId: 'FXxGzstg3FXqfbX5DRKTabf518SBWRP5d2zumbCim5WP',
  mint: '7iGZRCHmVTFt9kRn5bc9C2cvDGVp2ZdDYUQsiRfDuspX',
  adminWallet: '3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd',
  platformWallet: 'AcEV5t9TJdZP91ttbgKieWoWUxwUb4PT4MxvggDjjkkq',
} as const;

function parseAppEnvironment(raw: string | undefined): AppEnvironment {
  const v = raw?.trim().toLowerCase();
  if (v === 'production' || v === 'prod') return 'production';
  if (v === 'staging' || v === 'preview') return 'staging';
  return 'development';
}

function parseSolanaCluster(raw: string | undefined): SolanaCluster {
  const v = raw?.trim().toLowerCase();
  if (v === 'mainnet-beta' || v === 'mainnet') return 'mainnet-beta';
  if (v === 'testnet') return 'testnet';
  return 'devnet';
}

function readPublicKey(envValue: string | undefined, fallback: string, label: string): PublicKey {
  const value = envValue?.trim() || fallback;
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`[environment] Invalid ${label}: ${value}`);
  }
}

export const appEnvironment: AppEnvironment = parseAppEnvironment(
  import.meta.env.VITE_APP_ENV
);

/** Active Solana cluster — defaults to devnet when unset. */
export const solanaCluster: SolanaCluster = parseSolanaCluster(
  import.meta.env.VITE_SOLANA_CLUSTER
);

export const isDevnet = solanaCluster === 'devnet';
export const isMainnet = solanaCluster === 'mainnet-beta';
export const isProductionAppEnv = appEnvironment === 'production';

/** @deprecated Prefer `solanaCluster`; kept for existing imports. */
export const SOLANA_CLUSTER = solanaCluster;

export const PROGRAM_ID = readPublicKey(
  import.meta.env.VITE_USDFG_PROGRAM_ID,
  DEVNET_DEFAULTS.programId,
  'VITE_USDFG_PROGRAM_ID'
);

export const USDFG_MINT = readPublicKey(
  import.meta.env.VITE_USDFG_MINT,
  DEVNET_DEFAULTS.mint,
  'VITE_USDFG_MINT'
);

export const ADMIN_WALLET = readPublicKey(
  import.meta.env.VITE_USDFG_ADMIN_WALLET,
  DEVNET_DEFAULTS.adminWallet,
  'VITE_USDFG_ADMIN_WALLET'
);

export const PLATFORM_WALLET = readPublicKey(
  import.meta.env.VITE_USDFG_PLATFORM_WALLET,
  DEVNET_DEFAULTS.platformWallet,
  'VITE_USDFG_PLATFORM_WALLET'
);

/** Phantom universal-link `cluster` query param. */
export function getPhantomClusterParam(): string {
  return solanaCluster === 'mainnet-beta' ? 'mainnet-beta' : solanaCluster;
}

/** Solana Explorer `cluster` query suffix (empty on mainnet). */
export function getExplorerClusterQuery(): string {
  if (solanaCluster === 'mainnet-beta') return '';
  return `?cluster=${solanaCluster}`;
}

export function getExplorerTxUrl(signature: string): string {
  if (!signature?.trim()) return '';
  const base = `https://explorer.solana.com/tx/${signature.trim()}`;
  const q = getExplorerClusterQuery();
  return q ? `${base}${q}` : base;
}

export function getExplorerAddressUrl(address: string): string {
  if (!address?.trim()) return '';
  const base = `https://explorer.solana.com/address/${address.trim()}`;
  const q = getExplorerClusterQuery();
  return q ? `${base}${q}` : base;
}
