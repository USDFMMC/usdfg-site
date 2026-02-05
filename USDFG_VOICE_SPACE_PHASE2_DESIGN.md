# Phase 2: X-Spaces-Level Voice Space (SFU) – Design Proposal

**PAUSED.** We are staying 100% zero-cost; no LiveKit/SFU or paid voice infrastructure. Voice remains browser-only WebRTC (Phase 1). This doc is for future reference only.

---

This document proposes an SFU-based “Voice Space” architecture to support unlimited listeners, Speaker/Listener modes, and robust behavior (e.g. Safari background playback). It is a design and integration plan only; no implementation is implied until approved.

---

## Goals

- **Listener mode:** Unlimited listeners; audio keeps playing when Safari (or other browsers) background the tab.
- **Speaker mode:** Participants publish mic to the SFU; spectators are listen-only during active match; creator mute and role/status rules preserved.
- **Near-zero connection issues:** Single media path, reconnection, and clear failure handling.

---

## Architecture Overview

- **Current:** 1:1 WebRTC over Firestore signaling (one offer/answer per challenge).
- **Target:** One “Voice Space” per challenge/lobby, backed by an **SFU (Selective Forwarding Unit)**. Clients connect to the SFU as either **Speaker** (send mic + receive mix) or **Listener** (receive mix only). The SFU receives all speaker streams and produces one mixed/subscribed stream for listeners (and optionally for speakers so they hear others).

---

## Modes

| Mode      | Send mic? | Receive? | Who uses it |
|-----------|-----------|----------|-------------|
| **Speaker** | Yes (to SFU) | Yes (mixed output from SFU) | Participants; spectators when match is not active (pre/post). |
| **Listener** | No | Yes only | Spectators during active match; optional “listen-only” for anyone. |

Rules:

- **Spectators during active match:** Listen-only (Listener mode). No mic published.
- **Spectators pre-match / post-match:** Can be Speaker (optional) or stay Listener.
- **Participants:** Always Speaker when voice is enabled; creator mute still applies (SFU can stop forwarding or client stops sending).

---

## Tech Options (Concrete)

### Option A: LiveKit (recommended for speed to ship)

- **What:** Managed SFU + SDK; handles signaling, media server, and reconnection.
- **Listener:** `Room.connect()` with `audio: true`, `publish: false` → receive only. No send track.
- **Speaker:** Publish one audio track; subscribe to room’s mixed/other participants.
- **Safari background:** LiveKit uses a single `AudioContext` and keeps it running; their SDK handles “play after user gesture” and background policies. Typically keeps playing when tab is in background if connection is kept alive.
- **Reconnection:** Built-in in the SDK (reconnect, re-subscribe).
- **Cost:** Usage-based (minutes/participant); free tier available.
- **Integration:** Replace Firestore signaling + `RTCPeerConnection` in `VoiceChat.tsx` with LiveKit `Room`; keep Firestore only for **role/status** (e.g. `challengeStatus`, `isSpectator`, creator mute) and optionally for “who is in the room” if not using LiveKit presence.

### Option B: Daily.co

- **What:** Managed SFU/video API; strong for video but supports audio-only.
- **Listener:** Join with “subscribe only” / no publish.
- **Speaker:** Publish local mic; subscribe to others.
- **Safari:** Similar to LiveKit; they handle audio context and reconnection.
- **Integration:** Replace current voice path with Daily’s `MeetingSession` or equivalent; keep app role/status in Firestore.

### Option C: Self-hosted SFU (e.g. mediasoup, Pion SFU)

- **What:** You run the SFU server; clients connect via WebRTC to it.
- **Listener:** Client connects with recvonly; SFU sends a single mixed or selective stream.
- **Speaker:** Client sends one audio track to SFU; SFU forwards to other speakers and to listeners.
- **Safari:** Same as today for playback; improving “background play” may require one `AudioContext` and user-gesture-first play (and possibly a small keepalive).
- **Cost:** Server + TURN/bandwidth; no per-minute vendor fee.
- **Integration:** New backend service; client uses WebRTC to SFU (signaling can stay Firestore or move to your backend). More work than Option A/B.

### Option D: Twilio Video (or Programmable Video)

- **What:** SFU and signaling from Twilio.
- **Listener:** Join as “viewer” / no publish.
- **Speaker:** Publish audio; subscribe to room.
- **Integration:** Replace current path with Twilio Room; keep Firestore for app roles and mute state.

**Recommendation:** **Option A (LiveKit)** for fastest path to X-Spaces-level behavior with minimal ops; Option C if you must avoid third-party and accept more engineering.

