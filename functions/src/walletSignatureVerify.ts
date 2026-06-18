import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { normalizeAddress } from "./normalizeAddress";

export const WALLET_NONCE_TTL_MS = 5 * 60 * 1000;

export function parseEd25519Signature(signatureB64: string): Uint8Array {
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

export function parseWalletAddress(addressRaw: string): {
  normalized: string;
  pubkeyBytes: Uint8Array;
  displayAddress: string;
} {
  const displayAddress = addressRaw.trim();
  const normalized = normalizeAddress(displayAddress);
  if (!normalized) {
    throw new HttpsError("invalid-argument", "Invalid address");
  }
  let pubkeyBytes: Uint8Array;
  try {
    pubkeyBytes = new PublicKey(displayAddress).toBytes();
  } catch {
    throw new HttpsError("invalid-argument", "Invalid Solana address");
  }
  if (pubkeyBytes.length !== 32) {
    throw new HttpsError("invalid-argument", "Invalid public key");
  }
  return { normalized, pubkeyBytes, displayAddress };
}

/**
 * Verify detached ed25519 signature over UTF-8 nonce and consume the nonce doc atomically.
 */
export async function verifyAndConsumeWalletNonce(params: {
  collection: string;
  nonce: string;
  addressRaw: string;
  signatureB64: string;
}): Promise<{ normalized: string; displayAddress: string }> {
  const { normalized, pubkeyBytes, displayAddress } = parseWalletAddress(params.addressRaw);

  if (typeof params.nonce !== "string" || params.nonce.length < 16 || params.nonce.length > 128) {
    throw new HttpsError("invalid-argument", "Invalid nonce");
  }

  const sigBytes = parseEd25519Signature(params.signatureB64);
  const message = new TextEncoder().encode(params.nonce);
  const db = getFirestore();
  const nonceRef = db.collection(params.collection).doc(params.nonce);

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
    if (ageMs > WALLET_NONCE_TTL_MS) {
      throw new HttpsError("deadline-exceeded", "Nonce expired; request a new one");
    }

    const ok = nacl.sign.detached.verify(message, sigBytes, pubkeyBytes);
    if (!ok) {
      throw new HttpsError("permission-denied", "Signature verification failed");
    }

    tx.delete(nonceRef);
  });

  return { normalized, displayAddress };
}

export { FieldValue, getFirestore, Timestamp };
