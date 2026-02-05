# USDFG Voice System – Factual Inventory

This document is a step-by-step inventory of the current voice implementation. No fixes or recommendations—facts only—to support designing an X-Spaces-level voice experience.

---

## 1. Voice technology

- **WebRTC only.** No third-party voice service (no LiveKit, Daily, Twilio, etc.).
- **Signaling:** Firestore. One document per challenge: `voice_signals/{challengeId}`. Fields: `offer`, `offerFrom`, `answer`, `answerFrom`, `timestamp`, and dynamic `candidate_{wallet}_{Date.now()}` keys.
- **Media:** `navigator.mediaDevices.getUserMedia({ audio: true })` → single `MediaStream`; no video.
- **Playback:** Single `<audio ref={remoteAudioRef} autoPlay />`; `remoteAudioRef.current.srcObject = event.streams[0]` in `pc.ontrack`. No `AudioContext` anywhere.
- **TURN/STUN:**
  - STUN: `stun:stun.l.google.com:19302`
  - TURN: `openrelay.metered.ca` (80, 443, 443?transport=tcp), username/credential: `openrelayproject` / `openrelayproject`
  - `iceCandidatePoolSize: 10`

---

## 2. When microphone permission is requested

- **Only inside `initVoiceChat()`**, and only when:
  - Voice is not disabled and not listen-only (spectator during active match).
  - Either there is no existing `localStream.current`, or the existing stream has no live audio track.
- So: first time the user opens a lobby/room where voice is allowed and the component mounts and runs the init effect, **then** `getUserMedia({ audio: true })` is called. No earlier permission prompt.
- If an existing stream has at least one live audio track, the code reuses it and does **not** request permission again.

---

## 3. When audio context is created

- **Never.** There is no `new AudioContext()` or `webkitAudioContext` in the voice path. Playback is entirely via the `<audio>` element and `RTCPeerConnection`’s remote stream.

---

## 4. When audio tracks are created and published

- **Created:** When `getUserMedia({ audio: true })` succeeds in `initVoiceChat()`; the returned stream is stored in `localStream.current`.
- **Published:** After a new `RTCPeerConnection` is created (or reused if existing one is not closed/failed), the code checks senders for an existing live audio track. If none, it runs `stream.getTracks().forEach((track) => pc.addTrack(track, stream))`. So tracks are added to the peer connection during init, not on a separate “publish” step. There is no explicit “unpublish” before adding; it only skips adding if a live audio track is already present in senders.

---

## 5. How roles are handled (player vs spectator)

- **Props:** `VoiceChat` receives `isSpectator`, `isCreator`, `participants`, `spectators`.
- **Where set:**
  - **StandardChallengeLobby:** Passes `isSpectator={userRole === 'spectator'}`, `isCreator={userRole === 'creator'}`, `participants`, `spectators`. Role comes from `resolveUserRole` (creator / challenger / spectator).
  - **TournamentBracketView:** Renders `<VoiceChat challengeId={challengeId} currentWallet={currentWallet || ""} />` **with no** `challengeStatus`, `isSpectator`, `isCreator`, `participants`, or `spectators`. So in tournaments everyone is effectively treated as a non-spectator participant (defaults: `isSpectator = false`, `isCreator = false`, `participants = []`, `spectators = []`).
  - **SubmitResultRoom:** Renders `<VoiceChat challengeId={challengeId} currentWallet={currentWallet} />` with **no** status or role props. So again defaults: not spectator, not creator.
- **Effect of role:** `allowVoice = !isActiveMatch || !isSpectator`; `isListenOnly = isSpectator && isActiveMatch`. So only when **both** “active match” **and** “spectator” does the user get listen-only (voice init is skipped and a “Listen Only” message is shown). In Tournament and SubmitResultRoom, `isSpectator` is always false, so role-based restriction does not apply there.

---

## 6. How match states affect voice (pre-match, active, post-match)

