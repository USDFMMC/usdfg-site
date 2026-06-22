/**
 * Centralized RPC Configuration
 *
 * Use environment variable VITE_SOLANA_RPC_ENDPOINT for custom RPC
 * Falls back to public devnet (rate-limited)
 */

import { clusterApiUrl } from '@solana/web3.js';

const PUBLIC_DEVNET_ENDPOINT = clusterApiUrl('devnet');

/** Redact query params (e.g. api-key) for safe console output */
function formatRpcEndpointForLog(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    const base = `${url.origin}${url.pathname.replace(/\/$/, '')}`;
    if (url.search) {
      return `${base}/…`;
    }
    return endpoint.length > 48 ? `${endpoint.slice(0, 45)}…` : endpoint;
  } catch {
    return `${endpoint.slice(0, 30)}…`;
  }
}

function resolveRpcEndpoint(): string {
  const customRpc = import.meta.env.VITE_SOLANA_RPC_ENDPOINT?.trim();
  if (customRpc) {
    return customRpc;
  }
  return PUBLIC_DEVNET_ENDPOINT;
}

let cachedEndpoint: string | null = null;

/**
 * Get the Solana RPC endpoint
 * Priority:
 * 1. Custom RPC from environment variable (recommended for production)
 * 2. Public devnet (rate-limited - development only)
 *
 * To use a custom RPC, add to .env:
 * VITE_SOLANA_RPC_ENDPOINT=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
 *
 * Free RPC providers:
 * - Helius: https://www.helius.dev/ (100k requests/day free)
 * - QuickNode: https://www.quicknode.com/ (generous free tier)
 * - Alchemy: https://www.alchemy.com/ (300M compute units/month free)
 */
export function getRpcEndpoint(): string {
  if (!cachedEndpoint) {
    cachedEndpoint = resolveRpcEndpoint();
  }
  return cachedEndpoint;
}

/**
 * Get the cluster name for display purposes
 */
export function getClusterName(): string {
  const customRpc = import.meta.env.VITE_SOLANA_RPC_ENDPOINT?.trim();

  if (customRpc) {
    if (customRpc.includes('mainnet')) return 'mainnet-beta';
    if (customRpc.includes('testnet')) return 'testnet';
    if (customRpc.includes('devnet')) return 'devnet';
    return 'custom';
  }

  return 'devnet';
}

// Startup log (once per page load when this module is imported)
const customRpcAtStartup = import.meta.env.VITE_SOLANA_RPC_ENDPOINT?.trim();
if (customRpcAtStartup) {
  console.info(
    `✅ Using custom RPC endpoint: ${formatRpcEndpointForLog(customRpcAtStartup)}`
  );
} else {
  console.warn('⚠️ Using public Solana devnet RPC');
}
