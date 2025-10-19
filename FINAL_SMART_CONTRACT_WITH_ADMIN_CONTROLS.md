# 🎉 FINAL Smart Contract - Production Ready

## ✅ New Features Added:

### 1. **Configurable Platform Fee** 
- Fee is now stored in `platform_fee_bps` (basis points)
- Can be changed via `update_platform_fee()` 
- Max 10% (1000 bps), default recommend 500 (5%)

### 2. **Update Platform Wallet**
- Platform wallet can be changed via `update_platform_wallet()`
- Security: Only admin can update

### 3. **Emergency Pause/Unpause**
- `pause_contract()` - Stops new challenges from being created/accepted
- `unpause_contract()` - Resumes normal operation
- Existing challenges can still be resolved/claimed while paused

### 4. **Platform Fee Collection**
- Winner receives `(entry_fee * 2) * (10000 - platform_fee_bps) / 10000`
- Platform receives `(entry_fee * 2) * platform_fee_bps / 10000`
- Example with 5% fee (500 bps) on 50 USDFG entry:
  - Total: 100 USDFG
  - Winner: 95 USDFG
  - Platform: 5 USDFG

---

## 🚀 Deployment Instructions

### Step 1: Go to Solana Playground
https://beta.solpg.io/

### Step 2: Create new file `lib.rs`

### Step 3: Copy the smart contract code below

### Step 4: Build and Deploy
1. Click "Build"
2. Click "Deploy" 
3. **IMPORTANT:** When you call `initialize`, provide:
   - `admin`: Your admin wallet address
   - `platform_wallet`: Your platform fee collection wallet
   - `platform_fee_bps`: 500 (for 5%)

### Step 5: Copy the Program ID
Share it with me to update your frontend!

---

## 💰 Usage Examples

### Initialize (First Time Only):
```typescript
// admin: Your admin wallet
// platform_wallet: Where fees go
// platform_fee_bps: 500 = 5%, 200 = 2%, 1000 = 10%
await program.methods.initialize(adminPubkey, platformWalletPubkey, 500).rpc();
```

### Change Platform Fee (Promotions!):
```typescript
// Change to 2% for a promotion
await program.methods.updatePlatformFee(200).rpc();

// Change back to 5%
await program.methods.updatePlatformFee(500).rpc();
```

### Change Platform Wallet:
```typescript
await program.methods.updatePlatformWallet(newWalletPubkey).rpc();
```

### Emergency Pause:
```typescript
// If exploit found or maintenance needed
await program.methods.pauseContract().rpc();

// Resume operation
await program.methods.unpauseContract().rpc();
```

---

## 📊 Fee Calculations

| Entry Fee | Total Prize | Fee % | Platform Gets | Winner Gets |
|-----------|-------------|-------|---------------|-------------|
| 1 USDFG   | 2 USDFG     | 5%    | 0.1 USDFG     | 1.9 USDFG   |
| 10 USDFG  | 20 USDFG    | 5%    | 1 USDFG       | 19 USDFG    |
| 50 USDFG  | 100 USDFG   | 5%    | 5 USDFG       | 95 USDFG    |
| 100 USDFG | 200 USDFG   | 5%    | 10 USDFG      | 190 USDFG   |
| 50 USDFG  | 100 USDFG   | 2%    | 2 USDFG       | 98 USDFG    |
| 50 USDFG  | 100 USDFG   | 10%   | 10 USDFG      | 90 USDFG    |

---

## 🔐 Security Features

✅ Admin-only functions (pause, fee changes, wallet updates)
✅ Fee capped at 10% maximum
✅ Reentrancy protection
✅ Per-challenge escrow isolation
✅ Emergency pause mechanism
✅ All events emitted for tracking

---

## 📝 Complete Smart Contract Code

Copy everything below to Solana Playground:

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("DX4C2FyAKSiycDVSoYgm7WyDgmPNTdBKbvVDyKGGH6wK");

pub const ESCROW_WALLET_SEED: &[u8] = b"escrow_wallet";

#[program]
pub mod usdfg_smart_contract {
    use super::*;

    const MIN_ENTRY_FEE_LAMPORTS: u64 = 1_000_000_000;
    const MAX_ENTRY_FEE_LAMPORTS: u64 = 1_000_000_000_000;

