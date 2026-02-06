# Voice System – Current Implementation Inventory

Factual description of the voice system as implemented in code. No design intent or proposed changes.

---

**Update (iOS Safari fix):** `getUserMedia` is now **only** called from the "Enable mic" button's `onClick` (user gesture). Init and effects no longer request mic. When `inSpeakerList && !micEnabledByGesture`, a button is shown; its handler directly calls `getUserMedia`, stores the stream, adds tracks to the RTCPeerConnection (no `connectionState === 'connected'` guard), and renegotiates. If the user never taps, they remain listen-only.

---

## 1) Mic permission flow

### Where is `getUserMedia({ audio: true })` called?

**Exactly two call sites in the voice path (VoiceChat.tsx):**

| Location | Line(s) | Context |
|----------|---------|--------|
| **A** | 228–230 | Inside `initVoiceChat(publishMicNow)`, when `publishMicNow === true` and `!stream` (no existing local stream). |
| **B** | 574–575 | Inside the effect “When we're added to the speaker list…”, in an async IIFE that runs when the effect fires. |

(There is no other `getUserMedia` in the voice flow. GridScan.tsx uses it for video only and is unrelated.)

### Under what conditions does it run?

**Path A (initVoiceChat):**

- Runs only when the **init effect** (lines 152–174) runs and calls `initVoiceChat(publishMic)` with `publishMic === true`.
- Init effect runs when: `canConnect` is true, and **not** skipped by the guard  
  `(initializedRef.current && currentChallengeIdRef.current === memoizedChallengeId) || initInProgressRef.current`.
- `publishMic === true` when: `!isSpectator` (participant) **or** `inSpeakerList` (spectator whose wallet is in `speakerWallets`).
- So A runs only when:
  - User is a **participant** (creator/challenger), or
  - User is a **spectator** who is **already** in `speakerWallets` at the time the init effect first runs (rare: they would have to be approved before or as they mount).

For a spectator who joins **before** being approved, `publishMic` is false when the init effect runs, so **path A never runs** for them.

**Path B (speaker-list effect):**

- Runs when the effect at 565–596 runs.
- Effect runs when: `inSpeakerList && challengeId && currentWallet` and **all** of:
  - `peerConnection.current` exists
  - `peerConnection.current.connectionState === 'connected'`
  - `!localStream.current`
- So B runs only **after** the spectator is in `speakerWallets` **and** their RTCPeerConnection is already in state `'connected'`. If the connection is still `'connecting'` or not yet established when approval lands, the effect returns early and **path B never runs** for that approval.

### Does it run on mobile Safari after mic approval?

- **Path A:** For an approved spectator, it does **not** run after approval, because the init effect does not re-run with `publishMic === true` after approval (see “Speaker promotion path” below).
- **Path B:** It **can** run after approval, but only when the conditions above hold (including `connectionState === 'connected'`). When it does run, it is **not** in response to a tap or click; it is in response to a React state update driven by a Firestore `onSnapshot` (speaker list update).

So on mobile Safari, after the creator approves the mic request, any `getUserMedia` that runs is triggered by **Firestore/state update**, not by a user gesture.

### Is it tied to a user gesture or only Firestore state?

- **Neither call site is tied to a user gesture.**  
- Path A: triggered by the init effect (dependency array: `memoizedChallengeId`, `voiceDisabled`, `canConnect`, `publishMic`, `reinitKey`) when the component mounts or when those deps change.  
- Path B: triggered when `inSpeakerList` becomes true, which happens when the `voice_state` Firestore listener receives an update that adds the spectator’s wallet to `speakerWallets`.  
- There is no `onClick`/`onTouchEnd` (or similar) that calls `getUserMedia` anywhere in the voice flow.

---

## 2) Speaker promotion path

### Exact path: `speakerWallets` update → client → mic/track attach

1. **Creator approves**  
   Creator clicks Approve → `approveMicRequest(challengeId, requesterWallet, …)` runs (StandardChallengeLobby).  
   Firestore: `voice_state/main` is updated with `speakerWallets` including the requester’s wallet; `mic_requests/{wallet}` is updated to `status: 'approved'`.

