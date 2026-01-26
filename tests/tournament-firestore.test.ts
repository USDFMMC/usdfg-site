/**
 * Firestore Emulator Tournament Integration Test
 *
 * This test spins up against the Firestore emulator to validate:
 * - Tournament creation (8 players)
 * - Player joins
 * - Round progression + winner advancement
 * - Final champion and completion flags
 */

import { Keypair } from "@solana/web3.js";
import {
  connectFirestoreEmulator,
  collection,
  deleteDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../client/src/lib/firebase/config.js";
import {
  addChallenge,
  fetchChallengeById,
  joinTournament,
  submitTournamentMatchResult
} from "../client/src/lib/firebase/firestore.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const testResults: TestResult[] = [];

function logResult(result: TestResult) {
  testResults.push(result);
  const icon = result.passed ? "✅" : "❌";
  console.log(`${icon} ${result.name}`);
  if (!result.passed && result.error) {
    console.log(`   Error: ${result.error}`);
  }
  if (result.details) {
    console.log(`   ${result.details}`);
  }
}

function getEmulatorTarget() {
  const host = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  const [hostname, portString] = host.split(":");
  const port = Number(portString || 8080);
  return { hostname, port };
}

async function clearCollection(collectionName: string) {
  const snapshot = await getDocs(collection(db, collectionName));
  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
}

async function setupEmulator() {
  const { hostname, port } = getEmulatorTarget();
  connectFirestoreEmulator(db, hostname, port);
  await Promise.all([
    clearCollection("challenges"),
    clearCollection("player_stats"),
    clearCollection("challenge_notifications")
  ]);
}

async function runTournamentEmulatorTest() {
  console.log("🚀 Starting Firestore Emulator Tournament Test");
  console.log("=".repeat(60));

  try {
    await setupEmulator();
    logResult({
      name: "Connected to Firestore emulator",
      passed: true,
      details: `Host: ${process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080"}`
    });
  } catch (error: any) {
    logResult({
      name: "Connected to Firestore emulator",
      passed: false,
      error: error?.message || "Failed to connect"
    });
    throw error;
  }

  const creatorWallet = Keypair.generate().publicKey.toString();
  const playerWallets = Array.from({ length: 8 }, () =>
    Keypair.generate().publicKey.toString()
  );

  let challengeId: string | null = null;
  try {
    challengeId = await addChallenge({
      creator: creatorWallet,
      entryFee: 1,
      status: "pending_waiting_for_opponent",
      title: "Integration Test Tournament",
      game: "NBA 2K26",
      category: "Sports",
      platform: "PC",
      format: "tournament",
      maxPlayers: 8,
      players: []
    });
    logResult({
      name: "Created 8-player tournament challenge",
      passed: Boolean(challengeId),
      details: challengeId ? `Challenge ID: ${challengeId}` : undefined
    });
  } catch (error: any) {
    logResult({
      name: "Created 8-player tournament challenge",
      passed: false,
      error: error?.message || "Challenge creation failed"
    });
    throw error;
  }

  if (!challengeId) {
    throw new Error("Challenge ID missing after creation");
  }

  for (const [index, wallet] of playerWallets.entries()) {
    try {
      await joinTournament(challengeId, wallet);
      logResult({
        name: `Player ${index + 1} joined tournament`,
        passed: true,
        details: wallet.slice(0, 8)
      });
    } catch (error: any) {
      logResult({
        name: `Player ${index + 1} joined tournament`,
        passed: false,
        error: error?.message || "Join failed"
      });
    }
  }

  let challenge = await fetchChallengeById(challengeId);
  if (!challenge) {
    throw new Error("Challenge not found after joining players");
  }

  const joinCount = challenge.players?.length || 0;
  logResult({
    name: "Tournament has 8 players",
    passed: joinCount === 8,
    details: `${joinCount}/8 players joined`
  });

  logResult({
    name: "Tournament stage is round_in_progress",
    passed: challenge.tournament?.stage === "round_in_progress",
    details: `Stage: ${challenge.tournament?.stage}`
  });

  logResult({
    name: "Challenge status is active after full join",
    passed: challenge.status === "active",
    details: `Status: ${challenge.status}`
  });

  const round1Matches = challenge.tournament?.bracket?.[0]?.matches || [];
  logResult({
    name: "Round 1 has 4 matches",
    passed: round1Matches.length === 4,
    details: `Matches: ${round1Matches.length}`
  });

  for (const match of round1Matches) {
    if (!match.player1 || !match.player2) {
      logResult({
        name: `Round 1 match ${match.id} has two players`,
        passed: false,
        error: "Missing player in match"
      });
      continue;
    }
    try {
      await submitTournamentMatchResult(challengeId, match.id, match.player1, true);
      await submitTournamentMatchResult(challengeId, match.id, match.player2, false);
      logResult({
        name: `Round 1 match ${match.id} completed`,
        passed: true,
        details: `Winner: ${match.player1.slice(0, 8)}...`
      });
    } catch (error: any) {
      logResult({
        name: `Round 1 match ${match.id} completed`,
        passed: false,
        error: error?.message || "Match submission failed"
      });
    }
  }

  challenge = await fetchChallengeById(challengeId);
  if (!challenge) {
    throw new Error("Challenge not found after round 1");
  }

  const round1Complete = (challenge.tournament?.bracket?.[0]?.matches || []).every(
    (match) => match.status === "completed" && Boolean(match.winner)
  );
  logResult({
    name: "Round 1 completed",
    passed: round1Complete,
    details: round1Complete ? "All winners advanced" : "Missing winners"
  });

  const round2Matches = challenge.tournament?.bracket?.[1]?.matches || [];
  logResult({
    name: "Round 2 has 2 matches",
    passed: round2Matches.length === 2,
    details: `Matches: ${round2Matches.length}`
  });

  for (const match of round2Matches) {
    if (!match.player1 || !match.player2) {
      logResult({
        name: `Round 2 match ${match.id} has two players`,
        passed: false,
        error: "Missing player in semifinal"
      });
      continue;
    }
    try {
      await submitTournamentMatchResult(challengeId, match.id, match.player1, true);
      await submitTournamentMatchResult(challengeId, match.id, match.player2, false);
      logResult({
        name: `Round 2 match ${match.id} completed`,
        passed: true,
        details: `Winner: ${match.player1.slice(0, 8)}...`
      });
    } catch (error: any) {
      logResult({
        name: `Round 2 match ${match.id} completed`,
        passed: false,
        error: error?.message || "Semifinal submission failed"
      });
    }
  }

  challenge = await fetchChallengeById(challengeId);
  if (!challenge) {
    throw new Error("Challenge not found after round 2");
  }

  const round2Complete = (challenge.tournament?.bracket?.[1]?.matches || []).every(
    (match) => match.status === "completed" && Boolean(match.winner)
  );
  logResult({
    name: "Round 2 completed",
    passed: round2Complete,
    details: round2Complete ? "Finalists assigned" : "Missing finalists"
  });

  const finalMatch = challenge.tournament?.bracket?.[2]?.matches?.[0];
  if (!finalMatch || !finalMatch.player1 || !finalMatch.player2) {
    logResult({
      name: "Final match has two players",
      passed: false,
      error: "Final match not ready"
    });
  } else {
    try {
      await submitTournamentMatchResult(challengeId, finalMatch.id, finalMatch.player1, true);
      await submitTournamentMatchResult(challengeId, finalMatch.id, finalMatch.player2, false);
      logResult({
        name: "Final match completed",
        passed: true,
        details: `Winner: ${finalMatch.player1.slice(0, 8)}...`
      });
    } catch (error: any) {
      logResult({
        name: "Final match completed",
        passed: false,
        error: error?.message || "Final submission failed"
      });
    }
  }

  challenge = await fetchChallengeById(challengeId);
  if (!challenge) {
    throw new Error("Challenge not found after final");
  }

  const champion = challenge.tournament?.champion;
  logResult({
    name: "Tournament marked completed",
    passed: challenge.tournament?.stage === "completed",
    details: `Stage: ${challenge.tournament?.stage}`
  });
  logResult({
    name: "Challenge status completed",
    passed: challenge.status === "completed",
    details: `Status: ${challenge.status}`
  });
  logResult({
    name: "Champion set and claimable",
    passed: Boolean(champion) && challenge.canClaim === true,
    details: champion ? `Champion: ${champion.slice(0, 8)}...` : "No champion"
  });
  logResult({
    name: "Champion is tournament participant",
    passed: Boolean(champion) && playerWallets.includes(champion),
    details: champion ? "Champion verified" : "Champion missing"
  });
}

async function runTests() {
  try {
    await runTournamentEmulatorTest();
  } catch (error: any) {
    console.error("💥 Test suite crashed:", error?.message || error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Results Summary\n");

  const passed = testResults.filter((t) => t.passed).length;
  const failed = testResults.filter((t) => !t.passed).length;

  console.log(`📈 Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.log("❌ Some tests failed. Review the errors above.");
    process.exit(1);
  } else {
    console.log("✅ All Firestore emulator tests passed!");
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    console.error("💥 Test suite crashed:", error);
    process.exit(1);
  });
}

export { runTests, testResults };
