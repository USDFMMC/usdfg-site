// Manual test script to add a challenge to Firestore
// Run this in browser console to test real-time sync

import { addChallenge } from './src/lib/firebase/firestore.js';
import { Timestamp } from 'firebase/firestore';

const testChallenge = {
  creator: "TestUser123",
  creatorTag: "TestGamer",
  game: "Street Fighter 6",
  mode: "Best of 3",
  platform: "PS5",
  entryFee: 25,
  maxPlayers: 2,
  rules: "Standard tournament rules. Best of 3 matches. No rage quitting.",
  status: "pending",
  players: ["TestUser123"],
  expiresAt: Timestamp.fromDate(new Date(Date.now() + (2 * 60 * 60 * 1000))), // 2 hours from now
  category: "Fighting",
  prizePool: 47.5 // 25 * 2 * 0.95 (after 5% platform fee)
};

console.log("🧪 Adding test challenge to Firestore...");
addChallenge(testChallenge)
  .then((challengeId) => {
    console.log("✅ Test challenge created with ID:", challengeId);
    console.log("📡 Check your app - it should appear in real-time!");
  })
  .catch((error) => {
    console.error("❌ Failed to create test challenge:", error);
  });
