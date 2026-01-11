# Codebase Scan: Gambling-Related Terms

## 1. "prize pool" (case-insensitive)

### client/src/pages/app/index.tsx
- Line 1505: `${creatorDisplayName} sent you a challenge: ${challengeTitle}. Entry Fee: ${entryFee} USDFG, Prize Pool: ${prizePool} USDFG`
- Line 1975: `Prize Pool: ${userActiveChallenge.prizePool} USDFG`
- Line 2233: `// Calculate prize pool`
- Line 2234: `// For Founder Challenges: admin sets prize pool manually (no platform fee)`
- Line 2291: `prizePool: prizePool, // Prize pool (for Founder Challenges, admin sets this)`
- Line 4182: `<DetailRow label="🏆 Prize Pool" value={`${challenge.prizePool} USDFG`} />`
- Line 6965: `return <span className="text-purple-300">🏆 Founder Challenge - Prize pool set manually</span>;`
- Line 6967: `return <>Prize pool: {(usdfgToUsd(formData.entryFee) * 2 * 0.95).toFixed(2)} USD (after 5% platform fee)</>;`
- Line 6993: `Single-elimination. Prize pool = entry fee × number of players.`

### client/src/components/arena/StandardChallengeLobby.tsx
- Line 694: `Chat with your opponent and start the match. Submit results once you finish—winner takes the prize pool.`
- Line 745: `<div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Prize Pool</div>`

### client/src/lib/firebase/firestore.ts
- Line 79: `prizePool?: number;                 // Total prize pool amount`
- Line 1437: `// Update challenge to mark prize as transferred and set actual prize pool`
- Line 1805: `// Calculate prize pool if not stored (for backward compatibility with old challenges)`
- Line 1813: `console.log(`⚠️ Prize pool not found in challenge data, calculated from entry fee: ${entryFee} USDFG → ${prizePool} USDFG`);`
- Line 1849: `console.log('💰 Prize pool ready for claim:', prizePool, 'USDFG to', winner);`
- Line 3784: `console.log('   Prize Pool:', data.prizePool, 'USDFG');`

### client/src/components/arena/CreateChallengeForm.tsx
- Line 524: `Single-elimination bracket. Prize pool = entry fee × number of players. Winners advance automatically.`
- Line 719: `return <span className="text-purple-300">🏆 Founder Challenge - Set prize pool manually when transferring USDFG</span>;`
- Line 722: `return <>Prize Pool: {entryFee * formData.tournamentMaxPlayers} USDFG (entry fee × {formData.tournamentMaxPlayers} players)</>;`
- Line 724: `return <>Prize Pool: {entryFee * 2} USDFG (2x entry fee)</>;`

### client/src/components/arena/TournamentBracketView.tsx
- Line 148: `? "🏆 This is the FINAL! Winner takes the entire prize pool. Submit your result when ready."`

### client/src/pages/whitepaper.tsx
- Line 313: `<li>Rolling out competitive leaderboards and limited-supply prize pools.</li>`

### TELEGRAM_UPDATE.md
- Line 37: `5. Champion Crowned → Last player standing wins the prize pool!`
- Line 39: `💰 **Prize Pool = Entry Fee × Number of Players**`

---

## 2. "winner takes" (case-insensitive)

### client/src/pages/app/index.tsx
- Line 6437: `rules: ['First to 5 wins', 'Character switching allowed', 'Tournament legal stages', 'Standard round timer', 'No pause abuse', 'Winner takes all']`
- Line 6471: `rules: ['First to 5 wins', 'Character switching allowed', 'Tournament legal stages', 'Standard round timer', 'No pause abuse', 'Winner takes all']`

### client/src/components/arena/StandardChallengeLobby.tsx
- Line 694: `Chat with your opponent and start the match. Submit results once you finish—winner takes the prize pool.`

