/**
 * Voice chat lifecycle diagnostics — console prefix [voice-audit].
 * No architecture changes; logging only.
 */

export type VoiceAuditPhase =
  | 'mount'
  | 'permission'
  | 'getUserMedia'
  | 'local-track'
  | 'peer-connection'
  | 'ice-candidate'
  | 'ice-state'
  | 'connection-state'
  | 'signaling'
  | 'remote-track'
  | 'playback'
  | 'state'
  | 'cleanup'
  | 'error';

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

export function voiceAudit(
  phase: VoiceAuditPhase,
  message: string,
  data?: Record<string, unknown>
): void {
  const payload = data && Object.keys(data).length > 0 ? data : undefined;
  if (payload) {
    console.info(`[voice-audit] ${ts()} ${phase} ${message}`, payload);
  } else {
    console.info(`[voice-audit] ${ts()} ${phase} ${message}`);
  }
}

export function voiceAuditWarn(
  phase: VoiceAuditPhase,
  message: string,
  data?: Record<string, unknown>
): void {
  const payload = data && Object.keys(data).length > 0 ? data : undefined;
  if (payload) {
    console.warn(`[voice-audit] ${ts()} ${phase} ${message}`, payload);
  } else {
    console.warn(`[voice-audit] ${ts()} ${phase} ${message}`);
  }
}

export function voiceAuditError(
  phase: VoiceAuditPhase,
  message: string,
  err?: unknown,
  data?: Record<string, unknown>
): void {
  const errName = err instanceof Error ? err.name : err != null ? 'UnknownError' : undefined;
  const errMsg = err instanceof Error ? err.message : err != null ? String(err) : undefined;
  console.error(`[voice-audit] ${ts()} ${phase} ${message}`, {
    ...data,
    ...(errName ? { errorName: errName } : {}),
    ...(errMsg ? { errorMessage: errMsg } : {}),
  });
}

/** Normalize participant wallets and derive deterministic offerer (lexicographic). */
export function resolveVoiceRoles(
  participants: string[],
  currentWallet: string
): {
  participants: string[];
  sortedWallets: string[];
  offererWallet: string | null;
  answererWallet: string | null;
  currentWallet: string;
  amOfferer: boolean;
  amAnswerer: boolean;
} {
  const sortedWallets = [...participants].map((p) => p?.toLowerCase()).filter(Boolean).sort();
  const offererWallet = sortedWallets[0] ?? null;
  const answererWallet = sortedWallets.length >= 2 ? sortedWallets[1] : null;
  const cw = currentWallet?.toLowerCase() ?? '';
  const amOfferer = sortedWallets.length === 0 || cw === offererWallet;
  const amAnswerer = answererWallet != null && cw === answererWallet;
  return {
    participants: [...participants],
    sortedWallets,
    offererWallet,
    answererWallet,
    currentWallet,
    amOfferer,
    amAnswerer,
  };
}

const lifecycleMilestones = {
  getUserMediaSucceeded: false,
  getUserMediaFailed: false,
  lastGetUserMediaError: null as { name: string; message: string } | null,
  offerCreated: false,
  answerReceived: false,
  iceConnected: false,
  ontrackFired: false,
  playbackStarted: false,
};

export function voiceLifecycleMark(
  key: keyof Omit<typeof lifecycleMilestones, 'lastGetUserMediaError'>,
  value = true
): void {
  lifecycleMilestones[key] = value;
}

export function voiceLifecycleSetGetUserMediaError(err: unknown): void {
  lifecycleMilestones.getUserMediaFailed = true;
  lifecycleMilestones.lastGetUserMediaError = {
    name: err instanceof Error ? err.name : 'UnknownError',
    message: err instanceof Error ? err.message : String(err),
  };
}

export function getVoiceLifecycleReport(): typeof lifecycleMilestones & { at: string } {
  return { ...lifecycleMilestones, at: new Date().toISOString() };
}

/** Query microphone permission when Permissions API is available. */
export async function auditMicPermissionState(): Promise<
  PermissionState | 'unsupported' | 'error'
> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return 'unsupported';
    }
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch {
    return 'error';
  }
}

export function auditLocalStream(stream: MediaStream | null | undefined): Record<string, unknown> {
  if (!stream) return { exists: false };
  const audioTracks = stream.getAudioTracks();
  return {
    exists: true,
    streamId: stream.id,
    active: stream.active,
    audioTrackCount: audioTracks.length,
    tracks: audioTracks.map((t) => ({
      id: t.id,
      label: t.label,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState,
    })),
  };
}

export function auditRemoteStream(stream: MediaStream | null | undefined): Record<string, unknown> {
  if (!stream) return { exists: false };
  return {
    exists: true,
    streamId: stream.id,
    active: stream.active,
    audioTracks: stream.getAudioTracks().map((t) => ({
      id: t.id,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState,
    })),
  };
}

export function auditAudioElement(el: HTMLAudioElement | null | undefined): Record<string, unknown> {
  if (!el) return { mounted: false };
  return {
    mounted: true,
    paused: el.paused,
    muted: el.muted,
    volume: el.volume,
    autoplay: el.autoplay,
    readyState: el.readyState,
    hasSrcObject: el.srcObject != null,
    srcObjectStreamId:
      el.srcObject instanceof MediaStream ? el.srcObject.id : null,
  };
}

export function auditPeerConnection(pc: RTCPeerConnection | null | undefined): Record<string, unknown> {
  if (!pc) return { exists: false };
  return {
    exists: true,
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
    signalingState: pc.signalingState,
    senderCount: pc.getSenders().length,
    receiverCount: pc.getReceivers().length,
    localDescriptionType: pc.localDescription?.type ?? null,
    remoteDescriptionType: pc.remoteDescription?.type ?? null,
  };
}

type VoiceAuditCounters = {
  getUserMediaAttempts: number;
  getUserMediaSuccess: number;
  getUserMediaErrors: number;
  iceCandidatesSent: number;
  iceCandidatesReceived: number;
  signalingOffersSent: number;
  signalingOffersReceived: number;
  signalingAnswersSent: number;
  signalingAnswersReceived: number;
  remoteTracksReceived: number;
  playbackAttempts: number;
  playbackFailures: number;
};

const counters: VoiceAuditCounters = {
  getUserMediaAttempts: 0,
  getUserMediaSuccess: 0,
  getUserMediaErrors: 0,
  iceCandidatesSent: 0,
  iceCandidatesReceived: 0,
  signalingOffersSent: 0,
  signalingOffersReceived: 0,
  signalingAnswersSent: 0,
  signalingAnswersReceived: 0,
  remoteTracksReceived: 0,
  playbackAttempts: 0,
  playbackFailures: 0,
};

export function voiceAuditCount(
  key: keyof VoiceAuditCounters,
  delta = 1
): void {
  counters[key] += delta;
}

export function getVoiceAuditSummary(): VoiceAuditCounters & { at: string } {
  return { ...counters, at: new Date().toISOString() };
}

declare global {
  interface Window {
    __voiceAuditSummary?: () => ReturnType<typeof getVoiceAuditSummary>;
    __voiceLifecycleReport?: () => ReturnType<typeof getVoiceLifecycleReport>;
  }
}

export function installVoiceAuditSummary(): void {
  if (typeof window === 'undefined') return;
  window.__voiceAuditSummary = getVoiceAuditSummary;
  window.__voiceLifecycleReport = getVoiceLifecycleReport;
  voiceAudit('state', 'voice-audit instrumentation ready');
}
