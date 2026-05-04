/**
 * Ephemeral lobby relay: chat, WebRTC signaling merge, spectators, mic/speaker state.
 * No persistence. Run: `node server/lobby-room.mjs` (see package.json "lobby-ws").
 * Set client VITE_LOBBY_WS_URL (e.g. ws://127.0.0.1:8787).
 */
import { WebSocketServer } from "ws";

const PORT = Number(process.env.LOBBY_WS_PORT || 8787);
const MAX_SPEAKERS = 2;
const MAX_SPECTATORS = 69;

/** @typedef {{ ws: import('ws'), wallet: string, role: string }} Client */

/** @type {Map<string, { clients: Set<Client>, voiceDoc: Record<string, unknown>, spectators: Set<string>, speakers: string[], mic: Map<string, string> }>} */
const rooms = new Map();

function getRoom(roomId) {
  let r = rooms.get(roomId);
  if (!r) {
    r = {
      clients: new Set(),
      voiceDoc: {},
      spectators: new Set(),
      speakers: [],
      mic: new Map(),
    };
    rooms.set(roomId, r);
  }
  return r;
}

function broadcast(roomId, msg, exceptWs = null) {
  const r = rooms.get(roomId);
  if (!r) return;
  const raw = JSON.stringify(msg);
  for (const c of r.clients) {
    if (exceptWs && c.ws === exceptWs) continue;
    if (c.ws.readyState === 1) c.ws.send(raw);
  }
}

function stripWalletSignalingFromVdoc(roomId, wallet) {
  const r = rooms.get(roomId);
  if (!r || !wallet) return;
  const wl = wallet.toLowerCase();
  const vd = { ...r.voiceDoc };
  let changed = false;
  for (const k of Object.keys(vd)) {
    if (k.startsWith("ice|")) {
      const segs = k.split("|");
      if (segs.length >= 3 && segs[1].toLowerCase() === wl) {
        delete vd[k];
        changed = true;
      }
    } else if (k.startsWith("candidate_")) {
      const rest = k.slice("candidate_".length);
      const idx = rest.lastIndexOf("_");
      if (idx > 0 && rest.slice(0, idx).toLowerCase() === wl) {
        delete vd[k];
        changed = true;
      }
    }
  }
  if (changed) {
    r.voiceDoc = vd;
    broadcast(roomId, { type: "vdoc", data: { ...r.voiceDoc } });
  }
}

function removeClient(roomId, ws) {
  const r = rooms.get(roomId);
  if (!r) return;
  let wallet = "";
  let role = "participant";
  for (const c of r.clients) {
    if (c.ws === ws) {
      wallet = c.wallet;
      role = c.role || "participant";
      r.clients.delete(c);
      break;
    }
  }
  if (wallet) stripWalletSignalingFromVdoc(roomId, wallet);
  if (wallet && role === "spectator") {
    let specCanon = null;
    for (const s of r.spectators) {
      if (s.toLowerCase() === wallet.toLowerCase()) {
        specCanon = s;
        break;
      }
    }
    if (specCanon != null) {
      r.spectators.delete(specCanon);
      broadcast(roomId, { type: "spectators", wallets: [...r.spectators] });
    }
  }
  r.speakers = r.speakers.filter((w) => w.toLowerCase() !== wallet.toLowerCase());
  broadcast(roomId, { type: "voice_state", speakerWallets: [...r.speakers] });
  if (r.clients.size === 0) {
    rooms.delete(roomId);
  }
}

function mergeVoiceDoc(roomId, patch) {
  const r = getRoom(roomId);
  r.voiceDoc = { ...r.voiceDoc, ...patch };
  broadcast(roomId, { type: "vdoc", data: { ...r.voiceDoc } });
}

