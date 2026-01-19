/**
 * USDFG Smart Contract Configuration (Devnet)
 * 
 * This file contains all the addresses and configuration needed to interact
 * with the USDFG smart contract on Solana devnet.
 */

import { PublicKey } from '@solana/web3.js';

// Smart Contract Program ID (deployed on devnet) - DEPLOYED VIA PLAYGROUND
// Old contract: 2KL4BKvUtDmABvuvRopkCEb33myWM1W9BGodAZ82RWDT
// Previous: 9NBcMx3x8EotQi63fukhXpYbcBRgyWj6PcEFyEaL9oqo (had authority bug)
// Previous: DX4C2FyAKSiycDVSoYgm7WyDgmPNTdBKbvVDyKGGH6wK (had per-challenge authority fix but reward claim expiration)
// Previous: 3UCz8aURYFXUqNWgHDfbiRziVKjPB8G7BYrgj93MyHUp (old intent-first version)
// LATEST: New intent-first flow - NO payment during challenge creation
// Deployed via Solana Playground: FXxGzstg3FXqfbX5DRKTabf518SBWRP5d2zumbCim5WP
export const PROGRAM_ID = new PublicKey('FXxGzstg3FXqfbX5DRKTabf518SBWRP5d2zumbCim5WP');

// Admin wallet address
export const ADMIN_WALLET = new PublicKey('3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd');

// USDFG Token Mint Address (21M fixed supply, no mint/freeze authority)
export const USDFG_MINT = new PublicKey('7iGZRCHmVTFt9kRn5bc9C2cvDGVp2ZdDYUQsiRfDuspX');

// PDA Seeds (used to derive program-derived addresses)
// NOTE: Deployed contract uses 'escrow_wallet' seed (ESCROW_WALLET_SEED)
export const SEEDS = {
  ADMIN: Buffer.from('admin'),
  CHALLENGE: Buffer.from('challenge'),
  ESCROW_WALLET: Buffer.from('escrow_wallet'), // Used in deployed contract (ESCROW_WALLET_SEED)
  ESCROW_AUTHORITY: Buffer.from('escrow_authority'), // Legacy, not used in deployed contract
} as const;

// Challenge configuration
export const CHALLENGE_CONFIG = {
  MIN_ENTRY_FEE: 0.000000001, // 0.000000001 USDFG minimum (1 lamport - smallest unit, like 1 satoshi in Bitcoin)
  MAX_ENTRY_FEE: 1000, // 1000 USDFG maximum (matches contract: 1_000_000_000_000 lamports)
  DISPUTE_TIMER: 7200, // 2 hours in seconds (matches contract)
  MAX_PLAYERS: 8,
} as const;

// Token decimals
export const USDFG_DECIMALS = 9;

/**
 * Convert USDFG amount to lamports (smallest unit)
 * Example: 10 USDFG = 10_000_000_000 lamports
 */
export function usdfgToLamports(amount: number): number {
  return Math.floor(amount * Math.pow(10, USDFG_DECIMALS));
}

/**
 * Convert lamports to USDFG amount
 * Example: 10_000_000_000 lamports = 10 USDFG
 */
export function lamportsToUsdfg(lamports: number): number {
  return lamports / Math.pow(10, USDFG_DECIMALS);
}

