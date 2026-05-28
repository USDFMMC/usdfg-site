/**
 * USDFG on-chain addresses and challenge constants.
 * Cluster, RPC, and explorer URLs: see `./environment`.
 */

import {
  ADMIN_WALLET,
  PLATFORM_WALLET,
  PROGRAM_ID,
  SOLANA_CLUSTER,
  USDFG_MINT,
} from './environment';

export { ADMIN_WALLET, PLATFORM_WALLET, PROGRAM_ID, SOLANA_CLUSTER, USDFG_MINT };

// PDA Seeds (used to derive program-derived addresses)
export const SEEDS = {
  ADMIN: Buffer.from('admin'),
  CHALLENGE: Buffer.from('challenge'),
  ESCROW_WALLET: Buffer.from('escrow_wallet'),
  ESCROW_AUTHORITY: Buffer.from('escrow_authority'),
} as const;

// Challenge configuration
export const CHALLENGE_CONFIG = {
  MIN_ENTRY_FEE: 0.000000001,
  MAX_ENTRY_FEE: 1000,
  DISPUTE_TIMER: 7200,
  MAX_PLAYERS: 8,
} as const;

export const USDFG_DECIMALS = 9;

export function usdfgToLamports(amount: number): number {
  return Math.floor(amount * Math.pow(10, USDFG_DECIMALS));
}

export function lamportsToUsdfg(lamports: number): number {
  return lamports / Math.pow(10, USDFG_DECIMALS);
}