function handleMessage(roomId, ws, msg) {
  const r = getRoom(roomId);
  switch (msg.type) {
    case "join": {
      const wallet = String(msg.wallet || "");
      const role = String(msg.role || "participant");
      if (!wallet) return;
      for (const c of [...r.clients]) {
        if (c.ws === ws) r.clients.delete(c);
      }
      r.clients.add({ ws, wallet, role });
      if (role === "spectator") {
        const dup = [...r.spectators].some((s) => s.toLowerCase() === wallet.toLowerCase());
        if (dup) {
          ws.send(JSON.stringify({ type: "joined", roomId }));
          ws.send(JSON.stringify({ type: "vdoc", data: { ...r.voiceDoc } }));
          ws.send(JSON.stringify({ type: "voice_state", speakerWallets: [...r.speakers] }));
          ws.send(JSON.stringify({ type: "mic_snapshot", requests: Object.fromEntries(r.mic) }));
          break;
        }
        if (r.spectators.size >= MAX_SPECTATORS) {
          ws.send(JSON.stringify({ type: "error", message: "Spectator limit" }));
          return;
        }
        r.spectators.add(wallet);
        broadcast(roomId, { type: "spectators", wallets: [...r.spectators] });
      }
      ws.send(JSON.stringify({ type: "joined", roomId }));
      broadcast(roomId, { type: "vdoc", data: { ...r.voiceDoc } });
      broadcast(roomId, { type: "voice_state", speakerWallets: [...r.speakers] });
      broadcast(roomId, { type: "mic_snapshot", requests: Object.fromEntries(r.mic) });
      break;
    }
    case "chat": {
      const text = String(msg.text || "").slice(0, 2000);
      if (!text) return;
      const sender = String(msg.sender || "");
      broadcast(roomId, {
        type: "chat",
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text,
        sender,
        ts: Date.now(),
      });
      break;
    }
    case "system": {
      const text = String(msg.text || "").slice(0, 2000);
      broadcast(roomId, {
        type: "chat",
        id: `${Date.now()}-sys`,
        text,
        sender: "SYSTEM",
        ts: Date.now(),
      });
      break;
    }
    case "vdoc_merge": {
      if (!msg.payload || typeof msg.payload !== "object") return;
      mergeVoiceDoc(roomId, msg.payload);
      break;
    }
    case "mic_request": {
      const w = String(msg.wallet || "").toLowerCase();
      if (!w) return;
      r.mic.set(w, "pending");
      broadcast(roomId, { type: "mic_snapshot", requests: Object.fromEntries(r.mic) });
      break;
    }
    case "mic_deny": {
      const w = String(msg.wallet || "").toLowerCase();
      r.mic.set(w, "denied");
      broadcast(roomId, { type: "mic_snapshot", requests: Object.fromEntries(r.mic) });
      break;
    }
    case "mic_approve": {
      const w = String(msg.wallet || "");
      const lower = w.toLowerCase();
      if (!w) return;
      if (r.speakers.length >= MAX_SPEAKERS) {
        broadcast(roomId, { type: "mic_snapshot", requests: Object.fromEntries(r.mic) });
        return;
      }
      if (r.speakers.some((x) => x.toLowerCase() === lower)) {
        r.mic.set(lower, "approved");
        broadcast(roomId, { type: "mic_snapshot", requests: Object.fromEntries(r.mic) });
        return;
      }
      r.speakers.push(w);
      r.mic.set(lower, "approved");
      broadcast(roomId, { type: "voice_state", speakerWallets: [...r.speakers] });
      broadcast(roomId, { type: "mic_snapshot", requests: Object.fromEntries(r.mic) });
      break;
    }
    case "mic_approve_replace": {
      const requester = String(msg.requesterWallet || "");
      const replace = String(msg.replaceWallet || "");
      const next = r.speakers.filter((x) => x.toLowerCase() !== replace.toLowerCase());
      if (next.length === r.speakers.length) break;
      const rl = requester.toLowerCase();
      if (next.some((x) => x.toLowerCase() === rl)) {
        r.mic.set(rl, "approved");
        broadcast(roomId, { type: "mic_snapshot", requests: Object.fromEntries(r.mic) });
        break;
      }
      r.speakers = [...next, requester];
      r.mic.set(rl, "approved");
      broadcast(roomId, { type: "voice_state", speakerWallets: [...r.speakers] });
      broadcast(roomId, { type: "mic_snapshot", requests: Object.fromEntries(r.mic) });
      break;
    }
    case "speaker_add": {
      const w = String(msg.wallet || "");
      if (!w) return;
      const lower = w.toLowerCase();
      if (r.speakers.length >= MAX_SPEAKERS) break;
      if (r.speakers.some((x) => x.toLowerCase() === lower)) break;
      r.speakers.push(w);
      broadcast(roomId, { type: "voice_state", speakerWallets: [...r.speakers] });
      break;
    }
    case "speaker_remove": {
      const w = String(msg.wallet || "");
      r.speakers = r.speakers.filter((x) => x.toLowerCase() !== w.toLowerCase());
      broadcast(roomId, { type: "voice_state", speakerWallets: [...r.speakers] });
      break;
    }
    case "voice_control": {
      broadcast(roomId, {
        type: "voice_control",
        target: String(msg.target || ""),
        muted: !!msg.muted,
      });
      break;
    }
    case "mute_all_spectators": {
      for (const sw of r.spectators) {
        broadcast(roomId, { type: "voice_control", target: sw, muted: true });
      }
      break;
    }
    case "vdoc_purge_signaling": {
      const vd = { ...r.voiceDoc };
      delete vd.offer;
      delete vd.answer;
      delete vd.offerFrom;
      delete vd.answerFrom;
      delete vd.timestamp;
      for (const k of Object.keys(vd)) {
        if (k.startsWith("candidate_") || k.startsWith("ice|")) delete vd[k];
      }
      r.voiceDoc = vd;
      broadcast(roomId, { type: "vdoc", data: { ...r.voiceDoc } });
      break;
    }
    default:
      break;
  }
}

const wss = new WebSocketServer({ port: PORT });
console.log(`[lobby-room] WebSocket listening on :${PORT}`);

wss.on("connection", (ws) => {
  /** @type {string | null} */
  let roomId = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (msg.type === "join" && msg.room) {
      roomId = String(msg.room);
      handleMessage(roomId, ws, msg);
      return;
    }
    if (!roomId) return;
    handleMessage(roomId, ws, msg);
  });

  ws.on("close", () => {
    if (roomId) removeClient(roomId, ws);
  });
});
