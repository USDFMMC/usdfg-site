use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("DX4C2FyAKSiycDVSoYgm7WyDgmPNTdBKbvVDyKGGH6wK");

// Escrow wallet seed
pub const ESCROW_WALLET_SEED: &[u8] = b"escrow_wallet";

// Platform configuration (hardcoded - no admin needed!)
pub const PLATFORM_FEE_BPS: u16 = 500; // 5% = 500 basis points
pub const PLATFORM_WALLET: &str = "AcEV5t9TJdZP91ttbgKieWoWUxwUb4PT4MxvggDjjkkq";

// Entry fee limits
const MIN_ENTRY_FEE_LAMPORTS: u64 = 1_000_000_000; // 1 USDFG
const MAX_ENTRY_FEE_LAMPORTS: u64 = 1_000_000_000_000; // 1000 USDFG

#[program]
pub mod usdfg_smart_contract {
    use super::*;

    pub fn create_challenge(ctx: Context<CreateChallenge>, usdfg_amount: u64) -> Result<()> {
        // Validate entry fee
        require!(
            usdfg_amount >= MIN_ENTRY_FEE_LAMPORTS,
            ChallengeError::EntryFeeTooLow
        );
        require!(
            usdfg_amount <= MAX_ENTRY_FEE_LAMPORTS,
            ChallengeError::EntryFeeTooHigh
        );

        let now = Clock::get()?.unix_timestamp;
        let dispute_timer = now + 900; // 15 minutes

        let challenge = &mut ctx.accounts.challenge;

        // Transfer tokens to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
        );
        token::transfer(cpi_ctx, usdfg_amount)?;

        // Initialize challenge
        challenge.creator = ctx.accounts.creator.key();
        challenge.challenger = None;
        challenge.entry_fee = usdfg_amount;
        challenge.status = ChallengeStatus::Open;
        challenge.created_at = now;
        challenge.last_updated = now;
        challenge.processing = false;
        challenge.dispute_timer = dispute_timer;
        challenge.creator_result = None;
        challenge.challenger_result = None;

        emit!(ChallengeCreated {
            creator: challenge.creator,
            amount: challenge.entry_fee,
            timestamp: challenge.created_at,
        });