### client/src/components/arena/CreateChallengeForm.tsx
- Line 211: `rules = '• Full game duration\n• Standard game settings\n• No substitutions\n• Winner takes all';`
- Line 213: `rules = '• Shortened duration\n• No halftime breaks\n• Fast-paced action\n• Winner takes all';`
- Line 219: `rules = '• Direct head-to-head racing\n• No assists\n• Pure speed and skill\n• Winner takes all';`
- Line 223: `rules = '• Same character for both players\n• Pure skill competition\n• No character advantages\n• Winner takes all';`
- Line 227: `rules = '• 1v1 combat\n• No teammates\n• Pure skill and reflexes\n• Winner takes all';`
- Line 229: `rules = '• First to 10 kills wins\n• Fast-paced action\n• Clear victory conditions\n• Winner takes all';`
- Line 231: `rules = '• Sniper rifles only\n• Precision and patience\n• No other weapons\n• Winner takes all';`
- Line 235: `rules = '• Custom rules\n• Flexible format\n• Your own challenge\n• Winner takes all';`

### client/src/components/arena/TournamentBracketView.tsx
- Line 148: `? "🏆 This is the FINAL! Winner takes the entire prize pool. Submit your result when ready."`

---

## 3. "wager" (case-insensitive)

### client/src/pages/terms.tsx
- Line 193: `USDFG is a skill-based digital competition platform operated solely by its Founder. It does not offer any form of gambling, wagering, lotteries, or games of chance. Participation is voluntary and rewards are based exclusively on user skill and verified performance. USDFG is a utility token used solely to access platform features and has no guaranteed monetary value. These Terms are designed to comply with applicable laws related to gaming, digital assets, and consumer protections.`
- Line 405: `Users may acquire USDFG tokens to access features, create or join challenges, and participate in skill-based competitions. Acquiring tokens is not a bet, wager, or speculative investment, and using tokens to enter a challenge is not gambling. Challenge rewards are based solely on measurable performance and outcome verification. Users may withdraw earned tokens to their wallets and convert them using external platforms at their discretion. USDFG does not offer, facilitate, or control currency exchange or financial speculation.`

---

## 4. "bet" (case-insensitive, whole word)

### client/src/pages/terms.tsx
- Line 405: `Users may acquire USDFG tokens to access features, create or join challenges, and participate in skill-based competitions. Acquiring tokens is not a bet, wager, or speculative investment, and using tokens to enter a challenge is not gambling. Challenge rewards are based solely on measurable performance and outcome verification. Users may withdraw earned tokens to their wallets and convert them using external platforms at their discretion. USDFG does not offer, facilitate, or control currency exchange or financial speculation.`

---

## 5. "stake" (case-insensitive, whole word)

### package-lock.json
- Line 7246: `"node_modules/@solana-program/stake": {`
- Line 10212: `"@solana-program/stake": "^0.2.1",`

**Note:** These are Solana program references, not gambling-related terms.

---

## 6. "pot" (case-insensitive, whole word)

**No matches found**

---

## 7. "payout pool" (case-insensitive)

**No matches found**

---

## 8. "entry fee" (case-insensitive)

### client/src/pages/app/index.tsx
- Line 1505: `${creatorDisplayName} sent you a challenge: ${challengeTitle}. Entry Fee: ${entryFee} USDFG, Prize Pool: ${prizePool} USDFG`
- Line 1974: `Entry Fee: ${userActiveChallenge.entryFee} USDFG\n` +
- Line 2179: `// Check if this is a Founder Challenge (admin with 0 entry fee)`
- Line 2236: `// For regular challenges: 2x entry fee minus 5% platform fee`
- Line 2244: `// Tournament: all entry fees collected`
- Line 2247: `// Regular 1v1 challenge: 2x entry fee`
- Line 2317: `throw new Error("Entry fee is required");`
- Line 2329: `// Refresh USDFG balance after successful challenge creation (entry fee was deducted)`
- Line 3674: `// Check if a challenge is a Founder Challenge (admin-created with 0 entry fee)`
- Line 4181: `<DetailRow label="💰 Entry Fee" value={`${challenge.entryFee} USDFG`} />`
- Line 6541: `rules: '• Single elimination bracket\n• Winners advance automatically\n• Entry fees locked until tournament ends\n• Submit results with proof each round\n• Disconnects = round loss unless rematch agreed'`
- Line 6599: `// Check if user is admin (allow 0 entry fee for Founder Challenges)`
- Line 6603: `errors.push('Entry fee must be a valid number');`
- Line 6605: `errors.push('Entry fee must be between 0.000000001 and 1000 USDFG');`
- Line 6607: `errors.push('Entry fee cannot be negative');`
- Line 6609: `errors.push('Maximum entry fee is 1000 USDFG');`
- Line 6612: `// Allow 0 entry fee for admin (Founder Challenges)`
- Line 6904: `<span className="mr-2">💰</span>Entry Fee <span className="text-red-400 ml-1">*</span>`
- Line 6934: `hasFieldError('entry fee') ? 'border-red-500/50 bg-red-500/5' : 'border-white/10'`
- Line 6993: `Single-elimination. Prize pool = entry fee × number of players.`
- Line 7098: `<span className="text-gray-400">💰 Entry Fee:</span>`

