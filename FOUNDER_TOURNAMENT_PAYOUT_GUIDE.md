# Founder Tournament Payout Guide

## Overview
After a Founder Tournament completes, the admin needs to manually distribute rewards to participants. This guide explains the process.

## Prerequisites
1. **Tournament must be completed**: The tournament `stage` must be `'completed'` and there must be a `champion` set
2. **Admin wallet connected**: You must be logged in with the ADMIN_WALLET (`3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd`)
3. **Viewing tournament lobby**: Open the completed tournament to see the payout UI

## Step-by-Step Process

### 1. Verify Tournament Completion
- Open the tournament lobby
- Check that the tournament shows "Stage: completed" or has a champion displayed
- The tournament bracket should show all matches as "Completed"

### 2. Access Payout UI
When viewing a **completed** Founder Tournament as admin, you should see a purple box titled:
```
Founder Tournament Payouts
Participants: X · Participant Reward: Y USDFG · Winner Bonus: Z USDFG
```

If you don't see this box, check:
- ✅ Are you logged in with the admin wallet?
- ✅ Is the tournament stage set to 'completed'?
- ✅ Does the tournament have a champion?
- ✅ Are you viewing the tournament lobby (not just the challenge list)?

### 3. Distribute Rewards

You have two options:

#### Option A: Send Airdrop Directly (Recommended)
1. Click the **"Send Airdrop Now"** button
2. Confirm the transaction in your wallet
3. The system will automatically:
   - Send participant rewards to all players
   - Send winner bonus to the champion
   - Create token accounts if needed
   - Batch transactions for efficiency

#### Option B: Copy CSV and Send Manually
1. Click **"Copy Combined CSV"** to get all payouts
2. Or use individual CSVs:
   - **"Copy Participant CSV"** - for participant rewards only
   - **"Copy Winner Bonus CSV"** - for champion bonus only
3. Use the CSV with your preferred airdrop tool (e.g., Solana CLI, Jupiter, etc.)

### 4. Reward Structure

For a Founder Tournament:
- **Participant Reward**: Every player who participated gets `founderParticipantReward` USDFG
- **Winner Bonus**: The champion gets an additional `founderWinnerBonus` USDFG
- **Total for Champion**: `founderParticipantReward + founderWinnerBonus` USDFG

### 5. After Distribution

Once rewards are sent:
- Players will see their USDFG balance increase
- The tournament will remain visible for 24 hours (as per retention policy)
- Players can verify rewards in their wallet

## Troubleshooting

### "I don't see the payout UI"
1. **Check wallet**: Make sure you're connected with `3SeLoDGsajuQUt2pzSkZV7LmB7gKtckmrD693U69kcUd`
2. **Check tournament status**: The tournament must be completed. Check Firestore:
   - `challenges/{challengeId}/tournament/stage` should be `'completed'`
   - `challenges/{challengeId}/tournament/champion` should be set
3. **Refresh page**: Try refreshing the tournament lobby
4. **Check console**: Look for any errors in browser console

### "Airdrop failed"
- **Insufficient balance**: Make sure admin wallet has enough USDFG tokens
- **Network issues**: Check Solana network connection
- **Missing token accounts**: The system will try to create them, but some wallets may need manual setup

### "Tournament not showing as completed"
- Check Firestore: `challenges/{challengeId}/tournament/stage`
- If it's not `'completed'`, the tournament may still be in progress
- The final match must be completed and a champion must be determined

## Technical Details

### Firestore Fields
- `tournament.stage`: Must be `'completed'`
- `tournament.champion`: Wallet address of the winner
- `founderParticipantReward`: USDFG amount per participant
- `founderWinnerBonus`: Additional USDFG for champion

### Airdrop Function
The `handleFounderTournamentAirdrop` function:
- Batches transfers (8 per transaction)
- Creates token accounts automatically if needed
- Handles duplicate wallets (combines amounts)
- Shows progress during sending

## Next Steps for Players

After admin distributes rewards:
1. Players will receive USDFG tokens in their wallets
2. They can check their balance in the app
3. No action required from players - rewards are automatic once admin sends them
