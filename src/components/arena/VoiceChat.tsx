import React, { useEffect, useState, useRef, useMemo } from "react";
import { Mic, MicOff } from "lucide-react";
import { doc, setDoc, onSnapshot, deleteDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase/config";
import { createMicRequest, addSpeaker, removeSpeaker } from "../../lib/firebase/firestore";

interface VoiceChatProps {
  challengeId: string;
  currentWallet: string;
  challengeStatus?: string; // 'pending_waiting_for_opponent' | 'creator_funded' | 'active' | 'completed'
  isSpectator?: boolean; // True if user is a spectator (not a participant)
  isCreator?: boolean; // True if user is the challenge creator
  participants?: string[]; // List of participant wallets
  spectators?: string[]; // List of spectator wallets
}

// Prevent multiple VoiceChat realtime stacks for the same challenge.
const activeVoiceChatMounts = new Set<string>();

const VoiceChatComponent: React.FC<VoiceChatProps> = ({ 
  challengeId, 
  currentWallet,
  challengeStatus = 'pending_waiting_for_opponent',
  isSpectator = false,
  isCreator = false,
  participants = [],
  spectators = []
}) => {
  // Remove mount logging - excessive logging removed
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [status, setStatus] = useState<string>("Initializing...");
  const [voiceDisabled, setVoiceDisabled] = useState(false);
  const [mutedByCreator, setMutedByCreator] = useState(false);
  const [micRequestStatus, setMicRequestStatus] = useState<'pending' | 'approved' | 'denied' | null>(null);
  const [speakerWallets, setSpeakerWallets] = useState<string[]>([]);
  const [requestingMic, setRequestingMic] = useState(false);
  const [requestMicError, setRequestMicError] = useState<string | null>(null);
  /** True after user taps "Enable mic" and getUserMedia succeeds (user gesture required on iOS). */
  const [micEnabledByGesture, setMicEnabledByGesture] = useState(false);

  const isActiveMatch = challengeStatus === 'active';
  const inSpeakerList = speakerWallets.some((w) => w?.toLowerCase() === currentWallet?.toLowerCase());
  const isApprovedSpeaker = isSpectator && inSpeakerList;
  const isListenOnly = (isSpectator && isActiveMatch) || (isSpectator && !inSpeakerList);
  // Participants (creator/challenger) always publish mic; spectators only when approved (inSpeakerList)
  const publishMic = !isSpectator || inSpeakerList;
  
  // Listen to creator mute controls from Firestore
  useEffect(() => {
    if (!challengeId || !currentWallet) return;
    const muteRef = doc(db, 'challenge_lobbies', challengeId, 'voice_controls', currentWallet);
    const unsubscribe = onSnapshot(
      muteRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMutedByCreator(data.muted === true);
        } else {
          setMutedByCreator(false);
        }
      },
      (error) => {
        if (error.code !== 'permission-denied' && error.code !== 'unavailable') {
          console.error('Error listening to mute status:', error);
        }
      }
    );
    return () => unsubscribe();
  }, [challengeId, currentWallet]);

  // Listen to my mic request status (spectators)
  useEffect(() => {
    if (!challengeId || !currentWallet) return;
    const requestRef = doc(db, 'challenge_lobbies', challengeId, 'mic_requests', currentWallet.toLowerCase());
    const unsub = onSnapshot(
      requestRef,
      (snap) => {
        const s = snap.data()?.status;
        setMicRequestStatus(s === 'pending' || s === 'approved' || s === 'denied' ? s : null);
      },
      () => {}
    );
    return () => unsub();
  }, [challengeId, currentWallet]);

  // Listen to speaker list (max 2) for approved-speaker state
  useEffect(() => {
    if (!challengeId) return;
    const stateRef = doc(db, 'challenge_lobbies', challengeId, 'voice_state', 'main');
    const unsub = onSnapshot(
      stateRef,
      (snap) => {
        const list = snap.exists() ? (snap.data()?.speakerWallets || []) : [];
        setSpeakerWallets(Array.isArray(list) ? list : []);
      },
      () => {}
    );
    return () => unsub();
  }, [challengeId]);
  
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const unsubscribeSignalRef = useRef<(() => void) | null>(null);
  const disconnectedSinceRef = useRef<number | null>(null);
  const recoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryAttemptedRef = useRef(false);
  const iceCandidatesAddedRef = useRef<Set<string>>(new Set());
  // Perfect negotiation (glare-safe renegotiation)
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const hasOfferedRef = useRef(false);
  const [needTapToHear, setNeedTapToHear] = useState(false);

  useEffect(() => {
    if (!challengeId || !challengeId.trim()) return;
    console.log("VoiceChat mounted:", challengeId);
  }, [challengeId]);

  // Use refs to track initialization and prevent unnecessary re-initialization
  const initializedRef = useRef(false);
  const currentChallengeIdRef = useRef<string>('');
  const initInProgressRef = useRef(false);
  const [reinitKey, setReinitKey] = useState(0);

  // Memoize challengeId to prevent unnecessary re-renders
  const memoizedChallengeId = useMemo(() => challengeId, [challengeId]);

  const canConnect = !voiceDisabled && memoizedChallengeId && memoizedChallengeId.trim() !== '' &&
    (inSpeakerList || !isSpectator || !isActiveMatch);

  // When we're no longer in the speaker list (replaced or match went active): tear down mic only, keep receiving
  useEffect(() => {
    if (inSpeakerList) return;
    setMicEnabledByGesture(false);
    if (!localStream.current) return;
    const pc = peerConnection.current;
    if (pc) {
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'audio') pc.removeTrack(sender);
      });
    }
    localStream.current.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    setConnected(false);
    setMuted(false);
  }, [inSpeakerList]);

  // When speaker becomes listen-only (e.g. match went active): full cleanup and remove from speakers
  useEffect(() => {
    if (!isListenOnly) return;
    if (localStream.current) {
      removeSpeaker(memoizedChallengeId, currentWallet).catch(() => {});
      cleanup(false);
      initializedRef.current = false;
      currentChallengeIdRef.current = '';
    }
    setStatus("Voice disabled for spectators during active matches");
    setConnected(false);
    setPeerConnected(false);
  }, [isListenOnly]);

  // Initialize voice chat when we can connect (participant, approved spectator, or pre-match spectator listening)
  useEffect(() => {
    if ((initializedRef.current && currentChallengeIdRef.current === memoizedChallengeId) || initInProgressRef.current) return;
    if (!memoizedChallengeId || memoizedChallengeId.trim() === '') return;
    if (activeVoiceChatMounts.has(memoizedChallengeId)) {
      console.warn("VoiceChat duplicate mount detected, skipping init:", memoizedChallengeId);
      return;
    }
    if (!canConnect) return;

    activeVoiceChatMounts.add(memoizedChallengeId);
    initInProgressRef.current = true;
    initializedRef.current = true;
    currentChallengeIdRef.current = memoizedChallengeId;

    initVoiceChat(publishMic).finally(() => {
      initInProgressRef.current = false;
    });

    return () => {
      activeVoiceChatMounts.delete(memoizedChallengeId);
      if (currentChallengeIdRef.current !== memoizedChallengeId) {
        removeSpeaker(memoizedChallengeId, currentWallet).catch(() => {});
        cleanup(true);
        initializedRef.current = false;
        currentChallengeIdRef.current = '';
        initInProgressRef.current = false;
      }
    };
  }, [memoizedChallengeId, voiceDisabled, canConnect, publishMic, reinitKey]);

  // Preserve audio connection when page visibility changes (backgrounding on mobile)
  useEffect(() => {
    const isAutoplayRejection = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      return /aborted|interrupted|user.*request|play\(\)/i.test(msg);
    };
    const onPlayRejected = (context: string) => (err: unknown) => {
      if (!isAutoplayRejection(err)) {
        console.warn("[Voice] audio.play() rejected (" + context + "):", err instanceof Error ? err.message : err);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && remoteAudioRef.current) {
        remoteAudioRef.current.play().then(() => setNeedTapToHear(false)).catch(onPlayRejected("visibility"));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleFocus = () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.play().then(() => setNeedTapToHear(false)).catch(onPlayRejected("focus"));
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const initVoiceChat = async (publishMicNow: boolean) => {
    const validChallengeId = memoizedChallengeId;
    iceCandidatesAddedRef.current.clear();
    if (!validChallengeId || validChallengeId.trim() === '') {
      setStatus("Error: Invalid challenge ID");
      setConnected(false);
      initInProgressRef.current = false;
      return;
    }

    try {
      // Do NOT call getUserMedia here – iOS Safari requires a user gesture. Mic is acquired via "Enable mic" button.
      let stream: MediaStream | null = localStream.current;
      if (publishMicNow) {
        // Only use existing stream (e.g. from prior "Enable mic" tap); never auto-request mic
        if (stream) {
          const hasActiveTrack = stream.getAudioTracks().some((t) => t.readyState === 'live');
          if (!hasActiveTrack) stream = null;
        }
        if (stream) {
          setConnected(true);
          setStatus("Mic ready, waiting for opponent...");
        } else {
          setConnected(false);
          setStatus("Tap Enable mic to speak");
        }
      } else {
        setConnected(true);
        setStatus("Listening...");
      }

      let pc = peerConnection.current;
      if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        // New PC/session: allow the offerer to offer once again.
        hasOfferedRef.current = false;
        // Create peer connection with optimized STUN and TURN servers
        const configuration: RTCConfiguration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            // Free TURN server from Open Relay Project (most reliable)
            { 
              urls: [
                'turn:openrelay.metered.ca:80',
                'turn:openrelay.metered.ca:443',
                'turn:openrelay.metered.ca:443?transport=tcp'
              ],
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ],
          iceCandidatePoolSize: 10
        };
        
        pc = new RTCPeerConnection(configuration);
        peerConnection.current = pc;
      }

      if (stream && publishMicNow) {
        const existingSenders = pc.getSenders();
        const hasAudioTrack = existingSenders.some((s) => s.track?.kind === 'audio' && s.track.readyState === 'live');
        if (!hasAudioTrack) {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream!));
        }
      }

      const isAutoplayRejection = (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        return /aborted|interrupted|user.*request|play\(\)/i.test(msg);
      };
      pc.ontrack = (event) => {
        const stream = event.streams?.[0];
        if (stream) {
          console.log("[Voice] remote track received", { streamId: stream.id, trackKind: event.track?.kind });
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.play().then(() => {
              setNeedTapToHear(false);
            }).catch((err) => {
              if (!isAutoplayRejection(err)) {
                console.warn("[Voice] audio.play() rejected:", err instanceof Error ? err.message : err);
              }
              setNeedTapToHear(true);
            });
          }
          setPeerConnected(true);
        }
      };

      // Handle ICE candidates - store in array instead of overwriting
      const iceCandidatesRef = { sent: new Set<string>() };
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const candidateKey = `candidate_${currentWallet}_${Date.now()}`;
          await setDoc(doc(db, "voice_signals", memoizedChallengeId), {
            [candidateKey]: event.candidate.toJSON(),
            timestamp: Date.now()
          }, { merge: true });
        }
      };

      const DISCONNECTED_RECOVERY_MS = 8000;

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("[Voice] connectionState:", state);

        if (state === 'connected') {
          disconnectedSinceRef.current = null;
          if (recoveryTimeoutRef.current) {
            clearTimeout(recoveryTimeoutRef.current);
            recoveryTimeoutRef.current = null;
          }
          recoveryAttemptedRef.current = false;
          setPeerConnected(true);
          setStatus("Voice connected!");
          reconnectAttempts.current = 0;
          addSpeaker(memoizedChallengeId, currentWallet).catch(() => {});
        } else if (state === 'connecting') {
          setStatus("Connecting to opponent...");
        } else if (state === 'disconnected' || state === 'failed') {
          setPeerConnected(false);
          if (state === 'disconnected') setStatus("Disconnected, reconnecting...");
          if (state === 'failed') {
            if (reconnectAttempts.current < maxReconnectAttempts) {
              reconnectAttempts.current++;
              setStatus(`Connection failed, retry ${reconnectAttempts.current}/${maxReconnectAttempts}...`);
              pc.restartIce();
            } else {
              setStatus("Connection failed (check network)");
            }
          }
          const now = Date.now();
          if (disconnectedSinceRef.current === null) disconnectedSinceRef.current = now;
          if (!recoveryTimeoutRef.current && !recoveryAttemptedRef.current) {
            recoveryTimeoutRef.current = setTimeout(() => {
              recoveryTimeoutRef.current = null;
              if (pc.connectionState !== 'connected' && pc.connectionState !== 'connecting' && !recoveryAttemptedRef.current) {
                recoveryAttemptedRef.current = true;
                console.log("[Voice] recovery: tearing down and re-initing signaling after prolonged failure/disconnect");
                cleanup(true);
                initializedRef.current = false;
                setReinitKey((k) => k + 1);
              }
            }, DISCONNECTED_RECOVERY_MS);
          }
        }
      };

      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          console.error("❌ ICE connection failed - may need better TURN servers");
        }
      };

      // Listen for remote signals from the shared document
      const signalRef = doc(db, "voice_signals", memoizedChallengeId);
      
      // Only set up new listener if we don't already have one for this challenge
      if (unsubscribeSignalRef.current) {
        // Clean up old listener first
        unsubscribeSignalRef.current();
        unsubscribeSignalRef.current = null;
      }
      
      // Store unsubscribe function for cleanup
      let quotaRetryUsed = false;
      let quotaRetryTimer: ReturnType<typeof setTimeout> | null = null;
      const unsubscribe = onSnapshot(signalRef, async (snapshot) => {
        // Check if challengeId is still valid (in case it changed)
        const currentChallengeId = memoizedChallengeId; // Capture in closure
        if (!currentChallengeId || currentChallengeId.trim() === '') {
          console.log("⚠️ challengeId became invalid during snapshot, ignoring");
          return;
        }
        
        const data = snapshot.data() || {};

        try {
          const sortedWallets = [...participants].map((p) => p?.toLowerCase()).filter(Boolean).sort();
          const amOfferer = sortedWallets.length === 0 || (currentWallet && currentWallet.toLowerCase() === sortedWallets[0]);
          // Non-offerer is "polite" and will roll back on collisions
          const isPolite = !amOfferer;

          const renegotiate = async () => {
            if (!pc) return;
            if (pc.signalingState !== "stable") {
              console.log("Skipping renegotiation, not stable");
              return;
            }
            if (makingOfferRef.current) return;
            if (hasOfferedRef.current) {
              console.log("Offer already created, skipping");
              return;
            }
            try {
              makingOfferRef.current = true;
              await pc.setLocalDescription(await pc.createOffer());
              hasOfferedRef.current = true;
              await setDoc(signalRef, {
                offer: pc.localDescription,
                offerFrom: currentWallet,
                timestamp: Date.now(),
              }, { merge: true });
            } finally {
              makingOfferRef.current = false;
            }
          };

          // Check for offer from other player (initial or renegotiation e.g. after approved spectator adds mic)
          // Skip if we already answered this exact offer (prevents loop when our own write triggers onSnapshot)
          const offerAlreadyProcessed = pc.currentRemoteDescription?.sdp === data.offer?.sdp;
          if (data.offer && data.offerFrom !== currentWallet && !offerAlreadyProcessed) {
            const isRenegotiation = !!pc.currentRemoteDescription;
            if (isRenegotiation) console.log("📞 Renegotiation: received new offer, creating answer...");
            else console.log("📞 Received offer, creating answer...");

            // 1) Only handle offers in valid state
            if (pc.signalingState !== "stable" && pc.signalingState !== "have-remote-offer") {
              console.warn("Skipping offer due to invalid signaling state:", pc.signalingState);
              return;
            }

            const description = new RTCSessionDescription(data.offer);

            // 3) Collision guard (glare)
            const makingOffer = makingOfferRef.current;
            const offerCollision =
              description.type === "offer" &&
              (makingOffer || pc.signalingState !== "stable");

            const ignoreOffer = !isPolite && offerCollision;
            if (ignoreOffer) {
              console.log("Ignoring offer due to glare");
              return;
            }

            if (offerCollision) {
              await pc.setLocalDescription({ type: "rollback" } as any);
            }

            await pc.setRemoteDescription(description);

            // 2) Ensure createAnswer ALWAYS runs before setLocalDescription
            const answer = await pc.createAnswer();
            // 6) Hard guard before setLocalDescription
            if (!answer) {
              console.error("No answer created, skipping setLocalDescription");
              return;
            }
            await pc.setLocalDescription(answer);
            await setDoc(signalRef, {
              answer: pc.localDescription,
              answerFrom: currentWallet,
              timestamp: Date.now()
            }, { merge: true });
          }
          // Check for answer from other player (only if we created the offer)
          else if (data.answer && data.answerFrom !== currentWallet && data.offerFrom === currentWallet) {
            if (pc.signalingState === 'have-local-offer') {
              console.log("✅ Received answer, setting remote description...");
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
          }

          // Add ICE candidates from the other peer (skip own, avoid duplicates, process in order)
          if (pc.remoteDescription) {
            const candidateKeys = Object.keys(data)
              .filter((k) => k.startsWith('candidate_') && !k.includes(currentWallet))
              .sort();
            for (const key of candidateKeys) {
              if (iceCandidatesAddedRef.current.has(key)) continue;
              try {
                const cand = data[key];
                if (cand && typeof cand === 'object') {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                  iceCandidatesAddedRef.current.add(key);
                }
              } catch (err) {
                if (err instanceof Error && !err.message?.includes('ignored')) {
                  console.warn("[Voice] addIceCandidate error:", err.message);
                }
              }
            }
          }

          // If we just became able to publish (e.g. mic enabled), kick off negotiation if we're stable.
          // Only the deterministic offerer initiates; collisions are still handled above.
          if (pc.signalingState !== "stable") return;
          if (
            amOfferer &&
            !data.offer &&
            !hasOfferedRef.current
          ) {
            hasOfferedRef.current = true;
            await renegotiate();
          }
        } catch (error) {
          console.error("❌ Error handling WebRTC signal:", error);
        }
      }, (error) => {
        if ((error as any)?.code === 'resource-exhausted') {
          console.warn('[Firestore] quota hit — switching to fail-soft mode');
          unsubscribe();
          unsubscribeSignalRef.current = null;
          if (!quotaRetryUsed) {
            quotaRetryUsed = true;
            quotaRetryTimer = setTimeout(() => {
              // One safe retry path: re-init signaling stack once.
              if (!initializedRef.current) return;
              setReinitKey((k) => k + 1);
            }, 4000);
          }
          return;
        }
        // Handle snapshot errors (e.g., permission denied, invalid path)
        if (error.code === 'invalid-argument' || error.message.includes('segments')) {
          console.error("❌ Invalid Firestore path - challengeId may be empty:", error);
          setStatus("Error: Invalid challenge ID");
          setConnected(false);
        } else {
          console.error("❌ Firestore snapshot error:", error);
        }
      });
      
      // Store unsubscribe function for cleanup
      unsubscribeSignalRef.current = unsubscribe;

      await new Promise(resolve => setTimeout(resolve, 100));
      // Offer creation is single-sourced via renegotiation path (glare-safe).
      // Status/UI updates are driven by connection state + remote tracks.
      if (quotaRetryTimer) clearTimeout(quotaRetryTimer);

    } catch (error) {
      console.error("❌ Voice chat init failed:", error);
      setConnected(false);
      
      // Provide user-friendly error messages
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          errorMessage = "Mic permission denied. Please allow mic access.";
        } else if (error.message.includes('AVAudioSession') || error.message.includes('NotReadableError')) {
          errorMessage = "Mic in use by another app. Close other apps.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No microphone found";
        } else {
          errorMessage = error.message;
        }
      }
      
      setStatus(`Error: ${errorMessage}`);
    }
  };

  const toggleMute = () => {
    if (!localStream.current || isListenOnly || mutedByCreator) return;
    
    const newMutedState = !muted;
    localStream.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMutedState; // enabled = true means NOT muted
    });
    setMuted(newMutedState);
  };
  
  // Force mute if spectator during active match or muted by creator
  useEffect(() => {
    if (localStream.current && (isListenOnly || mutedByCreator)) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = false; // Mute the track
      });
      setMuted(true);
    }
  }, [isListenOnly, mutedByCreator]);

  const cleanup = (deleteSignalsDoc: boolean) => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
    disconnectedSinceRef.current = null;

    if (unsubscribeSignalRef.current) {
      unsubscribeSignalRef.current();
      unsubscribeSignalRef.current = null;
    }
    // New session will need a fresh offer decision.
    hasOfferedRef.current = false;

    const validChallengeId = memoizedChallengeId || challengeId;
    if (deleteSignalsDoc && validChallengeId && validChallengeId.trim() !== '') {
      import("firebase/firestore").then(({ deleteDoc, doc }) => {
        deleteDoc(doc(db, "voice_signals", validChallengeId)).catch((error: any) => {
          if (error.code !== 'not-found' && !error.message?.includes('not found')) {
            console.log("⚠️ Could not delete Firestore signals document (may already be cleaned up):", error);
          }
        });
      });
    }

    // Stop all local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop();
        console.log("🛑 Stopped track:", track.kind);
      });
      localStream.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    removeSpeaker(memoizedChallengeId || challengeId, currentWallet).catch(() => {});
    setConnected(false);
    setPeerConnected(false);
    setMuted(false);
    setStatus("");
    iceCandidatesAddedRef.current.clear();
  };

  // No auto getUserMedia from effects (iOS requires user gesture for mic). Approved speakers use "Enable mic" button.

  if (voiceDisabled) {
    return (
      <div className="p-3 rounded-lg border border-purple-700/50 bg-purple-900/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-purple-300 text-sm font-semibold">Voice chat disabled</span>
        </div>
      </div>
    );
  }

  if (isSpectator && isActiveMatch) {
    return (
      <div className="p-3 rounded-lg border border-purple-700/50 bg-purple-900/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <div className="flex-1">
            <span className="text-purple-300 text-sm font-semibold">🔇 Listen Only – Spectators cannot speak during active matches</span>
            <p className="text-[10px] text-purple-200/70 mt-0.5">Voice chat is available in pre-match lobby only.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSpectator && !isApprovedSpeaker) {
    const handleRequestMic = async () => {
      if (requestingMic || micRequestStatus === 'pending') return;
      setRequestingMic(true);
      setRequestMicError(null);
      try {
        if (!challengeId?.trim() || !currentWallet?.trim()) {
          throw new Error('Missing challenge or wallet');
        }
        await createMicRequest(challengeId, currentWallet);
        setMicRequestStatus('pending');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Request mic failed:', e);
        setRequestMicError(msg || 'Request failed. Try again.');
      } finally {
        setRequestingMic(false);
      }
    };
    const handleTapToHearSpectator = () => {
      remoteAudioRef.current?.play().then(() => setNeedTapToHear(false)).catch(() => {});
    };
    return (
      <div className="p-3 rounded-lg border border-purple-700/50 bg-purple-900/20">
        <audio ref={remoteAudioRef} autoPlay />
        {needTapToHear && peerConnected && (
          <button
            type="button"
            onClick={handleTapToHearSpectator}
            className="w-full mb-2 py-1.5 px-2 rounded bg-[#0B0C12]/90 border border-white/10 text-white text-xs font-medium"
          >
            🔊 Tap to hear voice
          </button>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${peerConnected ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`} />
            <div className="flex flex-col min-w-0">
              <span className="text-purple-200 text-sm font-medium">
                {micRequestStatus === 'pending' ? 'Mic requested' : micRequestStatus === 'denied' ? 'Request denied' : 'Listening'}
              </span>
              <span className="text-[10px] text-purple-300/80 truncate">
                {peerConnected ? 'Hearing speakers' : 'Connecting...'}
              </span>
            </div>
          </div>
          {micRequestStatus !== 'pending' && micRequestStatus !== 'approved' && (
            <button
              type="button"
              onClick={handleRequestMic}
              disabled={requestingMic || isActiveMatch}
              className="px-3 py-2 rounded-lg bg-purple-600/30 hover:bg-purple-600/45 border border-white/10 text-purple-100 text-sm font-medium disabled:opacity-50 flex-shrink-0"
            >
              {requestingMic ? 'Requesting...' : 'Request Mic'}
            </button>
          )}
        </div>
        {requestMicError && (
          <p className="text-red-400 text-xs mt-1.5" role="alert">
            {requestMicError}
          </p>
        )}
      </div>
    );
  }

  // Approved speaker but mic not enabled yet (user gesture required on iOS – no getUserMedia from effects)
  if (inSpeakerList && !micEnabledByGesture) {
    const handleEnableMic = async () => {
      try {
        setStatus("Requesting mic...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.current = stream;
        const pc = peerConnection.current;
        if (pc) {
          // 5) Mic toggle fix: add track first, then renegotiate after short delay
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          const signalRef = doc(db, "voice_signals", challengeId!);
          setTimeout(() => {
            if (!peerConnection.current) return;
            const pcNow = peerConnection.current;
            if (pcNow.signalingState !== "stable") {
              console.log("Skipping renegotiation, not stable");
              return;
            }
            if (makingOfferRef.current) return;
            if (hasOfferedRef.current) {
              console.log("Offer already created, skipping");
              return;
            }
            // Only the deterministic offerer should initiate
            const sortedWallets = [...participants].map((p) => p?.toLowerCase()).filter(Boolean).sort();
            const amOfferer = sortedWallets.length === 0 || (currentWallet && currentWallet.toLowerCase() === sortedWallets[0]);
            if (!amOfferer) return;
            (async () => {
              try {
                makingOfferRef.current = true;
                const offer = await pcNow.createOffer();
                await pcNow.setLocalDescription(offer);
                hasOfferedRef.current = true;
                await setDoc(signalRef, { offer, offerFrom: currentWallet, timestamp: Date.now() }, { merge: true });
              } catch (e) {
                console.error("❌ renegotiation after mic enable failed:", e);
              } finally {
                makingOfferRef.current = false;
              }
            })();
          }, 150);
        }
        setConnected(true);
        setMuted(false);
        setMicEnabledByGesture(true);
        setStatus("Voice connected!");
      } catch (e) {
        setStatus("Error: Could not enable mic");
      }
    };
    return (
      <div className="p-3 rounded-lg border border-purple-700/50 bg-purple-900/20">
        <audio ref={remoteAudioRef} autoPlay />
        {needTapToHear && peerConnected && (
          <button
            type="button"
            onClick={() => remoteAudioRef.current?.play().then(() => setNeedTapToHear(false)).catch(() => {})}
            className="w-full mb-2 py-1.5 px-2 rounded bg-[#0B0C12]/90 border border-white/10 text-white text-xs font-medium"
          >
            🔊 Tap to hear voice
          </button>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${peerConnected ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`} />
            <div className="flex flex-col min-w-0">
              <span className="text-purple-200 text-sm font-medium">Approved – listen only until you enable mic</span>
              <span className="text-[10px] text-purple-300/80">Tap below to speak.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEnableMic}
            className="px-3 py-2 rounded-lg bg-green-600/40 hover:bg-green-600/60 border border-green-500/50 text-green-200 text-sm font-medium flex-shrink-0"
          >
            Enable mic
          </button>
        </div>
      </div>
    );
  }

  const isPaused = muted || mutedByCreator;
  const isBackgrounded = typeof document !== 'undefined' && document.hidden;

  const handleTapToHear = () => {
    remoteAudioRef.current?.play().then(() => setNeedTapToHear(false)).catch(() => {});
  };

  return (
    <div className={`p-3 rounded-lg border ${
      status.includes('Error') || status.includes('use by another')
        ? 'bg-red-900/20 border-red-500/30'
        : 'bg-gray-800 border-gray-700'
    }`}>
      <audio ref={remoteAudioRef} autoPlay />
      {needTapToHear && peerConnected && (
        <button
          type="button"
          onClick={handleTapToHear}
          className="w-full mb-2 py-1.5 px-2 rounded bg-[#0B0C12]/90 border border-white/10 text-white text-xs font-medium"
        >
          🔊 Tap to hear voice
        </button>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            peerConnected ? 'bg-green-500 animate-pulse' :
            connected ? 'bg-orange-400' :
            'bg-red-500'
          }`} />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-white text-sm font-medium">
              {peerConnected ? (isPaused ? 'Mic paused' : 'Speaking') : connected ? 'Voice Chat' : 'Voice Unavailable'}
            </span>
            <span className={`text-xs truncate ${status.includes('Error') ? 'text-red-400' : 'text-gray-400'}`}>
              {isPaused && isBackgrounded ? 'Mic paused (backgrounded)' : status}
            </span>
            {status.includes('Error') && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  💬 Text chat works fine
                </span>
                <button
                  onClick={() => {
                    cleanup(false);
                    setVoiceDisabled(true);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Skip voice
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          disabled={!connected || mutedByCreator}
          className={`px-3 py-2 rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
            muted || mutedByCreator ? 'bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-green-600 hover:bg-green-700 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
          }`}
          title={mutedByCreator ? 'Muted by challenge creator' : muted ? 'Unmute' : 'Mute'}
        >
          {muted || mutedByCreator ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const VoiceChat = React.memo(VoiceChatComponent, (prevProps, nextProps) => {
  // Re-render if challengeId, currentWallet, status, or role changed
  return prevProps.challengeId === nextProps.challengeId && 
         prevProps.currentWallet === nextProps.currentWallet &&
         prevProps.challengeStatus === nextProps.challengeStatus &&
         prevProps.isSpectator === nextProps.isSpectator &&
         prevProps.isCreator === nextProps.isCreator;
});