2. **Spectator’s client receives `speakerWallets`**  
   `onSnapshot(voice_state/main)` (VoiceChat lines 82–94) fires.  
   `setSpeakerWallets(list)` runs with the new list that includes the spectator’s wallet.

3. **React state**  
   `inSpeakerList` becomes true (`speakerWallets.some(w => w === currentWallet)`).  
   `publishMic` becomes true (`!isSpectator || inSpeakerList`).

4. **Init effect does not re-run for mic**  
   Init effect (152–174) has deps `[memoizedChallengeId, voiceDisabled, canConnect, publishMic, reinitKey]`.  
   When `publishMic` flips to true, the effect **does** run again, but the **first line** is:
   `if ((initializedRef.current && currentChallengeIdRef.current === memoizedChallengeId) || initInProgressRef.current) return;`
   For an already-initialized spectator on the same challenge, this is true, so the effect **returns without calling `initVoiceChat` again**. So **no second `initVoiceChat(publishMic: true)`** and no getUserMedia from path A.

5. **Only path that adds mic: “add mic when inSpeakerList” effect**  
   Effect at 565–596 runs because `inSpeakerList` changed to true.  
   It then requires:
   - `pc = peerConnection.current` exists
   - `pc.connectionState === 'connected'`
   - `localStream.current == null`  
   If any of these fail, the effect returns and **no getUserMedia, no addTrack, no renegotiation**.

6. **If conditions pass**  
   - `getUserMedia({ audio: true })` is called (path B – **new call**, not reuse).  
   - Stream is stored in `localStream.current`, tracks are added with `pc.addTrack(track, stream)`.  
   - Then renegotiation is done manually: `createOffer()` → `setLocalDescription(offer)` → `setDoc(signalRef, { offer, offerFrom: currentWallet, … })`.

So: **getUserMedia is called again** in path B when the spectator is promoted; it is **not** reusing an earlier stream (spectator had no stream until approval).

---

## 3) WebRTC renegotiation

### When a mic track is added after initial connection

- Track is added in the “add mic when inSpeakerList” effect: `pc.addTrack(track, stream)` (line 578).
- There is **no** `onnegotiationneeded` handler in the codebase. Renegotiation is **not** driven by the browser’s `negotiationneeded` event.

### How renegotiation is triggered today

- **Manually**, in the same effect, immediately after `addTrack`:
  - `createOffer()`
  - `setLocalDescription(offer)`
  - `setDoc(signalRef, { offer, offerFrom: currentWallet, timestamp }, { merge: true })`
- So a **new offer** is written to Firestore by the (now speaker) spectator.

### Is the new offer answered by the peer?

- Yes, in the **signaling snapshot handler** (VoiceChat 374–429).
- On receiving `data.offer` with `data.offerFrom !== currentWallet`, the handler:
  - Calls `setRemoteDescription(new RTCSessionDescription(data.offer))` (initial or renegotiation).
  - Calls `createAnswer()` and `setLocalDescription(answer)`.
  - Writes `{ answer, answerFrom: currentWallet, timestamp }` to the same Firestore doc (merge).
- The spectator’s listener then receives the answer and, if in `have-local-offer`, sets it: `setRemoteDescription(new RTCSessionDescription(data.answer))` (lines 406–411).

So: renegotiation is **implemented manually** (no `onnegotiationneeded`). A new offer is written to Firestore and the peer answers; the answer is applied on the spectator side. Whether it completes in practice depends on timing, connection state, and Firestore ordering (see blockers below).

---

## 4) Mobile Safari behavior

### Is mic permission expected to auto-prompt on approval?

- **No.** The code never calls `getUserMedia` in response to the user tapping “Approve” or “Request mic” on the **spectator’s** device.  
- Approval only updates Firestore; the spectator’s mic is requested in path B when the **Firestore-driven** effect runs after `inSpeakerList` becomes true. That is **asynchronous and not a direct result of a user gesture** on the spectator’s device.

### Where would an explicit user gesture be required?

- In current code there is **no** place that calls `getUserMedia` from a click/touch handler.  
- For mobile Safari, a gesture (e.g. tap) is typically required for the first `getUserMedia` prompt. So the “explicit user gesture” is **not** implemented anywhere; the only calls are from effects (init and speaker-list).