        Ok(())
    }

    pub fn accept_challenge(ctx: Context<AcceptChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;

        // Validate challenge is open
        require!(challenge.status == ChallengeStatus::Open, ChallengeError::NotOpen);
        
        // Prevent self-challenge
        require!(
            challenge.creator != ctx.accounts.challenger.key(),
            ChallengeError::SelfChallenge
        );
        
        // Verify challenger has enough tokens
        require!(
            ctx.accounts.challenger_token_account.amount >= challenge.entry_fee,
            ChallengeError::InsufficientFunds
        );
        
        // Verify not expired
        require!(
            Clock::get()?.unix_timestamp < challenge.dispute_timer,
            ChallengeError::ChallengeExpired
        );

        challenge.challenger = Some(ctx.accounts.challenger.key());
        challenge.status = ChallengeStatus::InProgress;
        challenge.last_updated = Clock::get()?.unix_timestamp;

        // Transfer tokens to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.challenger_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.challenger.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
        );
        token::transfer(cpi_ctx, challenge.entry_fee)?;

        emit!(ChallengeAccepted {
            challenge: challenge.key(),
            challenger: ctx.accounts.challenger.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Submit result (called by either player via Firestore)
    /// This is tracked off-chain in Firestore, but stored on-chain for verification
    pub fn submit_result(
        ctx: Context<SubmitResult>,
        did_win: bool
    ) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let submitter = ctx.accounts.submitter.key();

        // Validate challenge is in progress
        require!(
            challenge.status == ChallengeStatus::InProgress,
            ChallengeError::NotInProgress
        );

        // Validate submitter is a player
        require!(
            submitter == challenge.creator || submitter == challenge.challenger.unwrap(),
            ChallengeError::Unauthorized
        );

        // Store result
        if submitter == challenge.creator {
            challenge.creator_result = Some(did_win);
        } else {
            challenge.challenger_result = Some(did_win);
        }

        challenge.last_updated = Clock::get()?.unix_timestamp;

        emit!(ResultSubmitted {
            challenge: challenge.key(),
            submitter,
            did_win,
            timestamp: challenge.last_updated,
        });

        Ok(())
    }

    /// Resolve challenge with player consensus
    /// Either player can call this once both have submitted results
    pub fn resolve_challenge(
        ctx: Context<ResolveChallenge>,
        winner: Pubkey
    ) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;

        require!(!challenge.processing, ChallengeError::ReentrancyDetected);
        challenge.processing = true;

        // Validate challenge is in progress
        require!(
            challenge.status == ChallengeStatus::InProgress,
            ChallengeError::NotInProgress
        );

        // Validate winner is one of the players
        require!(
            winner == challenge.creator || winner == challenge.challenger.unwrap(),
            ChallengeError::InvalidWinner
        );

        // Validate not expired
        require!(
            Clock::get()?.unix_timestamp < challenge.dispute_timer,
            ChallengeError::ChallengeExpired
        );

        // CONSENSUS CHECK: Smart logic with "concede to win"
        let creator_won = challenge.creator_result.unwrap_or(false);
        let challenger_won = challenge.challenger_result.unwrap_or(false);

        // If both submitted, verify consensus
        if challenge.creator_result.is_some() && challenge.challenger_result.is_some() {
            // Special cases that require refund_dispute function:
            // 1. Both claim victory = Dispute (use refund_dispute)
            if creator_won && challenger_won {
                return err!(ChallengeError::NoConsensus);
            }
            
            // 2. Both concede (both lost) = Use refund_dispute function
            if !creator_won && !challenger_won {
                return err!(ChallengeError::BothConceded);
            }

            // Valid scenarios (one player concedes OR honest agreement):
            // - Creator won + Challenger lost = Creator wins ✅
            // - Creator lost + Challenger won = Challenger wins ✅
            
            let consensus = if winner == challenge.creator {
                // Creator can only win if challenger conceded (lost)
                !challenger_won
            } else {
                // Challenger can only win if creator conceded (lost)
                !creator_won
            };

            require!(consensus, ChallengeError::NoConsensus);
        }

        // Calculate payouts
        let total_prize = challenge.entry_fee * 2;
        let platform_fee = (total_prize * PLATFORM_FEE_BPS as u64) / 10000;
        let winner_payout = total_prize - platform_fee;

        challenge.status = ChallengeStatus::Completed;
        challenge.winner = Some(winner);
        challenge.last_updated = Clock::get()?.unix_timestamp;

        // Transfer to winner
        let escrow_seeds = [
            ESCROW_WALLET_SEED,
            challenge.to_account_info().key.as_ref(),
            ctx.accounts.mint.to_account_info().key.as_ref(),
            &[ctx.bumps.escrow_token_account]
        ];
        let signer_seeds = [&escrow_seeds[..]];

        let winner_cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.winner_token_account.to_account_info(),
                authority: ctx.accounts.escrow_token_account.to_account_info(),
            },
            &signer_seeds
        );
        token::transfer(winner_cpi_ctx, winner_payout)?;

        // Transfer platform fee
        let platform_cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.platform_token_account.to_account_info(),
                authority: ctx.accounts.escrow_token_account.to_account_info(),
            },
            &signer_seeds
        );
        token::transfer(platform_cpi_ctx, platform_fee)?;

        emit!(PayoutCompleted {
            challenge: challenge.key(),
            winner,
            winner_amount: winner_payout,
            platform_fee,
            timestamp: challenge.last_updated,
        });

        challenge.processing = false;
        Ok(())
    }

    /// Refund in case of dispute (no consensus)
    /// Both players get their money back, but will be flagged in Firestore
    pub fn refund_dispute(ctx: Context<RefundDispute>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;

        require!(!challenge.processing, ChallengeError::ReentrancyDetected);
        challenge.processing = true;

        // Validate challenge is in progress
        require!(
            challenge.status == ChallengeStatus::InProgress,
            ChallengeError::NotInProgress
        );

        // Check if both submitted results
        require!(
            challenge.creator_result.is_some() && challenge.challenger_result.is_some(),
            ChallengeError::ResultsNotSubmitted
        );

        // Check for disagreement
        let creator_won = challenge.creator_result.unwrap();
        let challenger_won = challenge.challenger_result.unwrap();
        
        // Both claim win OR both claim loss = dispute/refund
        let is_dispute = creator_won == challenger_won;
        require!(is_dispute, ChallengeError::NoDispute);

        challenge.status = ChallengeStatus::Disputed;
        challenge.last_updated = Clock::get()?.unix_timestamp;

        // Determine dispute reason for event
        let reason = if creator_won && challenger_won {
            "Dispute - Both claimed victory (both flagged)"
        } else {
            "Dispute - Both conceded"
        };

        // Refund both players their entry fees (fair refund)
        let escrow_seeds = [
            ESCROW_WALLET_SEED,
            challenge.to_account_info().key.as_ref(),
            ctx.accounts.mint.to_account_info().key.as_ref(),
            &[ctx.bumps.escrow_token_account]
        ];
        let signer_seeds = [&escrow_seeds[..]];

        // Refund creator
        let creator_cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.escrow_token_account.to_account_info(),
            },
            &signer_seeds
        );
        token::transfer(creator_cpi_ctx, challenge.entry_fee)?;

        // Refund challenger
        let challenger_cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.challenger_token_account.to_account_info(),
                authority: ctx.accounts.escrow_token_account.to_account_info(),
            },
            &signer_seeds
        );
        token::transfer(challenger_cpi_ctx, challenge.entry_fee)?;

        emit!(DisputeRefunded {
            challenge: challenge.key(),
            creator: challenge.creator,
            challenger: challenge.challenger.unwrap(),
            amount: challenge.entry_fee,
            reason: reason.to_string(),
            creator_claimed_win: creator_won,
            challenger_claimed_win: challenger_won,
            timestamp: challenge.last_updated,
        });

        challenge.processing = false;
        Ok(())
    }

    /// Cancel challenge (only if not accepted yet)
    pub fn cancel_challenge(ctx: Context<CancelChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;

        require!(!challenge.processing, ChallengeError::ReentrancyDetected);
        challenge.processing = true;

        require!(challenge.status == ChallengeStatus::Open, ChallengeError::NotOpen);
        require!(
            ctx.accounts.creator.key() == challenge.creator,
            ChallengeError::Unauthorized
        );

        challenge.status = ChallengeStatus::Cancelled;
        challenge.last_updated = Clock::get()?.unix_timestamp;

        // Refund creator
        let escrow_seeds = [
            ESCROW_WALLET_SEED,
            challenge.to_account_info().key.as_ref(),
            ctx.accounts.mint.to_account_info().key.as_ref(),
            &[ctx.bumps.escrow_token_account]
        ];
        let signer_seeds = [&escrow_seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.escrow_token_account.to_account_info(),
            },
            &signer_seeds
        );
        token::transfer(cpi_ctx, challenge.entry_fee)?;

        emit!(RefundIssued {
            challenge: challenge.key(),
            creator: challenge.creator,
            challenger: Pubkey::default(),
            amount: challenge.entry_fee,
            reason: "Challenge cancelled".to_string(),
            timestamp: challenge.last_updated,
        });

        challenge.processing = false;
        Ok(())
    }
}

