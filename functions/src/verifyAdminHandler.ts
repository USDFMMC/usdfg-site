import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { normalizeAddress } from "./normalizeAddress";
import { enforceRateLimit, clientIpFromRequest } from "./rateLimit";

const NONCE_TTL_MS = 5 * 60 * 1000;

/**
 * Strict base64 + ed25519 detached signature length (64 bytes).
 */
function parseEd25519Signature(signatureB64: string): Uint8Array {
  const trimmed = signatureB64.trim();
  if (!trimmed || trimmed.length > 120) {
    throw new HttpsError("invalid-argument", "Invalid signature encoding");
  }
  if (!/^[A-Za-z0-9+/]+=*$/.test(trimmed)) {
    throw new HttpsError("invalid-argument", "Invalid signature encoding");
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(trimmed, "base64");
  } catch {
    throw new HttpsError("invalid-argument", "Invalid signature encoding");
  }
  if (buf.length !== 64) {
    throw new HttpsError("invalid-argument", "Invalid signature length");
  }
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export const verifyAdmin = onCall(async (request) => {
  const addressRaw = request.data?.address as string | undefined;
  const signatureB64 = request.data?.signature as string | undefined;
  const nonce = request.data?.nonce as string | undefined;

  if (!addressRaw || !signatureB64 || nonce === undefined || nonce === null) {
    throw new HttpsError("invalid-argument", "address, signature, and nonce are required");
  }

  if (typeof nonce !== "string" || nonce.length < 16 || nonce.length > 128) {
    throw new HttpsError("invalid-argument", "Invalid nonce");
  }

  const sigBytes = parseEd25519Signature(signatureB64);

  const normalized = normalizeAddress(addressRaw.trim());
  if (!normalized) {
    throw new HttpsError("invalid-argument", "Invalid address");
  }

  await enforceRateLimit(`verify_addr_${normalized}`);
  await enforceRateLimit(`verify_ip_${clientIpFromRequest(request.rawRequest)}`);

  const message = new TextEncoder().encode(nonce);
  let pubkeyBytes: Uint8Array;
  try {
    pubkeyBytes = new PublicKey(addressRaw.trim()).toBytes();
  } catch {
    throw new HttpsError("invalid-argument", "Invalid Solana address");
  }

  if (pubkeyBytes.length !== 32) {
    throw new HttpsError("invalid-argument", "Invalid public key");
  }

  const db = getFirestore();
  const nonceRef = db.collection("admin_auth_nonces").doc(nonce);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(nonceRef);
    if (!doc.exists) {
      throw new HttpsError("not-found", "Invalid or unknown nonce");
    }

    const nd = doc.data()!;
    if (nd.used === true) {
      throw new HttpsError("permission-denied", "Nonce already used");
    }
    if (normalizeAddress(nd.address as string) !== normalized) {
      throw new HttpsError("permission-denied", "Nonce is not bound to this wallet");
    }

    const createdAt = nd.createdAt as Timestamp | undefined;
    if (!createdAt) {
      throw new HttpsError("failed-precondition", "Invalid nonce record");
    }
    const ageMs = Date.now() - createdAt.toMillis();
    if (ageMs > NONCE_TTL_MS) {
      throw new HttpsError("deadline-exceeded", "Nonce expired; request a new one");
    }

    const ok = nacl.sign.detached.verify(message, sigBytes, pubkeyBytes);
    if (!ok) {
      throw new HttpsError("permission-denied", "Signature verification failed");
    }

    tx.delete(nonceRef);
  });

  const adminDoc = await db.collection("admins").doc(normalized).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Wallet is not an authorized admin");
  }

  const roleData = adminDoc.data();
  if (roleData?.role && roleData.role !== "admin") {
    throw new HttpsError("permission-denied", "Invalid admin role");
  }

  const customToken = await admin.auth().createCustomToken(normalized, {
    admin: true,
    wallet: normalized,
  });

  return { customToken };
});
