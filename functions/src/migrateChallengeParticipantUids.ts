import { FieldValue, getFirestore } from "firebase-admin/firestore";

export type ChallengeUidMigrationResult = {
  scanned: number;
  updated: number;
  challengeIds: string[];
};

/**
 * Rewrites stale Firebase UIDs on challenge docs after wallet identity recovery.
 * Admin SDK only — does not change challenge status or escrow fields.
 */
export async function migrateChallengeParticipantUids(
  previousUid: string,
  newUid: string,
  walletKey: string
): Promise<ChallengeUidMigrationResult> {
  const db = getFirestore();
  const challengeIds = new Set<string>();
  let updated = 0;

  const byCreated = await db
    .collection("challenges")
    .where("createdByUid", "==", previousUid)
    .select()
    .get();
  for (const doc of byCreated.docs) challengeIds.add(doc.id);

  const byOpponent = await db
    .collection("challenges")
    .where("opponentUid", "==", previousUid)
    .select()
    .get();
  for (const doc of byOpponent.docs) challengeIds.add(doc.id);

  const byPlayers = await db
    .collection("challenges")
    .where("playersUid", "array-contains", previousUid)
    .select()
    .get();
  for (const doc of byPlayers.docs) challengeIds.add(doc.id);

  for (const challengeId of challengeIds) {
    const ref = db.collection("challenges").doc(challengeId);
    const snap = await ref.get();
    if (!snap.exists) continue;

    const data = snap.data() ?? {};
    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    let touched = false;

    if (data.createdByUid === previousUid) {
      patch.createdByUid = newUid;
      touched = true;
    }
    if (data.opponentUid === previousUid) {
      patch.opponentUid = newUid;
      touched = true;
    }
    if (Array.isArray(data.playersUid) && data.playersUid.includes(previousUid)) {
      patch.playersUid = data.playersUid.map((uid: string) =>
        uid === previousUid ? newUid : uid
      );
      touched = true;
    }

    // Only migrate docs that reference this wallet (avoid cross-wallet uid collisions).
    const creatorWallet = String(data.creator ?? data.creatorWallet ?? "").toLowerCase();
    const opponentWallet = String(data.opponentWallet ?? data.challenger ?? "").toLowerCase();
    const players = Array.isArray(data.players)
      ? data.players.map((w: string) => String(w).toLowerCase())
      : [];
    const walletInvolved =
      creatorWallet === walletKey ||
      opponentWallet === walletKey ||
      players.includes(walletKey);

    if (!walletInvolved) continue;
    if (!touched) continue;

    await ref.update(patch);
    updated += 1;
  }

  return {
    scanned: challengeIds.size,
    updated,
    challengeIds: [...challengeIds],
  };
}
