# 🎯 Optimized Data Structure - Minimal Data Collection

## Current Problem
We're storing FULL challenge data in Firestore when we only need win/loss stats for leaderboards.

## What We Actually Need
- ✅ **Player wallet** (for identification)
- ✅ **Win/Loss count** (for leaderboard)
- ✅ **Total earnings** (for leaderboard)
- ✅ **Win rate** (calculated from wins/losses)
- ❌ **Game details** (not needed for leaderboard)
- ❌ **Challenge rules** (not needed for leaderboard)
- ❌ **Platform info** (not needed for leaderboard)
- ❌ **Full challenge history** (not needed for leaderboard)

## Optimized Data Structure

### 1. Player Stats (Keep This - Essential for Leaderboard)
```typescript
interface PlayerStats {
  wallet: string;           // Player identification
  wins: number;            // Win count
  losses: number;          // Loss count
  totalEarned: number;     // Total USDFG earned
  winRate: number;         // Calculated: wins/(wins+losses)*100
  lastActive: Timestamp;   // Last game played
}
```

### 2. Challenge Data (Minimize This)
```typescript
interface MinimalChallengeData {
  id: string;              // Challenge ID
  creator: string;         // Creator wallet
  challenger?: string;     // Challenger wallet (if accepted)
  entryFee: number;        // Entry fee amount
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  createdAt: Timestamp;    // Creation time
  expiresAt: Timestamp;    // Expiration time
  winner?: string;         // Winner wallet (if completed)
  // REMOVE: game, rules, platform, mode, category, etc.
}
```

### 3. Auto-Cleanup Strategy
- **Active challenges**: Keep in `challenges` collection
- **Completed challenges**: Delete after 24 hours (keep only winner info)
- **Expired challenges**: Delete immediately
- **Player stats**: Keep forever (essential for leaderboard)

## Benefits
- 🚀 **90% less data storage** - Only essential info
- 💰 **Lower Firebase costs** - Minimal data accumulation
- 🔒 **Better privacy** - No unnecessary data collection
- ⚡ **Faster queries** - Smaller documents
- 🎯 **Focused purpose** - Only leaderboard data

## Implementation Plan
1. Update challenge creation to store minimal data
2. Auto-delete completed challenges after 24 hours
3. Auto-delete expired challenges immediately
4. Keep only player stats for leaderboard
5. Update Firestore rules for auto-cleanup
