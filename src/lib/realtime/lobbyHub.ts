/**
 * Ephemeral lobby realtime: chat, WebRTC signaling merge, spectators, mic/speaker, mute relay.
 * Single WebSocket per challenge per tab; no Firestore for these paths.
 */

export const MAX_VOICE_SPEAKERS = 2;

export type LobbyRole = "participant" | "spectator";

function isLocalhostLobbyWsUrl(url: string): boolean {
  try {
    const normalized = url.replace(/^ws(s?):/i, "http$1:");
    const { hostname } = new URL(normalized);
    const host = hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "0.0.0.0";
  } catch {
    return /localhost|127\.0\.0\.1|\[::1\]/i.test(url);
  }
}

let warnedLocalhostInProd = false;

export function getLobbyWsUrl(): string {
  const u = import.meta.env?.VITE_LOBBY_WS_URL;
  if (u != null && String(u).trim() !== "") {
    const trimmed = String(u).trim();
    if (!import.meta.env?.DEV && isLocalhostLobbyWsUrl(trimmed)) {
      if (!warnedLocalhostInProd) {
        console.warn(
          "[LobbyHub] Ignoring localhost WebSocket URL in production. Set VITE_LOBBY_WS_URL to a public wss:// endpoint.",
        );
        warnedLocalhostInProd = true;
      }
      return "";
    }
    return trimmed;
  }
  if (import.meta.env?.DEV) return "ws://127.0.0.1:8787";
  return "";
}

/** True when the client may connect to the lobby WebSocket (env set, or dev default). */
export function isLobbyWsConfigured(): boolean {
  return getLobbyWsUrl() !== "";
}

type HubEvent =
  | "chat"
  | "vdoc"
  | "spectators"
  | "voice_state"
  | "mic_snapshot"
  | "voice_control"
  | "error"
  | "open"
  | "close";

type HubListener = (payload: unknown) => void;

const hubs = new Map<string, LobbyHub>();

export function getActiveLobbyHub(challengeId: string): LobbyHub | undefined {
  return hubs.get(challengeId);
}

/** Broadcast a system line to everyone in the room (only if this tab holds an active hub). */
export function broadcastLobbySystemMessage(challengeId: string, text: string): void {
  const hub = hubs.get(challengeId);
  if (!hub?.isConnected()) return;
  hub.sendRaw({ type: "system", text });
}

export function acquireLobbyHub(challengeId: string): LobbyHub {
  let h = hubs.get(challengeId);
  if (!h) {
    h = new LobbyHub(challengeId);
    hubs.set(challengeId, h);
  }
  h.refCount += 1;
  return h;
}

export function releaseLobbyHub(challengeId: string): void {
  const h = hubs.get(challengeId);
  if (!h) return;
  h.refCount -= 1;
  if (h.refCount <= 0) {
    h.destroy();
    hubs.delete(challengeId);
  }
}

export class LobbyHub {
  readonly roomId: string;
  refCount = 0;
  private ws: WebSocket | null = null;
  private wallet: string | null = null;
  private role: LobbyRole = "participant";
  private intentionalClose = false;
  private listeners = new Map<HubEvent, Set<HubListener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  isConnected(): boolean {
    return this.ws != null && this.ws.readyState === WebSocket.OPEN;
  }

  on(ev: HubEvent, fn: HubListener): void {
    let set = this.listeners.get(ev);
    if (!set) {
      set = new Set();
      this.listeners.set(ev, set);
    }
    set.add(fn);
  }

  off(ev: HubEvent, fn: HubListener): void {
    this.listeners.get(ev)?.delete(fn);
  }