### Why there is no mic permission prompt on phone

- On the **spectator’s** phone, the only path that can request the mic after approval is path B, which runs from a **useEffect** triggered by `inSpeakerList` (Firestore update).  
- That is **not** a user gesture. Mobile Safari often **does not** show the mic permission prompt when `getUserMedia` is invoked from a non-gesture context (e.g. from a timer or from a Promise resolved after a Firestore callback).  
- So the observed behavior (no prompt on phone after approval) matches the implementation: **getUserMedia is never invoked from a user gesture.**

---

## 5) Current known blockers (approved but silent)

Reasons a user can be “approved” (in UI) but still produce no audible audio:

1. **getUserMedia never runs (no permission)**  
   - Path A doesn’t run for a spectator who wasn’t in `speakerWallets` at first init.  
   - Path B only runs if `pc.connectionState === 'connected'` when the effect runs. If the spectator’s connection is still `'connecting'` or not yet established when approval lands, the effect returns early and **getUserMedia is never called** → no mic permission, no track.

2. **getUserMedia runs but not from a user gesture (mobile)**  
   - On iOS Safari, calling `getUserMedia` from the Firestore/state-driven effect may not show the permission prompt or may be denied. Result: no stream, no track, no audio even though the user is “approved.”

3. **Effect never runs for “add mic”**  
   - If `peerConnection.current` is null (e.g. init failed or cleaned up), or `localStream.current` is already set (shouldn’t be for a newly approved spectator, but possible if state is stale), the effect returns without adding a track or renegotiating.

4. **Renegotiation never completes**  
   - Spectator writes a new offer to Firestore. If the creator’s listener doesn’t run, or runs but fails (e.g. `setRemoteDescription` throws), or the spectator never receives the answer (e.g. Firestore ordering, stale read), the renegotiation is incomplete and the new track is not delivered to the creator.

5. **Remote track received but not played (autoplay)**  
   - Creator’s `pc.ontrack` sets `remoteAudioRef.current.srcObject = stream` and calls `play()`. If the browser blocks autoplay, `play()` rejects and the code sets `needTapToHear`; if the user never taps “Tap to hear voice,” **audio is muted by policy** even though the track is there.

6. **SDP/track not in offer**  
   - In theory, if `createOffer()` is called before the new track is fully attached or the PC state is inconsistent, the offer might not include the new audio. Current code does addTrack then immediately createOffer in the same async function; no explicit wait for `negotiationneeded`. This is a possible but unconfirmed edge case.

7. **Wrong or stale signaling state**  
   - If the creator processes an old offer (e.g. from a previous renegotiation) or the document is overwritten by another writer, the answer might not match the spectator’s current offer, so `setRemoteDescription(answer)` could fail or not apply to the latest offer.

8. **ICE/connection never reaches `'connected'`**  
   - If the spectator’s PC never reaches `connectionState === 'connected'` (e.g. NAT/firewall, TURN not used or failing), the “add mic” effect keeps returning early and the spectator never sends a track, so the creator never receives one.

---

## Summary table

| Topic | Current fact |
|-------|----------------|
| **getUserMedia call sites** | Two: (A) inside `initVoiceChat` when `publishMicNow` true; (B) inside “add mic when inSpeakerList” effect when already connected. |
| **User gesture** | Neither call is tied to a user gesture; both are driven by React/Firestore state. |
| **After approval** | Only path B can run; it requires `connectionState === 'connected'` and no existing `localStream`. |
| **Init re-run on approve** | No. Init effect is guarded so it does not call `initVoiceChat` again when only `publishMic` changes for the same challenge. |
| **onnegotiationneeded** | Not used. Renegotiation is manual (createOffer → setDoc) after addTrack. |
| **New offer/answer** | Yes. Spectator writes new offer to Firestore; creator answers in the same snapshot handler; spectator sets remote description from answer. |
| **Mobile Safari prompt** | Not guaranteed; implementation does not invoke getUserMedia from a gesture. |
| **Blockers** | No permission (path B never runs or gesture required), connection not `'connected'`, renegotiation incomplete, autoplay block, SDP/signaling/ICE issues. |

This document reflects only the current code paths and conditions; it does not propose fixes or new behavior.
