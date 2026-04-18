import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { normalizeAddress } from "./normalizeAddress";
import { enforceRateLimit, clientIpFromRequest } from "./rateLimit";

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const MAX_ACTIVE_NONCES_PER_ADDRESS = 2;

/**
 * Creates a bound nonce document before the client signs (admin_auth_nonces).
 */
export const createAdminNonce = onCall(async (request) => {
  const addressRaw = request.data?.address as string | undefined;
  if (!addressRaw || typeof addressRaw !== "string") {
    throw new HttpsError("invalid-argument", "address is required");
  }

  const normalized = normalizeAddress(addressRaw.trim());
  if (!normalized) {
    throw new HttpsError("invalid-argument", "Invalid address");
  }

  await enforceRateLimit(`nonce_create_addr_${normalized}`);
  await enforceRateLimit(
    `nonce_create_ip_${clientIpFromRequest(request.rawRequest)}`
  );

  const db = getFirestore();
  const since = Timestamp.fromMillis(Date.now() - ACTIVE_WINDOW_MS);

  const recent = await db
    .collection("admin_auth_nonces")
    .where("address", "==", normalized)
    .where("createdAt", ">=", since)
    .select("address", "createdAt")
    .limit(2)
    .get();

  if (recent.size >= MAX_ACTIVE_NONCES_PER_ADDRESS) {
    throw new HttpsError(
      "resource-exhausted",
      "Too many active nonces for this wallet. Wait or use an existing nonce."
    );
  }

  const nonce = randomUUID();
  const ref = db.collection("admin_auth_nonces").doc(nonce);

  await ref.set({
    nonce,
    address: normalized,
    createdAt: FieldValue.serverTimestamp(),
    used: false,
  });

  return { nonce };
});
