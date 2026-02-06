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

  const isActiveMatch = challengeStatus === 'active';
  const inSpeakerList = speakerWallets.some((w) => w?.toLowerCase() === currentWallet?.toLowerCase());
  const isApprovedSpeaker = isSpectator && inSpeakerList;
  const isListenOnly = (isSpectator && isActiveMatch) || (isSpectator && !inSpeakerList);
  const publishMic = inSpeakerList;
  
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
  const [needTapToHear, setNeedTapToHear] = useState(false);

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
    if (!canConnect) return;

    initInProgressRef.current = true;
    initializedRef.current = true;
    currentChallengeIdRef.current = memoizedChallengeId;

    initVoiceChat(publishMic).finally(() => {
      initInProgressRef.current = false;
    });

    return () => {
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
      let stream: MediaStream | null = localStream.current;
      if (publishMicNow) {
        if (stream) {
          const hasActiveTrack = stream.getAudioTracks().some((t) => t.readyState === 'live');
          if (!hasActiveTrack) stream = null;
        }
        if (!stream) {
          setStatus("Requesting mic permission...");
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStream.current = stream;
          setConnected(true);
          setStatus("Mic ready, waiting for opponent...");
        } else {
          setConnected(true);
          setStatus("Mic ready, waiting for opponent...");
        }
      } else {
        setConnected(true);
        setStatus("Listening...");
      }

      let pc = peerConnection.current;
      if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
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
      const unsubscribe = onSnapshot(signalRef, async (snapshot) => {
        // Check if challengeId is still valid (in case it changed)
        const currentChallengeId = memoizedChallengeId; // Capture in closure
        if (!currentChallengeId || currentChallengeId.trim() === '') {
          console.log("⚠️ challengeId became invalid during snapshot, ignoring");
          return;
        }
        
        const data = snapshot.data();
        if (!data) return;

        try {
          // Check for offer from other player
          if (data.offer && data.offerFrom !== currentWallet && !pc.currentRemoteDescription) {
            console.log("📞 Received offer, creating answer...");
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await setDoc(signalRef, {
              answer,
              answerFrom: currentWallet,
              timestamp: Date.now()
            }, { merge: true });
          } 
          // Check for answer from other player (only if we created the offer)
          else if (data.answer && data.answerFrom !== currentWallet && data.offerFrom === currentWallet) {
            // Only set if we're in the right state (waiting for answer)
            if (pc.signalingState === 'have-local-offer' && !pc.currentRemoteDescription) {
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
        } catch (error) {
          console.error("❌ Error handling WebRTC signal:", error);
        }
      }, (error) => {
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

      // Deterministic offerer: only the peer with lowest wallet (case-insensitive) creates the offer
      const sortedWallets = [...participants].map((p) => p?.toLowerCase()).filter(Boolean).sort();
      const amOfferer = sortedWallets.length === 0 || (currentWallet && currentWallet.toLowerCase() === sortedWallets[0]);

      const { getDoc } = await import("firebase/firestore");
      const signalSnap = await getDoc(signalRef);
      const signalData = signalSnap.data();

      if (!signalData?.offer) {
        if (amOfferer) {
          console.log("[Voice] Creating offer (offerer by deterministic rule)");
          setStatus("Creating offer, waiting for opponent...");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(signalRef, {
            offer,
            offerFrom: currentWallet,
            timestamp: Date.now()
          }, { merge: true });
        } else {
          setStatus("Waiting for opponent to create offer...");
        }
      } else if (signalData.offerFrom !== currentWallet) {
        console.log("[Voice] Offer already exists from opponent, will answer when ready");
        setStatus("Found opponent, connecting...");
      }

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

  // When we're added to the speaker list (approved spectator or participant after addSpeaker), add mic to existing connection
  useEffect(() => {
    if (!inSpeakerList || !challengeId || !currentWallet) return;
    const pc = peerConnection.current;
    if (!pc || pc.connectionState !== 'connected' || localStream.current) return;

    let cancelled = false;
    (async () => {
      try {
        setStatus("Requesting mic permission...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream.current = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        setConnected(true);
        setMuted(false);
        setStatus("Voice connected!");
      } catch (e) {
        if (!cancelled) setStatus("Error: Could not enable mic");
      }
    })();
    return () => { cancelled = true; };
  }, [inSpeakerList, challengeId, currentWallet]);

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
            className="w-full mb-2 py-1.5 px-2 rounded bg-amber-600/40 border border-amber-500/50 text-amber-200 text-xs font-medium"
          >
            🔊 Tap to hear voice
          </button>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${peerConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
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
              className="px-3 py-2 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-sm font-medium disabled:opacity-50 flex-shrink-0"
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
          className="w-full mb-2 py-1.5 px-2 rounded bg-amber-600/40 border border-amber-500/50 text-amber-200 text-xs font-medium"
        >
          🔊 Tap to hear voice
        </button>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            peerConnected ? 'bg-green-500 animate-pulse' :
            connected ? 'bg-yellow-500' :
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
                    cleanup();
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