  private emit(ev: HubEvent, payload?: unknown): void {
    this.listeners.get(ev)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error("[LobbyHub] listener error", ev, e);
      }
    });
  }

  connect(wallet: string, role: LobbyRole): void {
    this.wallet = wallet;
    this.role = role;
    this.intentionalClose = false;
    this.openSocket();
  }

  /** Update role/wallet and reconnect if changed. */
  reconnectIfNeeded(wallet: string, role: LobbyRole): void {
    if (this.wallet === wallet && this.role === role && this.isConnected()) return;
    this.wallet = wallet;
    this.role = role;
    if (this.ws) {
      this.intentionalClose = true;
      this.ws.close();
      this.ws = null;
    }
    this.openSocket();
  }

  private openSocket(): void {
    const url = getLobbyWsUrl();
    if (!url || !this.wallet) {
      this.emit("error", new Error("Lobby WebSocket URL or wallet missing"));
      return;
    }
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      this.emit("error", e);
      return;
    }

    this.ws.onopen = () => {
      this.sendRaw({
        type: "join",
        room: this.roomId,
        wallet: this.wallet,
        role: this.role,
      });
      this.emit("open", undefined);
    };

    this.ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      const t = msg.type as string;
      if (t === "chat") this.emit("chat", msg);
      else if (t === "vdoc") this.emit("vdoc", msg.data);
      else if (t === "spectators") this.emit("spectators", msg.wallets);
      else if (t === "voice_state") this.emit("voice_state", msg.speakerWallets);
      else if (t === "mic_snapshot") this.emit("mic_snapshot", msg.requests);
      else if (t === "voice_control") this.emit("voice_control", { target: msg.target, muted: msg.muted });
      else if (t === "error") this.emit("error", new Error(String(msg.message || "Lobby error")));
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.emit("close", undefined);
      if (!this.intentionalClose && this.refCount > 0 && this.wallet) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.openSocket();
        }, 1200);
      }
    };

    this.ws.onerror = () => {
      this.emit("error", new Error("WebSocket error"));
    };
  }

  sendRaw(obj: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(obj));
  }

  sendChat(text: string, sender: string): void {
    this.sendRaw({ type: "chat", text, sender });
  }

  mergeVdoc(payload: Record<string, unknown>): void {
    this.sendRaw({ type: "vdoc_merge", payload });
  }

  purgeSignaling(): void {
    this.sendRaw({ type: "vdoc_purge_signaling" });
  }

  muteAllSpectators(): void {
    this.sendRaw({ type: "mute_all_spectators" });
  }

  sendVoiceControl(target: string, muted: boolean): void {
    this.sendRaw({ type: "voice_control", target, muted });
  }

  sendMicRequest(wallet: string): void {
    this.sendRaw({ type: "mic_request", wallet });
  }

  sendMicDeny(wallet: string): void {
    this.sendRaw({ type: "mic_deny", wallet });
  }

  sendMicApprove(wallet: string): void {
    this.sendRaw({ type: "mic_approve", wallet });
  }

  sendMicApproveReplace(requesterWallet: string, replaceWallet: string): void {
    this.sendRaw({ type: "mic_approve_replace", requesterWallet, replaceWallet });
  }

  sendSpeakerAdd(wallet: string): void {
    this.sendRaw({ type: "speaker_add", wallet });
  }

  sendSpeakerRemove(wallet: string): void {
    this.sendRaw({ type: "speaker_remove", wallet });
  }

  destroy(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

export async function createMicRequest(challengeId: string, wallet: string): Promise<void> {
  const hub = getActiveLobbyHub(challengeId);
  if (!hub) throw new Error("Lobby not connected");
  hub.sendMicRequest(wallet);
}

export async function approveMicRequest(challengeId: string, wallet: string, _respondedBy: string): Promise<boolean> {
  const hub = getActiveLobbyHub(challengeId);
  if (!hub) return false;
  hub.sendMicApprove(wallet);
  return true;
}

export async function approveMicRequestReplace(
  challengeId: string,
  requesterWallet: string,
  replaceWallet: string,
  _respondedBy: string
): Promise<void> {
  const hub = getActiveLobbyHub(challengeId);
  if (!hub) return;
  hub.sendMicApproveReplace(requesterWallet, replaceWallet);
}

export async function denyMicRequest(challengeId: string, wallet: string, _respondedBy: string): Promise<void> {
  const hub = getActiveLobbyHub(challengeId);
  if (!hub) return;
  hub.sendMicDeny(wallet);
}

export async function addSpeaker(challengeId: string, wallet: string): Promise<boolean> {
  const hub = getActiveLobbyHub(challengeId);
  if (!hub) return false;
  hub.sendSpeakerAdd(wallet);
  return true;
}

export async function removeSpeaker(challengeId: string, wallet: string): Promise<void> {
  const hub = getActiveLobbyHub(challengeId);
  if (!hub) return;
  hub.sendSpeakerRemove(wallet);
}
