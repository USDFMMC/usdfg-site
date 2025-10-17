# 🐛 Instruction Discriminator Issue

## Problem

The frontend is getting `InstructionFallbackNotFound` because it's using **hardcoded instruction discriminators** instead of deriving them from the IDL.

## Current Code (contract.ts lines 146-150)

```typescript
const instructionData = Buffer.alloc(8 + 8); // discriminator + entry_fee
// Hardcoded discriminator for "global:create_challenge"
instructionData.writeUInt32LE(0x010fadef, 0); // Lower 32 bits
instructionData.writeUInt32LE(0xaaf42f01, 4); // Upper 32 bits
entryFeeBN.toArrayLike(Buffer, 'le', 8).copy(instructionData, 8);
```

## The Fix

We need to calculate the discriminator from the function name:

```typescript
import { sha256 } from '@noble/hashes/sha256';

// Calculate discriminator from function name
function getInstructionDiscriminator(name: string): Buffer {
  return Buffer.from(sha256(`global:${name}`)).slice(0, 8);
}

// Use it:
const discriminator = getInstructionDiscriminator('create_challenge');
const instructionData = Buffer.alloc(8 + 8);
discriminator.copy(instructionData, 0);
entryFeeBN.toArrayLike(Buffer, 'le', 8).copy(instructionData, 8);
```

## Better Solution: Use Anchor Program

Instead of manually constructing instructions, use the Anchor Program class which automatically handles discriminators:

```typescript
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import idl from './usdfg_smart_contract.json';

const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(idl, provider);

await program.methods
  .createChallenge(new BN(entryFeeUsdfg))
  .accounts({
    challenge: pdas.challengePDA,
    creator: creator,
    creatorTokenAccount: creatorTokenAccount,
    escrowTokenAccount: pdas.escrowTokenAccountPDA,
    escrowWallet: pdas.escrowWalletPDA,
    challengeSeed: challengeSeed.publicKey,
    systemProgram: SystemProgram.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
    rent: SYSVAR_RENT_PUBKEY,
    mint: USDFG_MINT,
  })
  .signers([challengeSeed])
  .rpc();
```

This is the proper way to interact with Anchor programs!