### client/src/lib/chain/contract.ts
- Line 98: `* @param entryFeeUsdfg - Entry fee in USDFG tokens (e.g., 0.001 for 0.001 USDFG)`
- Line 107: `console.log(`Entry fee: ${entryFeeUsdfg} USDFG`);`
- Line 115: `// Validate entry fee (matches contract requirement: 0.000000001 USDFG minimum (1 lamport), 1000 USDFG maximum)`
- Line 117: `throw new Error('Entry fee must be between 0.000000001 and 1000 USDFG');`
- Line 120: `console.log(`✅ Entry fee valid: ${entryFeeUsdfg} USDFG`);`
- Line 163: `console.log('💰 Entry fee in lamports:', entryFeeLamports);`
- Line 976: `console.log('✅ Tournament entry fee transferred to escrow!');`

### client/src/components/arena/StandardChallengeLobby.tsx
- Line 741: `<div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Entry Fee</div>`

### SOLANA_PLAYGROUND_CONTRACT.rs
- Line 13: `// Entry fee limits`
- Line 24: `// Validate entry fee`
- Line 387: `// Refund both players their entry fees (fair refund)`
- Line 796: `#[msg("Entry fee too low")]`
- Line 798: `#[msg("Entry fee too high")]`
- Line 812: `#[msg("Entry fee mismatch")]`

### CONTRACT_FRONTEND_VERIFICATION.md
- Line 57: `### Entry Fee Limits`

### programs/usdfg_smart_contract/src/lib.rs
- Line 13: `// Entry fee limits`
- Line 24: `// Validate entry fee`
- Line 387: `// Refund both players their entry fees (fair refund)`
- Line 796: `#[msg("Entry fee too low")]`
- Line 798: `#[msg("Entry fee too high")]`
- Line 812: `#[msg("Entry fee mismatch")]`

### client/src/lib/firebase/firestore.ts
- Line 46: `entryFee: number;                   // Entry fee amount`
- Line 754: `throw new Error("Entry fee is required");`
- Line 1736: `* - Both NO → Both forfeit (suspicious collusion, both lose entry fees as penalty)`
- Line 1782: `console.log('⚠️ FORFEIT: Both players claim they lost - Suspicious collusion detected, both lose entry fees');`
- Line 1808: `// Calculate from entry fee: 2x entry fee minus 5% platform fee`
- Line 1813: `console.log(`⚠️ Prize pool not found in challenge data, calculated from entry fee: ${entryFee} USDFG → ${prizePool} USDFG`);`
- Line 2103: `text: '🤝 Both players agreed to cancel. Challenge cancelled, entry fees will be returned.',`