- **Only `challengeStatus` is used**, and only in StandardChallengeLobby (and only to derive `isActiveMatch`).
- **StandardChallengeLobby:** `challengeStatus={status}` (e.g. `pending_waiting_for_opponent`, `active`, `completed`). `isActiveMatch = (challengeStatus === 'active')`. So:
  - Pre-match (`pending_waiting_for_opponent`, etc.): voice allowed for everyone (participants and spectators can speak).
  - Active: spectators are listen-only; participants can speak.
  - Post-match: same logic as pre-match (voice allowed for all, since `isActiveMatch` is false).
- **TournamentBracketView:** Does **not** pass `challengeStatus`. So `challengeStatus` defaults to `'pending_waiting_for_opponent'` and never reflects tournament stage (waiting_for_players, round_in_progress, completed). Voice is always “allowed” from a status perspective.
- **SubmitResultRoom:** Does not pass `challengeStatus`; same default. No distinction between pre/during/post for that modal.

---

## 7. How muting is enforced (UI only vs transport-level)

- **Self-mute (toggle):** Transport-level. `toggleMute()` sets `track.enabled = !newMutedState` on each audio track of `localStream.current`. So when “muted,” no audio is sent over the peer connection.
- **Creator mute (muted by creator):** Also transport-level. A `useEffect` watches `mutedByCreator` (and `isListenOnly`); when true it sets `localStream.current.getAudioTracks().forEach((track) => { track.enabled = false })` and `setMuted(true)`. So creator-muted users do not send audio.
- **Source of creator mute:** Firestore `challenge_lobbies/{challengeId}/voice_controls/{wallet}`. `onSnapshot` on that doc; if `data.muted === true` then `setMutedByCreator(true)`. Creator can “Mute All Spectators” via `MuteAllSpectatorsButton`, which writes a mute doc per spectator in `voice_controls/{wallet}`. So enforcement is: read Firestore → set local `mutedByCreator` → same track.enabled logic as self-mute. No server-side or SFU-level mute; purely client-side track disable.

---

## 8. What happens when a user joins late

- **Signaling model:** Single Firestore doc `voice_signals/{challengeId}`. One offer, one answer, many ICE candidate keys. So the design is **1:1 (pair)** only. Only two peers can complete a connection (offerer and answerer).
- **“First” peer:** After the `onSnapshot` listener is attached, the code does `getDoc(signalRef)`. If `!signalData?.offer`, this peer creates an offer and writes it (with `offerFrom: currentWallet`). So “first” is whoever gets to write the offer first.
- **Second peer:** Sees `data.offer` and `data.offerFrom !== currentWallet`. Creates answer, sets local/remote descriptions, writes `answer` and `answerFrom`. Offerer’s `onSnapshot` sees the answer and sets remote description. ICE candidates are merged into the same doc; both sides read `candidate_*` keys (excluding their own wallet) and call `addIceCandidate`. So the second joiner can connect to the first.
- **Third (or later) joiner:** No logic to create or accept additional offers. The doc already has an offer (and usually an answer). So:
  - If the late joiner runs `getDoc` and sees an offer, they go to “Offer already exists from opponent” and never create a new offer; they would only answer that one offer, which belongs to the first peer. So the third peer does not form a second P2P connection; they effectively have no voice path to anyone.
  - There is no multi-party topology (no mesh, no SFU), no “new peer joined” renegotiation, and no second offer/answer pair for an additional peer.

---

## 9. What happens when a user’s role or match status changes

- **Role/status change (e.g. spectator → participant, or match becomes active):** The init effect depends on `isListenOnly`. When `isListenOnly` becomes true (e.g. match goes active and user is spectator), the effect’s guard runs: `if (isListenOnly || ...) { setStatus("Voice disabled for spectators..."); return; }` and **does not** call `initVoiceChat()`. So if they were already in a call, the effect does **not** tear down the connection when they become listen-only; it only prevents init for new mounts. The **cleanup** in the same effect runs only when `currentChallengeIdRef.current !== memoizedChallengeId` (i.e. challengeId changed). So when only role/status changes (same challengeId), **no cleanup runs**. Result: a spectator who was already in a P2P call can retain an active peer connection and send audio until they leave or refresh, unless something else (e.g. `voiceDisabled`) changes. The UI shows “Listen Only” when `isListenOnly` is true, but the underlying connection is not torn down on that transition.
- **Challenge change:** When `challengeId` changes, the effect cleanup runs: `cleanup()`, refs reset, and the new challengeId triggers a fresh init (new offer/answer, new signaling doc in practice because each challenge has its own `voice_signals` doc). So switching challenges tears down and re-initializes voice for the new challenge.

