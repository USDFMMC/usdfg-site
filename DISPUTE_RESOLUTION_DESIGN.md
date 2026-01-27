# Dispute Resolution System Design

## Firestore Schema

### 1. Challenges Collection (Extended)
```typescript
{
  // ... existing fields ...
  status: 'pending_waiting_for_opponent' | 'creator_confirmation_required' | 'creator_funded' | 'active' | 'completed' | 'cancelled' | 'disputed';
  
  // Extended results with proof images
  results?: {
    [wallet: string]: {
      didWin: boolean;
      submittedAt: Timestamp;
      proofImageUrl?: string;  // NEW: Base64 or storage URL
      proofImageData?: string; // NEW: Base64 data URL (if stored in Firestore)
    }
  };
  
  // Admin resolution fields
  resolvedBy?: string;        // NEW: Firebase Auth UID of admin who resolved
  resolvedAt?: Timestamp;     // NEW: When admin resolved
  adminResolutionTx?: string; // NEW: On-chain transaction signature
}
```

### 2. Admins Collection (NEW)
```typescript
{
  uid: string;              // Firebase Auth UID (document ID)
  email: string;            // Admin email
  createdAt: Timestamp;    // When admin was added
  addedBy: string;          // UID of admin who added this admin
  active: boolean;          // Can disable without deleting
}
```

### 3. Admin Audit Log Collection (NEW)
```typescript
{
  id: string;               // Auto-generated
  adminUid: string;         // Firebase Auth UID
  adminEmail: string;       // Admin email (snapshot)
  challengeId: string;       // Challenge that was resolved
  winner: string;           // Wallet address of winner
  action: 'resolve_dispute'; // Action type
  timestamp: Timestamp;      // When action occurred
  onChainTx?: string;       // Transaction signature
  notes?: string;            // Optional admin notes
}
```

## Security Rules

```javascript
match /admins/{adminId} {
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/admins/$(request.auth.uid));
  allow write: if false; // Only server-side or manual Firebase Console
}

match /challenges/{challengeId} {
  allow read: if true; // Public read
  allow create: if true; // Anyone can create
  allow update: if 
    // Players can update their own results
    (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['results'])) ||
    // Admins can update disputed challenges
    (resource.data.status == 'disputed' && 
     request.auth != null && 
     exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
     request.resource.data.diff(resource.data).affectedKeys().hasAll(['status', 'winner', 'resolvedBy', 'resolvedAt']));
  allow delete: if true; // Keep existing behavior
}

match /admin_audit_log/{logId} {
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/admins/$(request.auth.uid));
  allow create: if request.auth != null && 
    exists(/databases/$(database)/documents/admins/$(request.auth.uid));
  allow update: if false; // Immutable
  allow delete: if false; // Immutable
}
```

## Smart Contract Instruction

### resolve_admin
```rust
pub fn resolve_admin(
    ctx: Context<ResolveAdmin>,
    winner: Pubkey
) -> Result<()> {
    let challenge = &mut ctx.accounts.challenge;
    
    // Only works if challenge is in dispute
    require!(
        challenge.status == ChallengeStatus::Disputed,
        ChallengeError::NotInDispute
    );
    
    // Winner must be one of the two players
    require!(
        winner == challenge.creator || winner == challenge.challenger.unwrap(),
        ChallengeError::InvalidWinner
    );
    
    // Prevent reentrancy
    require!(!challenge.processing, ChallengeError::ReentrancyDetected);
    challenge.processing = true;
    
    // Calculate payouts (same as resolve_challenge)
    let total_escrow = challenge.entry_fee * 2;
    let platform_fee = total_escrow * PLATFORM_FEE_BPS / 10000;
    let winner_payout = total_escrow - platform_fee;
    
    // Transfer to winner
    // Transfer platform fee
    // (Same logic as resolve_challenge)
    
    challenge.status = ChallengeStatus::Completed;
    challenge.processing = false;
    
    Ok(())
}
```

## UI Flow

1. **Player submits result:**
   - Upload proof image (base64 or Firebase Storage)
   - Store in `challenges/{id}/results/{wallet}`

2. **Conflict detection:**
   - When both players submit `didWin: true`
   - Auto-update `status: 'disputed'`

3. **Admin views Dispute Console:**
   - Firebase Auth login
   - Check UID in `admins` collection
   - Show all `status: 'disputed'` challenges
   - Display both players, results, proof images

4. **Admin resolves:**
   - Click "Approve Player A" or "Approve Player B"
   - Update Firestore: `winner`, `status: 'completed'`, `resolvedBy`, `resolvedAt`
   - Call smart contract `resolve_admin` instruction
   - Log to `admin_audit_log`
