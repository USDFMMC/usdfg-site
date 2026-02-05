import React, { useEffect, useState, useRef, useMemo } from "react";
import { Mic, MicOff } from "lucide-react";
import { doc, setDoc, onSnapshot, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase/config";

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
  
  // Determine if voice is allowed based on status and role
  const isActiveMatch = challengeStatus === 'active';
  const allowVoice = !isActiveMatch || !isSpectator; // Spectators can't speak during active matches
  const isListenOnly = isSpectator && isActiveMatch; // Spectators are listen-only during active matches
  
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
        // Ignore permission errors
        if (error.code !== 'permission-denied' && error.code !== 'unavailable') {
          console.error('Error listening to mute status:', error);
        }
      }
    );
    
    return () => unsubscribe();
  }, [challengeId, currentWallet]);
  
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const unsubscribeSignalRef = useRef<(() => void) | null>(null);
  const disconnectedSinceRef = useRef<number | null>(null);
  const recoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryAttemptedRef = useRef(false);

  // Use refs to track initialization and prevent unnecessary re-initialization
  const initializedRef = useRef(false);
  const currentChallengeIdRef = useRef<string>('');
  const initInProgressRef = useRef(false);
  const [reinitKey, setReinitKey] = useState(0);

  // Memoize challengeId to prevent unnecessary re-renders
  const memoizedChallengeId = useMemo(() => challengeId, [challengeId]);

  // When user becomes listen-only: tear down connection immediately (do not delete signaling doc)
  useEffect(() => {
    if (!isListenOnly) return;
    cleanup(false);
    initializedRef.current = false;
    currentChallengeIdRef.current = '';
    setStatus("Voice disabled for spectators during active matches");
    setConnected(false);
    setPeerConnected(false);
  }, [isListenOnly]);

  // Initialize voice chat - only if challengeId is valid and not listen-only
  useEffect(() => {
    // Skip if already initialized for this challengeId or init in progress
    if ((initializedRef.current && currentChallengeIdRef.current === memoizedChallengeId) || initInProgressRef.current) {
      return;
    }

    if (isListenOnly || voiceDisabled || !memoizedChallengeId || memoizedChallengeId.trim() === '') {
      return;
    }

    initInProgressRef.current = true;
    initializedRef.current = true;
    currentChallengeIdRef.current = memoizedChallengeId;

    initVoiceChat().finally(() => {
      initInProgressRef.current = false;
    });

    return () => {
      if (currentChallengeIdRef.current !== memoizedChallengeId) {
        cleanup(true);
        initializedRef.current = false;
        currentChallengeIdRef.current = '';
        initInProgressRef.current = false;
      }
    };
  }, [memoizedChallengeId, voiceDisabled, isListenOnly, reinitKey]);

  // Preserve audio connection when page visibility changes (backgrounding on mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("📱 Page hidden - preserving audio connection");
        // Don't cleanup when page is hidden - keep connection alive
        // The audio tracks will continue playing in background
      } else {
        console.log("📱 Page visible - resuming audio if needed");
        // Resume audio playback if it was paused
        if (remoteAudioRef.current) {
          remoteAudioRef.current.play().catch((err) => {
            console.warn("[Voice] audio.play() rejected (visibility):", err?.message ?? err);
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBlur = () => {
      console.log("📱 Page blurred - keeping audio active");
    };

    const handleFocus = () => {
      console.log("📱 Page focused - ensuring audio is active");
      if (remoteAudioRef.current) {
        remoteAudioRef.current.play().catch((err) => {
          console.warn("[Voice] audio.play() rejected (focus):", err?.message ?? err);
        });
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const initVoiceChat = async () => {
    // Use memoized challengeId
    const validChallengeId = memoizedChallengeId;
    if (!validChallengeId || validChallengeId.trim() === '') {
      console.error("❌ Invalid challengeId for voice chat:", validChallengeId);
      setStatus("Error: Invalid challenge ID");
      setConnected(false);
      initInProgressRef.current = false;
      return;
    }

    // Removed initialization logging - excessive logging removed
    try {
      // Check if we already have an active stream (prevents duplicate mic permission popups)
      let stream = localStream.current;
      
      // Check if existing stream is still active
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        const hasActiveTrack = audioTracks.some(track => track.readyState === 'live');
        
        if (hasActiveTrack) {
          console.log("✅ Reusing existing microphone stream (no permission popup needed)");
          setConnected(true);
          setStatus("Mic ready, waiting for opponent...");
        } else {
          // Stream exists but tracks are not live, get new stream
          stream = null;
        }
      }
      
      // Only request mic permission if we don't have an active stream
      if (!stream) {
        setStatus("Requesting mic permission...");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.current = stream;
        setConnected(true);
        setStatus("Mic ready, waiting for opponent...");
      }

      // Only create new peer connection if we don't have one or if challengeId changed
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

      // Add local stream to peer connection (only if not already added)
      const existingSenders = pc.getSenders();
      const hasAudioTrack = existingSenders.some(sender => 
        sender.track && sender.track.kind === 'audio' && sender.track.readyState === 'live'
      );
      
      if (!hasAudioTrack) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      pc.ontrack = (event) => {
        const stream = event.streams?.[0];
        if (stream) {
          console.log("[Voice] remote track received", { streamId: stream.id, trackKind: event.track?.kind });
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.play().catch((err) => {
              console.warn("[Voice] audio.play() rejected:", err?.message ?? err);
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

          Object.keys(data).forEach(async (key) => {
            if (key.startsWith('candidate_') && !key.includes(currentWallet)) {
              try {
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(new RTCIceCandidate(data[key]));
                }
              } catch (err) {
                console.warn("[Voice] addIceCandidate error:", err instanceof Error ? err.message : err);
              }
            }
          });
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
    
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    // Reset connection states
    setConnected(false);
    setPeerConnected(false);
    setMuted(false);
    setStatus("");
  };

  // If voice is disabled or spectator during active match, show restricted UI
  if (voiceDisabled || isListenOnly) {
    return (
      <div className="p-3 rounded-lg border border-purple-700/50 bg-purple-900/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <div className="flex-1">
            <span className="text-purple-300 text-sm font-semibold">
              {isListenOnly ? '🔇 Listen Only - Spectators cannot speak during active matches' : 'Voice chat disabled'}
            </span>
            {isListenOnly && (
              <p className="text-[10px] text-purple-200/70 mt-0.5">
                Spectators cannot influence match outcomes. Voice chat is available in pre-match lobby only.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${
      status.includes('Error') || status.includes('use by another') 
        ? 'bg-red-900/20 border-red-500/30' 
        : 'bg-gray-800 border-gray-700'
    }`}>
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay />
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 flex-1">
          {/* Status Indicator */}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            peerConnected ? 'bg-green-500 animate-pulse' : 
            connected ? 'bg-yellow-500' : 
            'bg-red-500'
          }`} />
          
          {/* Status Text */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-white text-sm font-medium">
              {peerConnected ? '🎙️ Voice Connected' : connected ? '🔌 Voice Chat' : '❌ Voice Unavailable'}
            </span>
            <span className={`text-xs truncate ${
              status.includes('Error') ? 'text-red-400' : 'text-gray-400'
            }`}>
              {status}
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