---

## 10. Retry, re-negotiation, and reconnection logic

- **Retry on failure:** On `pc.connectionState === 'failed'`, if `reconnectAttempts.current < maxReconnectAttempts` (3), the code increments the counter, sets status to “Connection failed, retry X/3...”, and calls `pc.restartIce()`. No new offer/answer; only ICE restart. After 3 failures, status is set to “Connection failed (check network)” and a console error is logged; no further automatic retry.
- **Disconnected:** On `disconnected`, `setPeerConnected(false)` and status “Disconnected, reconnecting...”. No explicit action (no restartIce, no re-offer). Reliance is on ICE/network recovery.
- **Re-negotiation:** None. No handling of `negotiationneeded`, no createOffer/createAnswer after the initial handshake. So if the connection drops and ICE restart does not fix it, there is no full re-signaling (new offer/answer).
- **Reconnection after visibility/focus:** On `visibilitychange` or window `focus`, the code calls `remoteAudioRef.current.play().catch(...)`. So it tries to resume playback of the remote stream; it does not re-establish the peer connection or re-request mic.
- **Listener / init guard:** Init is skipped if `initializedRef.current && currentChallengeIdRef.current === memoizedChallengeId` or `initInProgressRef.current`. So for the same challenge, init runs only once per “session” (until challengeId changes and cleanup runs). There is no “re-init on disconnect” or “re-init on visibility” logic.

---

## Where voice is used

| Context                    | Component                | Props passed                                                                 | Notes                                                                 |
|---------------------------|--------------------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------|
| 1v1 / standard challenge  | StandardChallengeLobby    | challengeId, currentWallet, challengeStatus, isSpectator, isCreator, participants, spectators | Full role/status; creator mute and “Mute All Spectators” available.   |
| Tournament bracket        | TournamentBracketView    | challengeId, currentWallet only                                            | No status/role; everyone treated as participant; no spectator mute UI. |
| Submit result modal       | SubmitResultRoom         | challengeId, currentWallet only                                            | No status/role.                                                       |

RightSidePanel only receives `voiceChatChallengeId` and `voiceChatCurrentWallet` and does not render VoiceChat; children (TournamentBracketView or StandardChallengeLobby) render VoiceChat.

---

## Known edge cases

1. **Two peers create offer at the same time:** Both can see `!signalData?.offer` and both write an offer. The doc ends up with one offer (last write wins). The peer whose offer was overwritten never gets an answer matching their offer; the other may get an answer meant for the overwritten offer. Can result in one or both failing to connect.
2. **Tournament / 16 players:** Signaling is one doc per challenge with one offer/answer pair. Only two participants can ever have a voice connection; the rest see “Mic ready, waiting for opponent...” or “Voice connected!” only if they happen to be the offerer or answerer in that single pair. No multi-party voice.
3. **Spectator becomes listen-only mid-call:** Connection is not torn down; only init is skipped for that state. So a spectator who was already connected can still send audio until they leave or refresh, despite UI saying “Listen Only.”
4. **Cleanup only on challengeId change:** When the user navigates away without changing challengeId (e.g. closes panel or switches view), the effect cleanup does not run (condition is `currentChallengeIdRef.current !== memoizedChallengeId`). So tracks and peer connection may stay alive until the component unmounts and React runs cleanup of refs—but the explicit `cleanup()` is not called, so Firestore listener and signals doc are not cleaned up on simple leave.
5. **ICE candidates in forEach async:** `Object.keys(data).forEach(async (key) => { ... await pc.addIceCandidate(...) })` does not await the forEach; multiple addIceCandidate runs can overlap. Order is not guaranteed; duplicates (same candidate in multiple snapshot updates) can be added; no deduplication.
6. **Every ICE candidate = one Firestore write:** `onicecandidate` does `setDoc(..., { [candidateKey]: ... }, { merge: true })` per candidate. Many candidates cause many writes and many `onSnapshot` callbacks for all listeners, which can cause duplicate addIceCandidate and load.
7. **remoteDescription timing:** ICE candidates are only added when `pc.remoteDescription` is set. If candidates arrive in the snapshot before the answer (or offer) is processed, they might be skipped in that snapshot run; they could be applied in a later snapshot, but there is no explicit ordering (offer/answer first, then candidates).
8. **Single remote stream:** `pc.ontrack` sets `remoteAudioRef.current.srcObject = event.streams[0]`. Only one remote stream is ever used. In a 1:1 design that’s fine, but if multiple tracks were ever added, only the first stream would be heard.

