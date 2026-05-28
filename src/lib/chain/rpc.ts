/**
 * Solana RPC endpoint resolution (environment-driven).
 */

import { clusterApiUrl } from '@solana/web3.js';
import { solanaCluster } from './environment';

let loggedPublicRpcWarning = false;

export function getRpcEndpoint(): string {
  const customRpc = import.meta.env.VITE_SOLANA_RPC_ENDPOINT?.trim();
  if (customRpc) {
    return customRpc;
  }

  if (!loggedPublicRpcWarning) {
    loggedPublicRpcWarning = true;
    console.warn(
      `[rpc] Using public ${solanaCluster} endpoint (rate-limited). Set VITE_SOLANA_RPC_ENDPOINT to a dedicated devnet RPC in .env / Cloudflare Preview.`
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