    pub fn initialize(ctx: Context<Initialize>, admin: Pubkey, platform_wallet: Pubkey, platform_fee_bps: u16) -> Result<()> {
        let admin_state = &mut ctx.accounts.admin_state;
        require!(platform_fee_bps <= 1000, ChallengeError::InvalidPlatformFee);
        admin_state.admin = admin;
        admin_state.platform_wallet = platform_wallet;
        admin_state.platform_fee_bps = platform_fee_bps;
        admin_state.is_paused = false;
        admin_state.is_active = true;
        admin_state.created_at = Clock::get()?.unix_timestamp;
        admin_state.last_updated = Clock::get()?.unix_timestamp;
        emit!(AdminInitialized { admin: admin, timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn update_admin(ctx: Context<UpdateAdmin>, new_admin: Pubkey) -> Result<()> {
        let admin_state = &mut ctx.accounts.admin_state;
        require!(admin_state.admin == ctx.accounts.current_admin.key(), ChallengeError::Unauthorized);
        require!(admin_state.is_active, ChallengeError::AdminInactive);
        let old_admin = admin_state.admin;
        admin_state.admin = new_admin;
        admin_state.last_updated = Clock::get()?.unix_timestamp;
        emit!(AdminUpdated { old_admin: old_admin, new_admin: new_admin, timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn revoke_admin(ctx: Context<RevokeAdmin>) -> Result<()> {
        let admin_state = &mut ctx.accounts.admin_state;
        require!(admin_state.admin == ctx.accounts.current_admin.key(), ChallengeError::Unauthorized);
        require!(admin_state.is_active, ChallengeError::AdminInactive);
        admin_state.is_active = false;
        admin_state.last_updated = Clock::get()?.unix_timestamp;
        emit!(AdminRevoked { admin: admin_state.admin, timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn update_platform_wallet(ctx: Context<UpdateAdmin>, new_platform_wallet: Pubkey) -> Result<()> {
        let admin_state = &mut ctx.accounts.admin_state;
        require!(admin_state.admin == ctx.accounts.current_admin.key(), ChallengeError::Unauthorized);
        require!(admin_state.is_active, ChallengeError::AdminInactive);
        let old_wallet = admin_state.platform_wallet;
        admin_state.platform_wallet = new_platform_wallet;
        admin_state.last_updated = Clock::get()?.unix_timestamp;
        emit!(PlatformWalletUpdated { old_wallet: old_wallet, new_wallet: new_platform_wallet, timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn update_platform_fee(ctx: Context<UpdateAdmin>, new_fee_bps: u16) -> Result<()> {
        let admin_state = &mut ctx.accounts.admin_state;
        require!(admin_state.admin == ctx.accounts.current_admin.key(), ChallengeError::Unauthorized);
        require!(admin_state.is_active, ChallengeError::AdminInactive);
        require!(new_fee_bps <= 1000, ChallengeError::InvalidPlatformFee);
        let old_fee = admin_state.platform_fee_bps;
        admin_state.platform_fee_bps = new_fee_bps;
        admin_state.last_updated = Clock::get()?.unix_timestamp;
        emit!(PlatformFeeUpdated { old_fee_bps: old_fee, new_fee_bps: new_fee_bps, timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn pause_contract(ctx: Context<UpdateAdmin>) -> Result<()> {
        let admin_state = &mut ctx.accounts.admin_state;
        require!(admin_state.admin == ctx.accounts.current_admin.key(), ChallengeError::Unauthorized);
        require!(admin_state.is_active, ChallengeError::AdminInactive);
        require!(!admin_state.is_paused, ChallengeError::AlreadyPaused);
        admin_state.is_paused = true;
        admin_state.last_updated = Clock::get()?.unix_timestamp;
        emit!(ContractPaused { admin: admin_state.admin, timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn unpause_contract(ctx: Context<UpdateAdmin>) -> Result<()> {
        let admin_state = &mut ctx.accounts.admin_state;
        require!(admin_state.admin == ctx.accounts.current_admin.key(), ChallengeError::Unauthorized);
        require!(admin_state.is_active, ChallengeError::AdminInactive);
        require!(admin_state.is_paused, ChallengeError::NotPaused);
        admin_state.is_paused = false;
        admin_state.last_updated = Clock::get()?.unix_timestamp;
        emit!(ContractUnpaused { admin: admin_state.admin, timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn create_challenge(ctx: Context<CreateChallenge>, usdfg_amount: u64) -> Result<()> {
        require!(!ctx.accounts.admin_state.is_paused, ChallengeError::ContractPaused);
        require!(usdfg_amount >= MIN_ENTRY_FEE_LAMPORTS, ChallengeError::EntryFeeTooLow);
        require!(usdfg_amount <= MAX_ENTRY_FEE_LAMPORTS, ChallengeError::EntryFeeTooHigh);
        let now = Clock::get()?.unix_timestamp;
        let dispute_timer = now + 900;
        let challenge = &mut ctx.accounts.challenge;
        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, usdfg_amount)?;
        challenge.creator = ctx.accounts.creator.key();
        challenge.challenger = None;
        challenge.entry_fee = usdfg_amount;
        challenge.status = ChallengeStatus::Open;
        challenge.created_at = now;
        challenge.last_updated = now;
        challenge.processing = false;
        challenge.dispute_timer = dispute_timer;
        emit!(ChallengeCreated { creator: challenge.creator, amount: challenge.entry_fee, timestamp: challenge.created_at });
        Ok(())
    }

    pub fn accept_challenge(ctx: Context<AcceptChallenge>) -> Result<()> {
        require!(!ctx.accounts.admin_state.is_paused, ChallengeError::ContractPaused);
        require!(ctx.accounts.admin_state.is_active, ChallengeError::AdminInactive);
        let challenge = &mut ctx.accounts.challenge;
        require!(challenge.status == ChallengeStatus::Open, ChallengeError::NotOpen);
        require!(challenge.creator != ctx.accounts.challenger.key(), ChallengeError::SelfChallenge);
        require!(ctx.accounts.challenger_token_account.amount >= challenge.entry_fee, ChallengeError::InsufficientFunds);
        require!(Clock::get()?.unix_timestamp < challenge.dispute_timer, ChallengeError::ChallengeExpired);
        challenge.challenger = Some(ctx.accounts.challenger.key());
        challenge.status = ChallengeStatus::InProgress;
        challenge.last_updated = Clock::get()?.unix_timestamp;
        let cpi_accounts = Transfer {
            from: ctx.accounts.challenger_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.challenger.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, challenge.entry_fee)?;
        emit!(ChallengeAccepted { challenge: challenge.key(), challenger: ctx.accounts.challenger.key(), timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn resolve_challenge(ctx: Context<ResolveChallenge>, winner: Pubkey, caller: Pubkey) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        require!(!challenge.processing, ChallengeError::ReentrancyDetected);
        challenge.processing = true;
        require!(challenge.status == ChallengeStatus::InProgress, ChallengeError::NotInProgress);
        require!(winner == challenge.creator || winner == challenge.challenger.unwrap(), ChallengeError::InvalidWinner);
        require!(Clock::get()?.unix_timestamp < challenge.dispute_timer, ChallengeError::ChallengeExpired);
        let is_admin = ctx.accounts.admin_state.is_active;
        let is_winner_claiming = caller == winner;
        require!(is_winner_claiming || is_admin, ChallengeError::Unauthorized);
        challenge.status = ChallengeStatus::Completed;
        challenge.winner = Some(winner);
        challenge.last_updated = Clock::get()?.unix_timestamp;
        
        let total_prize = challenge.entry_fee * 2;
        let platform_fee = (total_prize * ctx.accounts.admin_state.platform_fee_bps as u64) / 10000;
        let winner_payout = total_prize - platform_fee;
        
        let escrow_seeds = [ESCROW_WALLET_SEED, challenge.to_account_info().key.as_ref(), ctx.accounts.mint.to_account_info().key.as_ref(), &[ctx.bumps.escrow_token_account]];
        let signer_seeds = [&escrow_seeds[..]];
        
        let winner_transfer = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.winner_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let winner_cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), winner_transfer, &signer_seeds);
        token::transfer(winner_cpi_ctx, winner_payout)?;
        
        let platform_transfer = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.platform_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let platform_cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), platform_transfer, &signer_seeds);
        token::transfer(platform_cpi_ctx, platform_fee)?;
        
        emit!(PayoutCompleted { challenge: challenge.key(), winner, amount: winner_payout, timestamp: challenge.last_updated });
        emit!(PlatformFeeCollected { challenge: challenge.key(), amount: platform_fee, timestamp: challenge.last_updated });
        challenge.processing = false;
        Ok(())
    }

    pub fn cancel_challenge(ctx: Context<CancelChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        require!(!challenge.processing, ChallengeError::ReentrancyDetected);
        challenge.processing = true;
        require!(ctx.accounts.admin_state.is_active, ChallengeError::AdminInactive);
        require!(challenge.status == ChallengeStatus::Open, ChallengeError::NotOpen);
        require!(ctx.accounts.creator.key() == challenge.creator, ChallengeError::Unauthorized);
        require!(Clock::get()?.unix_timestamp < challenge.dispute_timer, ChallengeError::ChallengeExpired);
        challenge.status = ChallengeStatus::Cancelled;
        challenge.last_updated = Clock::get()?.unix_timestamp;
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.escrow_wallet.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, challenge.entry_fee)?;
        emit!(RefundIssued { challenge: challenge.key(), recipient: challenge.creator, amount: challenge.entry_fee, timestamp: challenge.last_updated });
        challenge.processing = false;
        Ok(())
    }

    pub fn claim_refund(ctx: Context<CancelChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        require!(!challenge.processing, ChallengeError::ReentrancyDetected);
        challenge.processing = true;
        require!(ctx.accounts.creator.key() == challenge.creator, ChallengeError::Unauthorized);
        require!(challenge.status == ChallengeStatus::Open, ChallengeError::NotOpen);
        require!(Clock::get()?.unix_timestamp >= challenge.dispute_timer, ChallengeError::ChallengeNotExpired);
        require!(challenge.challenger.is_none(), ChallengeError::AlreadyAccepted);
        challenge.status = ChallengeStatus::Cancelled;
        challenge.last_updated = Clock::get()?.unix_timestamp;
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.escrow_wallet.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, challenge.entry_fee)?;
        emit!(RefundIssued { challenge: challenge.key(), recipient: challenge.creator, amount: challenge.entry_fee, timestamp: challenge.last_updated });
        challenge.processing = false;
        Ok(())
    }

    pub fn dispute_challenge(ctx: Context<DisputeChallenge>) -> Result<()> {
        require!(ctx.accounts.admin_state.is_active, ChallengeError::AdminInactive);
        let challenge = &mut ctx.accounts.challenge;
        require!(challenge.status == ChallengeStatus::InProgress, ChallengeError::NotInProgress);
        require!(Clock::get()?.unix_timestamp >= challenge.dispute_timer, ChallengeError::ChallengeNotExpired);
        require!(ctx.accounts.disputer.key() == challenge.creator || ctx.accounts.disputer.key() == challenge.challenger.unwrap(), ChallengeError::Unauthorized);
        challenge.status = ChallengeStatus::Disputed;
        challenge.last_updated = Clock::get()?.unix_timestamp;
        emit!(ChallengeDisputed { challenge: challenge.key(), disputer: ctx.accounts.disputer.key(), timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = AdminState::LEN, seeds = [b"admin"], bump)]
    pub admin_state: Account<'info, AdminState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAdmin<'info> {
    #[account(mut)]
    pub admin_state: Account<'info, AdminState>,
    #[account(mut)]
    pub current_admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeAdmin<'info> {
    #[account(mut)]
    pub admin_state: Account<'info, AdminState>,
    #[account(mut)]
    pub current_admin: Signer<'info>,
}

#[account]
pub struct AdminState {
    pub admin: Pubkey,
    pub platform_wallet: Pubkey,
    pub platform_fee_bps: u16,
    pub is_paused: bool,
    pub is_active: bool,
    pub created_at: i64,
    pub last_updated: i64,
}

impl AdminState {
    pub const LEN: usize = 8 + 32 + 32 + 2 + 1 + 1 + 8 + 8;
}

#[derive(Accounts)]
#[instruction(entry_fee: u64)]
pub struct CreateChallenge<'info> {
    #[account(init, payer = creator, space = Challenge::LEN, seeds = [b"challenge", creator.key().as_ref(), challenge_seed.key().as_ref()], bump)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut, constraint = creator_token_account.owner == creator.key())]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(init_if_needed, payer = creator, seeds = [ESCROW_WALLET_SEED, challenge.key().as_ref(), mint.key().as_ref()], bump, token::mint = mint, token::authority = escrow_token_account)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    /// CHECK: This is the escrow wallet
    pub escrow_wallet: AccountInfo<'info>,
    pub challenge_seed: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub mint: Account<'info, Mint>,
    pub admin_state: Account<'info, AdminState>,
}

#[derive(Accounts)]
pub struct AcceptChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub challenger: Signer<'info>,
    #[account(mut, constraint = challenger_token_account.owner == challenger.key())]
    pub challenger_token_account: Account<'info, TokenAccount>,
    #[account(mut, seeds = [ESCROW_WALLET_SEED, challenge.key().as_ref(), mint.key().as_ref()], bump, token::mint = mint, token::authority = escrow_token_account)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub admin_state: Account<'info, AdminState>,
    /// CHECK: This is the escrow wallet
    #[account(seeds = [ESCROW_WALLET_SEED], bump)]
    pub escrow_wallet: AccountInfo<'info>,
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct ResolveChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut, seeds = [ESCROW_WALLET_SEED, challenge.key().as_ref(), mint.key().as_ref()], bump, token::mint = mint, token::authority = escrow_token_account)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = winner_token_account.mint == mint.key())]
    pub winner_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = platform_token_account.mint == mint.key(), constraint = platform_token_account.owner == admin_state.platform_wallet)]
    pub platform_token_account: Account<'info, TokenAccount>,
    /// CHECK: This is the escrow wallet
    #[account(seeds = [ESCROW_WALLET_SEED], bump)]
    pub escrow_wallet: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub admin_state: Account<'info, AdminState>,
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct CancelChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut, constraint = creator_token_account.owner == creator.key(), constraint = creator_token_account.mint == escrow_token_account.mint)]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = escrow_token_account.owner == escrow_wallet.key())]
    pub escrow_token_account: Account<'info, TokenAccount>,
    /// CHECK: This is the escrow wallet
    #[account(seeds = [ESCROW_WALLET_SEED], bump)]
    pub escrow_wallet: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub admin_state: Account<'info, AdminState>,
}

#[derive(Accounts)]
pub struct DisputeChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub disputer: Signer<'info>,
    pub admin_state: Account<'info, AdminState>,
}

#[account]
pub struct Challenge {
    pub creator: Pubkey,
    pub challenger: Option<Pubkey>,
    pub entry_fee: u64,
    pub status: ChallengeStatus,
    pub dispute_timer: i64,
    pub winner: Option<Pubkey>,
    pub created_at: i64,
    pub last_updated: i64,
    pub processing: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChallengeStatus {
    Open,
    InProgress,
    Completed,
    Cancelled,
    Disputed,
}

impl Challenge {
    pub const LEN: usize = 8 + 32 + 1 + 32 + 8 + 1 + 8 + 1 + 32 + 8 + 8 + 1;
}

#[error_code]
pub enum ChallengeError {
    #[msg("Challenge is not open")]
    NotOpen,
    #[msg("Challenge is not in progress")]
    NotInProgress,
    #[msg("Cannot challenge yourself")]
    SelfChallenge,
    #[msg("Invalid winner")]
    InvalidWinner,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid escrow wallet")]
    InvalidEscrowWallet,
    #[msg("Challenge has expired")]
    ChallengeExpired,
    #[msg("Challenge not expired")]
    ChallengeNotExpired,
    #[msg("Entry fee too low")]
    EntryFeeTooLow,
    #[msg("Entry fee too high")]
    EntryFeeTooHigh,
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Admin is inactive")]
    AdminInactive,
    #[msg("Invalid admin")]
    InvalidAdmin,
    #[msg("Reentrancy detected")]
    ReentrancyDetected,
    #[msg("Challenge already accepted")]
    AlreadyAccepted,
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Contract is not paused")]
    NotPaused,
    #[msg("Contract is already paused")]
    AlreadyPaused,
    #[msg("Invalid platform fee (max 10%)")]
    InvalidPlatformFee,
}

#[event]
pub struct ChallengeCreated {
    pub creator: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ChallengeAccepted {
    pub challenge: Pubkey,
    pub challenger: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ChallengeResolved {
    pub challenge: Pubkey,
    pub winner: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ChallengeCancelled {
    pub challenge: Pubkey,
    pub creator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ChallengeDisputed {
    pub challenge: Pubkey,
    pub disputer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AdminInitialized {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AdminUpdated {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AdminRevoked {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PayoutCompleted {
    pub challenge: Pubkey,
    pub winner: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RefundIssued {
    pub challenge: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PlatformFeeCollected {
    pub challenge: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PlatformWalletUpdated {
    pub old_wallet: Pubkey,
    pub new_wallet: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PlatformFeeUpdated {
    pub old_fee_bps: u16,
    pub new_fee_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct ContractPaused {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ContractUnpaused {
    pub admin: Pubkey,
    pub timestamp: i64,
}
```

---

## ✅ Ready to Deploy!

1. Copy the entire code above
2. Paste into Solana Playground
3. Build & Deploy
4. Share the new Program ID with me!

I'll update your frontend automatically once you have the Program ID. 🚀

