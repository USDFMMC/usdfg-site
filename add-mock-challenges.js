/**
 * Script to add mock challenges to Firestore
 * Creates 4 challenges per category: Fighting, Sports, FPS, Racing
 * 
 * Usage: node add-mock-challenges.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCacuEPoqLi5_FYOCnbaz8RPz7HKeF8WZI",
  authDomain: "usdfg-app.firebaseapp.com",
  projectId: "usdfg-app",
  storageBucket: "usdfg-app.firebasestorage.app",
  messagingSenderId: "10599746981",
  appId: "1:10599746981:web:97ce124f98f9b96872c4c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mock wallet addresses (just for display purposes)
const mockWallets = [
  '3SeLoDGs7qP9zFgHj8K2mN4vX6bW5cR9tY1uI0oP7aS4dF8e',
  '8MJWvyJ9rn8pkKopYvD61FVmHX2K6sgJceossVCDk5Tx',
  '6zWRjQRo4sYTUZNBdHQ61WTiaUz8UiwiyFbvr2Mw8qnU',
  'J599NJ9wHmrd8oH9X4kL2mN7vP8qR5tY3uI1oP9aS6dF0e',
  'ForfeitTest9pkKopYvD61FVmHX2K6sgJceossVCDk5Tx',
  'MockUser1X4kL2mN7vP8qR5tY3uI1oP9aS6dF0eT2g',
  'MockUser2K9pkKopYvD61FVmHX2K6sgJceossVCDk5Tx',
  'MockUser3N7vP8qR5tY3uI1oP9aS6dF0eT2gH4jK',
  'MockUser4P8qR5tY3uI1oP9aS6dF0eT2gH4jK5lM',
  'MockUser5R5tY3uI1oP9aS6dF0eT2gH4jK5lM6nO',
  'MockUser6T3uI1oP9aS6dF0eT2gH4jK5lM6nO7pQ',
  'MockUser7Y3uI1oP9aS6dF0eT2gH4jK5lM6nO7pQ8rS',
  'MockUser8I1oP9aS6dF0eT2gH4jK5lM6nO7pQ8rS9tU',
  'MockUser9P9aS6dF0eT2gH4jK5lM6nO7pQ8rS9tU0vW',
  'MockUser10S6dF0eT2gH4jK5lM6nO7pQ8rS9tU0vW1xY',
  'MockUser11F0eT2gH4jK5lM6nO7pQ8rS9tU0vW1xY2zA',
];

// Mock usernames
const mockUsernames = [
  'EliteGamer',
  'ProFighter',
  'SportsMaster',
  'FPSLegend',
  'RacingKing',
  'ArenaWarrior',
  'Champion99',
  'VictoryVibes',
  'GameOn2024',
  'SkillzUp',
  'WinnerTakesAll',
  'CompetitiveEdge',
  'TopTier',
  'GamingPro',
  'ElitePlayer',
  'MasterGamer',
];

// Games by category
const gamesByCategory = {
  Fighting: ['Street Fighter 6', 'Tekken 8', 'Mortal Kombat 1', 'UFC 5'],
  Sports: ['NBA 2K25', 'FIFA 25', 'Madden NFL 25', 'MLB The Show 25'],
  FPS: ['Call of Duty: Black Ops 6', 'Valorant', 'Counter-Strike 2', 'Apex Legends'],
  Racing: ['Forza Horizon 5', 'Gran Turismo 7', 'F1 2024', 'Need for Speed Unbound'],
};

// Platforms
const platforms = ['PS5', 'Xbox Series X', 'PC', 'All Platforms'];

// Modes
const modes = ['Head-to-Head (Full Game)', 'Best of 3 Series', 'Quick Match', 'First to 5 Wins'];

// Entry fees (USDFG)
const entryFees = [50, 100, 150, 200, 250, 300];

/**
 * Generate a mock challenge
 */
function generateMockChallenge(category, gameIndex, challengeIndex) {
  const game = gamesByCategory[category][gameIndex];
  const mode = modes[challengeIndex % modes.length];
  const walletIndex = (gameIndex * 4 + challengeIndex) % mockWallets.length;
  const creator = mockWallets[walletIndex];
  const username = mockUsernames[walletIndex];
  const entryFee = entryFees[challengeIndex % entryFees.length];
  const prizePool = entryFee * 2 * 0.95; // 2x entry fee minus 5% platform fee
  const platform = platforms[challengeIndex % platforms.length];
  
  const now = Date.now();
  const expirationTimer = Timestamp.fromDate(new Date(now + (24 * 60 * 60 * 1000))); // 24 hours
  const expiresAt = Timestamp.fromDate(new Date(now + (2 * 60 * 60 * 1000))); // 2 hours
  const createdAt = Timestamp.fromDate(new Date(now - (challengeIndex * 30 * 60 * 1000))); // Stagger creation times
  
  const title = `${game} - ${mode}`;
  
  return {
    creator: creator,
    entryFee: entryFee,
    status: 'pending_waiting_for_opponent',
    createdAt: createdAt,
    expiresAt: expiresAt,
    expirationTimer: expirationTimer,
    players: [creator],
    maxPlayers: 2, // Standard 1v1
    format: 'standard',
    prizePool: prizePool,
    title: title,
    game: game,
    category: category,
    platform: platform,
    challengeType: 'solo',
  };
}

/**
 * Main function to add mock challenges
 */
async function addMockChallenges() {
  try {
    console.log('🚀 Starting to add mock challenges...\n');
    
    const challengesRef = collection(db, 'challenges');
    let totalAdded = 0;
    
    // Add challenges for each category
    for (const [category, games] of Object.entries(gamesByCategory)) {
      console.log(`📦 Adding ${category} challenges...`);
      
      for (let gameIndex = 0; gameIndex < games.length; gameIndex++) {
        const game = games[gameIndex];
        console.log(`  🎮 Adding challenges for ${game}...`);
        
        // Add 4 challenges per game
        for (let challengeIndex = 0; challengeIndex < 4; challengeIndex++) {
          const challengeData = generateMockChallenge(category, gameIndex, challengeIndex);
          
          try {
            const docRef = await addDoc(challengesRef, challengeData);
            console.log(`    ✅ Added challenge: ${challengeData.title} (ID: ${docRef.id})`);
            totalAdded++;
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`    ❌ Error adding challenge ${challengeData.title}:`, error.message);
          }
        }
      }
      
      console.log(`  ✅ Completed ${category} category\n`);
    }
    
    console.log(`\n🎉 Successfully added ${totalAdded} mock challenges!`);
    console.log(`📊 Breakdown:`);
    Object.keys(gamesByCategory).forEach(category => {
      console.log(`   - ${category}: ${gamesByCategory[category].length * 4} challenges`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding mock challenges:', error);
    process.exit(1);
  }
}

// Run the script
addMockChallenges();