// ============================================
// ACCOUNT STRUCTS
// ============================================

#[derive(Accounts)]
#[instruction(entry_fee: u64)]
pub struct CreateChallenge<'info> {
    #[account(
        init,
        payer = creator,
        space = Challenge::LEN,
        seeds = [b"challenge", creator.key().as_ref(), challenge_seed.key().as_ref()],
        bump
    )]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut, constraint = creator_token_account.owner == creator.key())]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = creator,
        seeds = [ESCROW_WALLET_SEED, challenge.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = escrow_token_account
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    /// CHECK: Escrow wallet PDA
    pub escrow_wallet: AccountInfo<'info>,
    pub challenge_seed: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct AcceptChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub challenger: Signer<'info>,
    #[account(
        mut,
        constraint = challenger_token_account.owner == challenger.key()
    )]
    pub challenger_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [ESCROW_WALLET_SEED, challenge.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = escrow_token_account
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Escrow wallet PDA
    #[account(
        seeds = [ESCROW_WALLET_SEED],
        bump
    )]
    pub escrow_wallet: AccountInfo<'info>,
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct SubmitResult<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    pub submitter: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(
        mut,
        seeds = [ESCROW_WALLET_SEED, challenge.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = escrow_token_account
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = winner_token_account.mint == mint.key()
    )]
    pub winner_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = platform_token_account.mint == mint.key()
    )]
    pub platform_token_account: Account<'info, TokenAccount>,
    /// CHECK: Escrow wallet PDA
    #[account(
        seeds = [ESCROW_WALLET_SEED],
        bump
    )]
    pub escrow_wallet: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct RefundDispute<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(
        mut,
        seeds = [ESCROW_WALLET_SEED, challenge.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = escrow_token_account
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = creator_token_account.owner == challenge.creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = challenger_token_account.owner == challenge.challenger.unwrap()
    )]
    pub challenger_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct CancelChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key(),
        constraint = creator_token_account.mint == mint.key()
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [ESCROW_WALLET_SEED, challenge.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = escrow_token_account
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub mint: Account<'info, Mint>,
}