---

## Integration Steps (High Level)

### 1. Backend / config

- **LiveKit (Option A):** Create project; get API key, secret, and WebSocket URL. Optionally run LiveKit Server in your own infra. No change to Firestore schema for challenges; keep `challenge_lobbies/{id}/voice_controls/{wallet}` for creator mute.
- **Self-hosted (Option C):** Deploy SFU (e.g. mediasoup room); expose WebSocket or HTTP for signaling and ICE; configure TURN.

### 2. Client: token or join URL

- **LiveKit:** For each `challengeId` (or lobby id), your backend creates a short-lived **room token** (room name = e.g. `voice-{challengeId}`) with permissions:
  - **Speaker:** `canPublish: true`, `canSubscribe: true`.
  - **Listener:** `canPublish: false`, `canSubscribe: true`.
- Backend derives role from your app (participant vs spectator, match state) and sets permissions in the token. Client calls `Room.connect(url, token)`; no Firestore signaling for media.

### 3. Replace VoiceChat media path only

- Keep **same props**: `challengeId`, `currentWallet`, `challengeStatus`, `isSpectator`, `isCreator`, `participants`, `spectators`.
- Keep **creator mute**: Still read `challenge_lobbies/{id}/voice_controls/{wallet}`; when muted by creator, do not publish (or unpublish) mic.
- **Listen-only (spectator + active match):** Connect as Listener (e.g. token with `canPublish: false`). Do not request mic; do not publish. Only subscribe to remote track(s). On becoming listen-only, tear down publish and switch to Listener (or disconnect and reconnect as Listener).
- **Speaker:** Request mic once; publish one audio track to the room; subscribe to room audio. When user becomes listen-only, unpublish and switch to Listener (or reconnect as Listener).

### 4. Safari / background playback

- **LiveKit/Daily:** Rely on SDK’s single `AudioContext` and their documented behavior for background. Optionally, in your UI, call “resume audio” on first user gesture (e.g. “Join voice” or “Unmute”) so that autoplay policies are satisfied once.
- **Self-hosted:** Use one `AudioContext` for all remote audio; create it after user gesture; call `resume()` and attach remote stream to a destination that feeds an `<audio>` or the context’s destination. Keep connection alive with a small heartbeat so the tab isn’t fully suspended longer than needed.

### 5. Reconnection and failure

- **LiveKit/Daily:** Use SDK reconnection; show “Reconnecting…” in UI; on failure, show “Voice unavailable” and optionally a “Retry” that requests a new token and reconnects.
- **Self-hosted:** Reuse the same idea as Phase 1 recovery: after N seconds in failed/disconnected, tear down and re-join (new token or new signaling) once; surface clear logs and UI state.

### 6. Where to plug in

- **TournamentBracketView:** Already passes `challengeStatus`, `isSpectator`, `isCreator`, `participants`, `spectators`. New Voice Space client uses these to choose Speaker vs Listener and to apply creator mute.
- **StandardChallengeLobby:** Same; no prop changes.
- **SubmitResultRoom:** Same; already receives full voice props from app.

No change to “who gets which mode” logic—only the underlying transport changes from 1:1 WebRTC to SFU.

---

## Data Model (unchanged for Phase 2)

- **Firestore:** Keep `voice_signals` only if you still need it for something else; otherwise it can be removed once all clients use SFU. Keep `challenge_lobbies/{id}/voice_controls/{wallet}` for creator mute.
- **App state:** `challengeStatus`, `isSpectator`, `participants`, `spectators` stay the source of truth for “am I Speaker or Listener?” and “am I muted by creator?”.

---

## Summary

| Item | Recommendation |
|------|----------------|
| **SFU** | LiveKit (Option A) for fastest path; self-hosted (Option C) if no third-party. |
| **Listener mode** | Join with publish disabled; subscribe only; no mic. |
| **Speaker mode** | Publish one mic track; subscribe to room; creator mute = do not publish. |
| **Spectators during active match** | Listener only; enforced in client from `challengeStatus` + `isSpectator`. |
| **Safari / background** | Rely on SFU SDK (LiveKit/Daily) or single AudioContext + user-gesture-first play (self-hosted). |
| **Integration** | Same VoiceChat props and role/status rules; replace only the media path (signaling + RTCPeerConnection) with SFU client (e.g. LiveKit Room). |

This design gives you an X-Spaces-style lobby (unlimited listeners, Speaker/Listener, listen-only during match) with concrete tech choices and clear integration steps, without changing your existing challenge/lobby or role model.
