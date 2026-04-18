import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 10;

/**
 * Sliding window rate limit (Firestore-backed for multi-instance safety).
 */
export async function enforceRateLimit(bucketId: string): Promise<void> {
  const db = getFirestore();
  const ref = db.collection("_rate_limits").doc(bucketId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();

    if (!snap.exists) {
      tx.set(ref, {
        count: 1,
        windowStart: Timestamp.fromMillis(now),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const d = snap.data()!;
    const start = (d.windowStart as Timestamp).toMillis();
    const count = (d.count as number) ?? 0;

    if (now - start > WINDOW_MS) {
      tx.set(ref, {
        count: 1,
        windowStart: Timestamp.fromMillis(now),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    if (count >= MAX_PER_WINDOW) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many requests. Try again in a minute."
      );
    }

    tx.update(ref, {
      count: count + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export function clientIpFromRequest(
  raw: { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } } | undefined
): string {
  if (!raw?.headers) return "unknown";
  const xf = raw.headers["x-forwarded-for"];
  const first =
    typeof xf === "string"
      ? xf.split(",")[0]?.trim()
      : Array.isArray(xf)
        ? xf[0]?.split(",")[0]?.trim()
        : undefined;
  if (first) return first.replace(/[^a-fA-F0-9.:]/g, "_").slice(0, 128);
  const ip = raw.socket?.remoteAddress ?? "unknown";
  return String(ip).replace(/[^a-fA-F0-9.:]/g, "_").slice(0, 128);
}