// ============================================
// DATA STRUCTURES
// ============================================

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
    pub creator_result: Option<bool>,    // Did creator win?
    pub challenger_result: Option<bool>, // Did challenger win?
}

impl Challenge {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        1 + 32 + // challenger (Option<Pubkey>)
        8 + // entry_fee
        1 + // status
        8 + // dispute_timer
        1 + 32 + // winner (Option<Pubkey>)
        8 + // created_at
        8 + // last_updated
        1 + // processing
        1 + 1 + // creator_result (Option<bool>)
        1 + 1; // challenger_result (Option<bool>)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ChallengeStatus {
    Open,
    InProgress,
    Completed,
    Cancelled,
    Disputed,
}

// ============================================
// ERRORS
// ============================================

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
    #[msg("Challenge has expired")]
    ChallengeExpired,
    #[msg("Entry fee too low")]
    EntryFeeTooLow,
    #[msg("Entry fee too high")]
    EntryFeeTooHigh,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Reentrancy detected")]
    ReentrancyDetected,
    #[msg("No consensus - players disagree on winner")]
    NoConsensus,
    #[msg("Both players must submit results first")]
    ResultsNotSubmitted,
    #[msg("No dispute - players agree")]
    NoDispute,
    #[msg("Both players conceded - use refund function")]
    BothConceded,
}

// ============================================
// EVENTS
// ============================================

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
pub struct ResultSubmitted {
    pub challenge: Pubkey,
    pub submitter: Pubkey,
    pub did_win: bool,
    pub timestamp: i64,
}

#[event]
pub struct PayoutCompleted {
    pub challenge: Pubkey,
    pub winner: Pubkey,
    pub winner_amount: u64,
    pub platform_fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct RefundIssued {
    pub challenge: Pubkey,
    pub creator: Pubkey,
    pub challenger: Pubkey,
    pub amount: u64,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct DisputeRefunded {
    pub challenge: Pubkey,
    pub creator: Pubkey,
    pub challenger: Pubkey,
    pub amount: u64,
    pub reason: String,
    pub creator_claimed_win: bool,
    pub challenger_claimed_win: bool,
    pub timestamp: i64,
}

