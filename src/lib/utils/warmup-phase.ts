import type { ChallengeData } from "@/lib/firebase/firestore";
import {
  getEffectiveChallengeRoster,
  normalizeWinnerWallet,
  walletsEqual,
} from "@/lib/firebase/firestore";

export type WarmupStatus = "disabled" | "waiting" | "active" | "completed" | "skipped";
export type OfficialMatchStatus = "waiting_ready" | "live" | "completed";

export function readChallengeField<T>(
  challenge: ChallengeData | Record<string, unknown>,
  key: string,
  fallback?: T
): T | undefined {
  const c = challenge as ChallengeData;
  const raw = c.rawData as Record<string, unknown> | undefined;
  if (c[key as keyof ChallengeData] !== undefined) {
    return c[key as keyof ChallengeData] as T;
  }
  if (raw && raw[key] !== undefined) {
    return raw[key] as T;
  }
  return fallback;
}

export function isWarmupEnabled(challenge: ChallengeData | Record<string, unknown>): boolean {
  return readChallengeField<boolean>(challenge, "warmupEnabled") === true;
}

export function getWarmupStatus(
  challenge: ChallengeData | Record<string, unknown>
): WarmupStatus {
  const v = readChallengeField<string>(challenge, "warmupStatus");
  if (v === "disabled" || v === "waiting" || v === "active" || v === "completed" || v === "skipped") {
    return v;
  }
  return isWarmupEnabled(challenge) ? "waiting" : "disabled";
}

export function getOfficialMatchStatus(
  challenge: ChallengeData | Record<string, unknown>
): OfficialMatchStatus | undefined {
  const v = readChallengeField<string>(challenge, "officialMatchStatus");
  if (v === "waiting_ready" || v === "live" || v === "completed") {
    return v;
  }
  if (!isWarmupEnabled(challenge)) {
    return "live";
  }
  return undefined;
}

export function getAckMap(
  challenge: ChallengeData | Record<string, unknown>,
  field: "warmupCompleteBy" | "officialReadyBy"
): Record<string, boolean> {
  const map = readChallengeField<Record<string, boolean>>(challenge, field) || {};
  const normalized: Record<string, boolean> = {};
  Object.entries(map).forEach(([k, v]) => {
    if (v) normalized[normalizeWinnerWallet(k)] = true;
  });
  return normalized;
}

export function bothRosterPlayersAcknowledged(
  ackMap: Record<string, boolean>,
  roster: string[]
): boolean {
  if (roster.length !== 2) return false;
  return roster.every((w) => ackMap[normalizeWinnerWallet(w)] === true);
}

export function isWarmupPhaseBlockingSubmit(challenge: ChallengeData | Record<string, unknown>): boolean {
  if (!isWarmupEnabled(challenge)) return false;
  return getOfficialMatchStatus(challenge) !== "live";
}

export function canSubmitOfficialResults(challenge: ChallengeData | Record<string, unknown>): boolean {
  if (!isWarmupEnabled(challenge)) return true;
  return getOfficialMatchStatus(challenge) === "live";
}

export function isWarmupAwaitingComplete(challenge: ChallengeData | Record<string, unknown>): boolean {
  if (!isWarmupEnabled(challenge)) return false;
  const st = getWarmupStatus(challenge);
  return st === "waiting" || st === "active";
}

export function isWarmupComplete(challenge: ChallengeData | Record<string, unknown>): boolean {
  const st = getWarmupStatus(challenge);
  return st === "completed" || st === "skipped";
}

export function isWaitingOfficialReady(challenge: ChallengeData | Record<string, unknown>): boolean {
  if (!isWarmupEnabled(challenge)) return false;
  return isWarmupComplete(challenge) && getOfficialMatchStatus(challenge) === "waiting_ready";
}

export function isOfficialMatchLive(challenge: ChallengeData | Record<string, unknown>): boolean {
  if (!isWarmupEnabled(challenge)) return true;
  return getOfficialMatchStatus(challenge) === "live";
}

export function hasPlayerAcknowledged(
  challenge: ChallengeData | Record<string, unknown>,
  field: "warmupCompleteBy" | "officialReadyBy",
  wallet: string
): boolean {
  const map = getAckMap(challenge, field);
  return map[normalizeWinnerWallet(wallet)] === true;
}

export function getOpponentWallet(challenge: ChallengeData, wallet: string): string | null {
  const roster = getEffectiveChallengeRoster(challenge);
  const other = roster.find((p) => !walletsEqual(p, wallet));
  return other || null;
}
