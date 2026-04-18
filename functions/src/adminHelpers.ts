import { HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { normalizeAddress } from "./normalizeAddress";

/** 15 minutes + 60s clock drift buffer */
const MAX_TOKEN_AGE_SEC = 960;

function staleAdminTokenError(): never {
  throw new HttpsError("permission-denied", "Stale admin token", {
    code: "STALE_ADMIN_TOKEN",
  });
}

export function requireAdminClaims(request: CallableRequest): string {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Admin verification required");
  }

  const token = request.auth.token as { iat?: number; wallet?: string };
  const now = Date.now() / 1000;
  const issuedAt = token.iat;

  if (!issuedAt || now - issuedAt > MAX_TOKEN_AGE_SEC) {
    staleAdminTokenError();
  }

  const uid = normalizeAddress(request.auth.uid);
  const wallet = normalizeAddress(token.wallet);
  if (!wallet || wallet !== uid) {
    throw new HttpsError("permission-denied", "Token integrity violation");
  }

  return wallet;
}

export async function writeAdminLog(
  action: string,
  admin: string,
  targetId: string
): Promise<void> {
  const db = getFirestore();
  await db.collection("admin_logs").add({
    action,
    admin,
    timestamp: FieldValue.serverTimestamp(),
    targetId,
  });
}
