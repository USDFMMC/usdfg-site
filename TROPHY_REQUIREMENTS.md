# 🏆 Trophy Requirements Documentation

This document lists all trophy requirements for the USDFG Arena platform. Keep this file as a backup to avoid losing trophy information.

## Trophy System Overview

- **Location**: `client/src/lib/trophies.ts`
- **Image Path**: `/assets/trophies/`
- **Format**: PNG images, recommended size: 128px × 128px or 256px × 256px

---

## Trophy Requirements List

### 1. **OG FIRST 2.1K MEMBERS** 🥇
- **ID**: `og-1k`
- **Type**: Special Trophy (not games-based)
- **Requirement**: Automatically awarded when creating your FIRST challenge IF total unique users < 2,100
- **Image**: `usdfg-21k.png`
- **Color**: Gold
- **Description**: "Pioneer of the Arena. You joined when we were just getting started. Exclusive to the first 2,100 members - representing USDFG's 21M token supply."
- **Visibility**: Always visible (open) with description shown
- **Award Logic**: 
  - Checks total users in `player_stats` collection BEFORE adding new user
  - If count < 2,100 → awards trophy automatically
  - Stored in player stats as `ogFirst1k: true`

### 2. **USDFG INITIATE** 🏅
- **ID**: `initiate`
- **Type**: Games-based
- **Requirement**: Play **2 games**
- **Image**: `usdfg-initiate.png`
- **Color**: Brown
- **Description**: "Your first steps into the arena. Every legend begins here."

### 3. **USDFG CONTENDER** 🏅
- **ID**: `contender`
- **Type**: Games-based
- **Requirement**: Play **10 games**
- **Image**: `usdfg-contender.png`
- **Color**: Gray
- **Description**: "You've proven you belong. The competition takes notice."

### 4. **USDFG VETERAN** 🏅
- **ID**: `veteran`
- **Type**: Games-based
- **Requirement**: Play **15 games**
- **Image**: `usdfg-veteran.png`
- **Color**: Amber
- **Description**: "Battle-tested and battle-ready. Experience is your weapon."

### 5. **USDFG ENFORCER** 🏅
- **ID**: `enforcer`
- **Type**: Games-based
- **Requirement**: Play **30 games**
- **Image**: `usdfg-enforcer.png`
- **Color**: Cyan
- **Description**: "You maintain order in chaos. Justice through victory."

### 6. **USDFG UNBROKEN** 🏅
- **ID**: `unbroken`
- **Type**: Games-based
- **Requirement**: Play **60 games**
- **Image**: `usdfg-unbroken.png`
- **Color**: Purple
- **Description**: "Through fire and fury, you stand unshaken. Unbreakable spirit."

### 7. **USDFG DISCIPLE** 🏅
- **ID**: `disciple`
- **Type**: Games-based
- **Requirement**: Play **90 games**
- **Image**: `usdfg-disciple.png`
- **Color**: Red
- **Description**: "You've mastered the cycle. Every challenge remembers you."

### 8. **USDFG IMMORTAL** 🏅
- **ID**: `immortal`
- **Type**: Games-based
- **Requirement**: Play **120 games**
- **Image**: `usdfg-immortal.png`
- **Color**: Yellow
- **Description**: "Transcendent. Your legacy echoes through the ages."

---

## Quick Reference

| Trophy | Games Required | Type | Image File |
|--------|---------------|------|------------|
| OG FIRST 2.1K MEMBERS | Special (first challenge, <2100 users) | Special | `usdfg-21k.png` |
| USDFG INITIATE | 2 | Games | `usdfg-initiate.png` |
| USDFG CONTENDER | 10 | Games | `usdfg-contender.png` |
| USDFG VETERAN | 15 | Games | `usdfg-veteran.png` |
| USDFG ENFORCER | 30 | Games | `usdfg-enforcer.png` |
| USDFG UNBROKEN | 60 | Games | `usdfg-unbroken.png` |
| USDFG DISCIPLE | 90 | Games | `usdfg-disciple.png` |
| USDFG IMMORTAL | 120 | Games | `usdfg-immortal.png` |

---

## Important Notes

1. **OG First 2.1K Trophy**: 
   - Awarded automatically when user creates their FIRST challenge
   - Only if total unique wallet users < 2,100 at that moment
   - Stored permanently in player stats
   - Always visible in profile (not hidden like other trophies)

2. **Games Count**: 
   - Based on `gamesPlayed = wins + losses` from player stats
   - Counts both wins and losses toward trophy progression

3. **Trophy Display**:
   - OG First 2.1K is always visible (open) with description
   - Other trophies are hidden (locked) until unlocked

---

**Last Updated**: 2024
**File Location**: `client/src/lib/trophies.ts`

