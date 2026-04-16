/**
 * Centralized RPC Configuration
 * 
 * Use environment variable VITE_SOLANA_RPC_ENDPOINT for custom RPC
 * Falls back to public devnet (rate-limited)
 */

import { clusterApiUrl } from '@solana/web3.js';

/**
 * Get the Solana RPC endpoint
 * Priority:
 * 1. Custom RPC from environment variable (recommended for production)
 * 2. Public devnet (rate-limited - development only)
 * 
 * To use a custom RPC, add to .env:
 * VITE_SOLANA_RPC_ENDPOINT=https://your-rpc-endpoint.com
 * 
 * Free RPC providers:
 * - Helius: https://www.helius.dev/ (100k requests/day free)
 * - QuickNode: https://www.quicknode.com/ (generous free tier)
 * - Alchemy: https://www.alchemy.com/ (300M compute units/month free)
 */
export function getRpcEndpoint(): string {
  // Check for custom RPC in environment
  const customRpc = import.meta.env.VITE_SOLANA_RPC_ENDPOINT;
  
  if (customRpc) {
    console.log('✅ Using custom RPC endpoint');
    return customRpc;
  }
  
  // Fallback to public devnet (rate-limited)
  console.warn('⚠️ Using public devnet RPC (rate-limited). Consider using a custom RPC for production.');
  return clusterApiUrl('devnet');
}

/**
 * Get the cluster name for display purposes
 */
export function getClusterName(): string {
  const customRpc = import.meta.env.VITE_SOLANA_RPC_ENDPOINT;
  
  if (customRpc) {
    if (customRpc.includes('mainnet')) return 'mainnet-beta';
    if (customRpc.includes('testnet')) return 'testnet';
    if (customRpc.includes('devnet')) return 'devnet';
    return 'custom';
  }
  
  return 'devnet';
}