### client/src/components/arena/CreateChallengeForm.tsx
- Line 233: `rules = '• Single elimination bracket\n• Winners advance automatically\n• Entry fees locked for all participants\n• Submit results with proof after each match\n• Disconnects = round loss unless opponents agree to rematch';`
- Line 263: `// Check if user is admin (allow 0 entry fee for Founder Challenges)`
- Line 267: `errors.push('Entry fee must be a valid number');`
- Line 269: `errors.push('Minimum entry fee is 0.000000001 USDFG (1 lamport - smallest unit)');`
- Line 271: `errors.push('Entry fee cannot be negative');`
- Line 273: `errors.push('Maximum entry fee is 1000 USDFG');`
- Line 276: `// Allow 0 entry fee for admin (Founder Challenges)`
- Line 524: `Single-elimination bracket. Prize pool = entry fee × number of players. Winners advance automatically.`
- Line 667: `Entry Fee (USDFG)`
- Line 722: `return <>Prize Pool: {entryFee * formData.tournamentMaxPlayers} USDFG (entry fee × {formData.tournamentMaxPlayers} players)</>;`
- Line 724: `return <>Prize Pool: {entryFee * 2} USDFG (2x entry fee)</>;`

### CONTRACT_FOR_PLAYGROUND.rs
- Line 13: `// Entry fee limits`
- Line 24: `// Validate entry fee`
- Line 387: `// Refund both players their entry fees (fair refund)`
- Line 797: `#[msg("Entry fee too low")]`
- Line 799: `#[msg("Entry fee too high")]`
- Line 813: `#[msg("Entry fee mismatch")]`

### SECURITY_FEATURES_SUMMARY.md
- Line 7: `### 1. **Entry Fee Bounds** (Lines 24-32)`
- Line 8: `- **What it does**: Validates entry fee is between 1 lamport and 1000 USDFG`

### CONTRACT_SECURITY_ANALYSIS.md
- Line 5: `### 1. **Entry Fee Validation** (Lines 24-32)`
- Line 8: `- **Impact**: Prevents invalid entry fees without user friction`
- Line 54: `- ✅ Entry fee must match challenge entry fee`

### POST_DEPLOYMENT_CHECKLIST.md
- Line 39: `- [ ] Test with different entry fee amounts`

### add-mock-challenges.js
- Line 77: `// Entry fees (USDFG)`
- Line 90: `const prizePool = entryFee * 2 * 0.95; // 2x entry fee minus 5% platform fee`

### tests/challenge-flow.test.ts
- Line 139: `name: 'creatorFund (contract): Transfers entry fee',`
- Line 145: `name: 'joinerFund (contract): Transfers entry fee',`

### client/src/lib/chain/events.ts
- Line 532: `console.log(`💸 Joining challenge ${challengeId} with entry fee ${entryFee} USDFG`);`

### firestore.rules
- Line 59: `// Friendly Matches - player-initiated matches without entry fees`

### client/public/assets/contract-Brt9exJw.js
- Line 1: (minified/bundled code - contains "Entry fee" references)

### client/public/admin.html
- Line 225: `<span class="status-label">Entry Fee Range</span>`
- Line 232: `• Players create challenges with any entry fee<br>`

### TELEGRAM_UPDATE.md
- Line 39: `💰 **Prize Pool = Entry Fee × Number of Players**`

---

## Summary

**Total occurrences:**
- "prize pool": 25 occurrences
- "winner takes": 12 occurrences
- "wager": 2 occurrences (both in terms.tsx, used in negative context)
- "bet": 1 occurrence (in terms.tsx, used in negative context)
- "stake": 2 occurrences (both in package-lock.json, Solana program references - not gambling-related)
- "pot": 0 occurrences
- "payout pool": 0 occurrences
- "entry fee": 83 occurrences

**Files with most occurrences:**
1. `client/src/pages/app/index.tsx` - 9 "prize pool", 2 "winner takes", 20 "entry fee"
2. `client/src/components/arena/CreateChallengeForm.tsx` - 4 "prize pool", 8 "winner takes", 11 "entry fee"
3. `client/src/lib/firebase/firestore.ts` - 5 "prize pool", 5 "entry fee"
4. `client/src/lib/chain/contract.ts` - 6 "entry fee"
5. `SOLANA_PLAYGROUND_CONTRACT.rs` - 5 "entry fee"
6. `programs/usdfg_smart_contract/src/lib.rs` - 5 "entry fee"


