/**
 * USDFG Smart Contract Configuration (Devnet)
 * 
 * This file contains all the addresses and configuration needed to interact
 * with the USDFG smart contract on Solana devnet.
 */

import { PublicKey } from '@solana/web3.js';

// Smart Contract Program ID (deployed on devnet) - UPDATED v2
export const PROGRAM_ID = new PublicKey('2KL4BKvUtDmABvuvRopkCEb33myWM1W9BGodAZ82RWDT');

// Admin wallet address (can update oracle)
export const ADMIN_WALLET = new PublicKey('3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd');

// USDFG Token Mint Address (21M fixed supply, no mint/freeze authority)
export const USDFG_MINT = new PublicKey('7iGZRCHmVTFt9kRn5bc9C2cvDGVp2ZdDYUQsiRfDuspX');

// PDA Seeds (used to derive program-derived addresses)
export const SEEDS = {
  ADMIN: Buffer.from('admin'),
  PRICE_ORACLE: Buffer.from('price_oracle'),
  CHALLENGE: Buffer.from('challenge'),
  ESCROW_WALLET: Buffer.from('escrow_wallet'),
} as const;

// Challenge configuration
export const CHALLENGE_CONFIG = {
  MIN_ENTRY_FEE: 1, // 1 USDFG minimum
  MAX_ENTRY_FEE: 1000, // 1000 USDFG maximum
  DISPUTE_TIMER: 900, // 15 minutes in seconds
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

