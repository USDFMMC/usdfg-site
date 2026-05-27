/**
 * Solana RPC endpoint resolution (environment-driven).
 */

import { clusterApiUrl } from '@solana/web3.js';
import { solanaCluster } from './environment';

export function getRpcEndpoint(): string {
  const customRpc = import.meta.env.VITE_SOLANA_RPC_ENDPOINT?.trim();
  if (customRpc) {
    if (import.meta.env.DEV) {
      console.log(`✅ Using custom RPC (${solanaCluster})`);
    }
    return customRpc;
  }

  if (import.meta.env.DEV) {
    console.warn(
      `⚠️ Using public ${solanaCluster} RPC (rate-limited). Set VITE_SOLANA_RPC_ENDPOINT for a dedicated endpoint.`
    );
  }
  return clusterApiUrl(solanaCluster);
}

/** Cluster label for UI / logging. */
export function getClusterName(): string {
  const customRpc = import.meta.env.VITE_SOLANA_RPC_ENDPOINT?.trim();
  if (customRpc) {
    if (customRpc.includes('mainnet')) return 'mainnet-beta';
    if (customRpc.includes('testnet')) return 'testnet';
    if (customRpc.includes('devnet')) return 'devnet';
    return 'custom';
  }
  return solanaCluster;
}
