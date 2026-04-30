import * as admin from "firebase-admin";

admin.initializeApp();

export { createAdminNonce } from "./createAdminNonceHandler";
export { verifyAdmin } from "./verifyAdminHandler";
export { finalizeAdminChallengeDispute } from "./finalizeChallenge";
export { finalizeAdminTournamentDispute } from "./finalizeTournament";
export { pruneStaleAdminNonces } from "./pruneAdminNonces";
export { finalizeProvisionalChallengeResolutions } from "./provisionalResolution";
