import { auth, app } from "@/lib/firebase/config";

const PREFIX = "[wallet-recovery]";
const FUNCTIONS_REGION = "us-central1";

export type WalletRecoveryLogContext = Record<string, unknown>;

export function logRecoveryStep(
  step:
    | "start"
    | "nonce:request"
    | "nonce:success"
    | "nonce:failed"
    | "sign:start"
    | "sign:success"
    | "rebind:start"
    | "rebind:success"
    | "rebind:failed",
  detail?: WalletRecoveryLogContext
): void {
  const line = `${PREFIX} ${step}`;
  if (step.endsWith(":failed")) {
    console.error(line, detail ?? {});
  } else {
    console.info(line, detail ?? {});
  }
}

/** Full error snapshot for recovery failure diagnosis. */
export function serializeRecoveryError(err: unknown): {
  code: string | null;
  message: string | null;
  details: unknown;
  name: string | null;
  stack: string | null;
} {
  if (!err || typeof err !== "object") {
    return {
      code: null,
      message: String(err),
      details: null,
      name: null,
      stack: null,
    };
  }
  const e = err as {
    code?: string;
    message?: string;
    details?: unknown;
    name?: string;
    stack?: string;
  };
  return {
    code: e.code ?? null,
    message: e.message ?? null,
    details: e.details ?? null,
    name: e.name ?? null,
    stack: e.stack ?? null,
  };
}

/** @deprecated use serializeRecoveryError */
export function serializeFirebaseFunctionsError(
  err: unknown
): { code: string | null; message: string | null; details: unknown } {
  const s = serializeRecoveryError(err);
  return { code: s.code, message: s.message, details: s.details };
}

/** Log auth session immediately before nonce callable (token refresh runs next). */
export function logRecoveryAuthBeforeNonce(): void {
  console.info(`${PREFIX} nonce:auth`, {
    authUid: auth.currentUser?.uid ?? null,
    isAnonymous: auth.currentUser?.isAnonymous ?? null,
  });
}

export function logRecoveryFailure(
  step: "nonce:failed" | "rebind:failed",
  err: unknown,
  detail?: WalletRecoveryLogContext
): void {
  console.error("[wallet-recovery] raw-error", err);
  console.error(`${PREFIX} ${step}`, {
    ...(detail ?? {}),
    error: serializeRecoveryError(err),
  });
}

export function recoveryEnvironment(): WalletRecoveryLogContext {
  const projectId =
    app.options.projectId ??
    import.meta.env.VITE_FIREBASE_PROJECT_ID ??
    "unknown";
  return {
    projectId,
    region: FUNCTIONS_REGION,
    authUid: auth.currentUser?.uid ?? null,
    emulator: false,
    callableName: null,
    legacyCallableUrl: null,
  };
}

export function legacyCallableUrl(name: string): string {
  const projectId =
    app.options.projectId ??
    import.meta.env.VITE_FIREBASE_PROJECT_ID ??
    "unknown";
  return `https://${FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/${name}`;
}

export function formatCallableErrorMessage(err: unknown, callableName: string): string {
  const { code, message } = serializeRecoveryError(err);

  if (code === "functions/not-found") {
    return (
      `Recovery service unavailable (${callableName} not deployed). ` +
      `Expected Firebase callable in ${FUNCTIONS_REGION} for project ${recoveryEnvironment().projectId}.`
    );
  }
  if (code === "functions/unauthenticated") {
    return "Firebase sign-in required before wallet recovery. Refresh and try again.";
  }
  if (code === "functions/unavailable" || code === "functions/deadline-exceeded") {
    return `Recovery service temporarily unavailable (${callableName}). Try again shortly.`;
  }
  if (code === "functions/permission-denied") {
    return message || "Wallet signature verification failed.";
  }
  if (code === "functions/resource-exhausted") {
    return message || "Too many recovery attempts. Wait a minute and try again.";
  }
  return message || `Recovery failed at ${callableName}.`;
}