---

## Known failure points

1. **getUserMedia denied or NotReadableError:** Sets status to “Mic permission denied” or “Mic in use by another app”; no retry or fallback.
2. **Firestore path invalid (e.g. empty challengeId):** onSnapshot error handler sets “Error: Invalid challenge ID” and `setConnected(false)`. Invalid path can happen if challengeId is empty or malformed.
3. **setRemoteDescription / createAnswer / addIceCandidate throw:** Caught in the snapshot callback with `console.error`; status is not updated, so user may still see “Connecting...” or “Creating offer...” with no resolution.
4. **ICE connection failed:** Only logged (“ICE connection failed - may need better TURN servers”); no status update or user message from that handler.
5. **TURN/STUN unreachable or rate-limited:** Open Relay Project credentials are public; under load or network issues, connection can fail with no fallback TURN.
6. **Safari / iOS autoplay:** `remoteAudioRef.current.play()` is called without user gesture on ontrack and on visibility/focus. Browsers may block; the catch only logs “Audio play failed” or “Audio resume failed.” User can hear nothing while connection shows “Voice connected!”
7. **Cleanup deletes `voice_signals` doc:** On challengeId change, `cleanup()` calls `deleteDoc(doc(db, "voice_signals", validChallengeId))`. So when one peer leaves (e.g. closes lobby or switches challenge), the shared signaling doc can be deleted. The other peer’s listener will see the doc disappear or change; they do not have logic to recreate an offer or to handle “doc deleted” as a reason to reconnect or show “Peer left.”

---

## Logs and silent failures that could explain “connected but no audio”

1. **Silent:** `remoteAudioRef.current.play()` rejected (e.g. autoplay policy). Log: “Audio play failed” or “Audio resume failed (may need user interaction)”. User sees “Voice connected!” but hears nothing.
2. **Silent:** `addIceCandidate` fails (e.g. invalid candidate or wrong order). Log: “❌ Failed to add ICE candidate”. Connection may never reach “connected” or may be connected with no media if only some candidates were applied.
3. **Silent:** ICE connected but no media (e.g. TURN not used when needed, or one side’s track not sent). Only `oniceconnectionstatechange` logs on failure; no explicit “connected but no audio” detection.
4. **Silent:** `setRemoteDescription` or `createAnswer` throws in the snapshot callback. Log: “❌ Error handling WebRTC signal”. Status is not set to an error message.
5. **Silent:** Permission or Firestore error in voice_controls listener. Errors with code `permission-denied` or `unavailable` are ignored (no log); others are logged. So mute state could be wrong without obvious log.
6. **Console logs that are still present:** “📱 Page hidden - preserving audio connection”, “📱 Page visible - resuming audio if needed”, “Audio resume failed (may need user interaction)”, “📱 Page blurred - keeping audio active”, “📱 Page focused - ensuring audio is active”, “Audio resume on focus failed”. So visibility/blur/focus and play() failures are visible only in console, not in UI.

---

## Firestore usage summary

| Collection/Path | Purpose |
|-----------------|--------|
| `voice_signals/{challengeId}` | Single doc per challenge. offer, offerFrom, answer, answerFrom, timestamp, candidate_{wallet}_{ts}. Read/write by all (rules: allow read, write: if true). |
| `challenge_lobbies/{challengeId}/voice_controls/{wallet}` | One doc per muted user. Field: muted (boolean). Creator writes to mute; client reads via onSnapshot to set mutedByCreator. |

---

End of inventory. No proposed fixes; for use in designing an X-Spaces-level voice experience with near-zero connection issues.
