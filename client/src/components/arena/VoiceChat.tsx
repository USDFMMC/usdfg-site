import React, { useEffect, useState, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { doc, setDoc, onSnapshot, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase/config";
import { setupAudioKeepAlive, keepAudioAlive } from "@/lib/audio-utils";

interface VoiceChatProps {
  challengeId: string;
  currentWallet: string;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({ challengeId, currentWallet }) => {
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [status, setStatus] = useState<string>("Initializing...");
  const [voiceDisabled, setVoiceDisabled] = useState(false);
  
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  console.log("🎤 VoiceChat component mounted", { challengeId, currentWallet });

  // Initialize voice chat
  useEffect(() => {
    if (voiceDisabled) return;
    
    console.log("🎤 VoiceChat useEffect triggered - initializing...");
    
    // Setup audio keep-alive for mobile
    setupAudioKeepAlive();
    
    initVoiceChat();
    
    return () => {
      console.log("🎤 VoiceChat useEffect cleanup");
      cleanup();
    };
  }, [challengeId, currentWallet, voiceDisabled]);

  const initVoiceChat = async () => {
    console.log("🎤 Starting voice chat initialization...");
    try {
      // Get user's microphone
      setStatus("Requesting mic permission...");
      console.log("🎤 Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("✅ Microphone permission granted!");
      localStream.current = stream;
      setConnected(true);
      setStatus("Mic ready, waiting for opponent...");

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
      
      const pc = new RTCPeerConnection(configuration);
      peerConnection.current = pc;

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming tracks
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(err => console.error("Audio play failed:", err));
          setPeerConnected(true);
        }
      };

      // Handle ICE candidates - store in array instead of overwriting
      const iceCandidatesRef = { sent: new Set<string>() };
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("🧊 New ICE candidate:", event.candidate.type);
          const candidateKey = `candidate_${currentWallet}_${Date.now()}`;
          await setDoc(doc(db, "voice_signals", challengeId), {
            [candidateKey]: event.candidate.toJSON(),
            timestamp: Date.now()
          }, { merge: true });
        } else {
          console.log("🧊 All ICE candidates sent");
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log("🔌 Connection state:", pc.connectionState);
        if (pc.connectionState === 'connected') {
          setPeerConnected(true);
          setStatus("Voice connected!");
          reconnectAttempts.current = 0; // Reset on success
          console.log("✅ Voice chat connected!");
        } else if (pc.connectionState === 'connecting') {
          setStatus("Connecting to opponent...");
        } else if (pc.connectionState === 'disconnected') {
          setPeerConnected(false);
          setStatus("Disconnected, reconnecting...");
          console.log("⚠️ Voice chat disconnected - attempting reconnect");
        } else if (pc.connectionState === 'failed') {
          setPeerConnected(false);
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            setStatus(`Connection failed, retry ${reconnectAttempts.current}/${maxReconnectAttempts}...`);
            console.log(`❌ Voice chat connection failed - retry attempt ${reconnectAttempts.current}`);
            // Attempt to restart ICE
            pc.restartIce();
          } else {
            setStatus("Connection failed (check network)");
            console.error("❌ Voice chat connection failed after max retries");
          }
        }
      };

      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log("🧊 ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log("✅ ICE connection established!");
        } else if (pc.iceConnectionState === 'failed') {
          console.error("❌ ICE connection failed - may need better TURN servers");
        }
      };

      // Listen for remote signals from the shared document
      const signalRef = doc(db, "voice_signals", challengeId);
      const unsubscribe = onSnapshot(signalRef, async (snapshot) => {
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

          // Handle ICE candidates from other players
          Object.keys(data).forEach(async (key) => {
            if (key.startsWith('candidate_') && !key.includes(currentWallet)) {
              try {
                if (pc.remoteDescription) {
                  console.log("🧊 Adding remote ICE candidate");
                  await pc.addIceCandidate(new RTCIceCandidate(data[key]));
                } else {
                  console.log("⏳ Queuing ICE candidate (no remote description yet)");
                }
              } catch (err) {
                console.error("❌ Failed to add ICE candidate:", err);
              }
            }
          });
        } catch (error) {
          console.error("❌ Error handling WebRTC signal:", error);
        }
      });

      // Small delay to let listener attach
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if we should create offer (first person in the room)
      const { getDoc } = await import("firebase/firestore");
      const signalSnap = await getDoc(signalRef);
      const signalData = signalSnap.data();
      
      if (!signalData?.offer) {
        console.log("📞 Creating offer (first person in room)...");
        setStatus("Creating offer, waiting for opponent...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await setDoc(signalRef, {
          offer,
          offerFrom: currentWallet,
          timestamp: Date.now()
        }, { merge: true });
      } else if (signalData.offerFrom !== currentWallet) {
        console.log("📞 Offer already exists from opponent, will answer when ready");
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
    if (!localStream.current) return;
    
    const newMutedState = !muted;
    localStream.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMutedState; // enabled = true means NOT muted
    });
    setMuted(newMutedState);
    
    // Keep audio context alive on mobile
    keepAudioAlive();
  };

  const cleanup = async () => {
    console.log("🧹 Cleaning up voice chat...");
    
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
    
    // Clean up Firestore signals
    try {
      await deleteDoc(doc(db, "voice_signals", challengeId));
      console.log("✅ Cleaned up Firestore signals");
    } catch (error) {
      console.error("Failed to clean up voice signals:", error);
    }
    
    setConnected(false);
    setPeerConnected(false);
    setMuted(false);
  };

  // If voice is disabled, show minimal UI
  if (voiceDisabled) {
    return (
      <div className="p-3 rounded-lg border border-gray-700 bg-gray-800/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-gray-400 text-sm">Voice chat disabled (using text only)</span>
          </div>
          <button
            onClick={() => {
              setVoiceDisabled(false);
              setStatus("Initializing...");
            }}
            className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs transition-colors"
          >
            Enable Voice
          </button>
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
          disabled={!connected}
          className={`px-3 py-2 rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
            muted ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20' : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20'
          }`}
        >
          {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

