import React, { useEffect, useState, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { doc, setDoc, onSnapshot, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase/config";

interface VoiceChatProps {
  challengeId: string;
  currentWallet: string;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({ challengeId, currentWallet }) => {
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  console.log("🎤 VoiceChat component mounted", { challengeId, currentWallet });

  // Initialize voice chat
  useEffect(() => {
    console.log("🎤 VoiceChat useEffect triggered - initializing...");
    initVoiceChat();
    
    return () => {
      console.log("🎤 VoiceChat useEffect cleanup");
      cleanup();
    };
  }, [challengeId, currentWallet]);

  const initVoiceChat = async () => {
    console.log("🎤 Starting voice chat initialization...");
    try {
      // Get user's microphone
      console.log("🎤 Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("✅ Microphone permission granted!");
      localStream.current = stream;
      setConnected(true);

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
          console.log("✅ Voice chat connected!");
        } else if (pc.connectionState === 'disconnected') {
          setPeerConnected(false);
          console.log("⚠️ Voice chat disconnected");
        } else if (pc.connectionState === 'failed') {
          setPeerConnected(false);
          console.log("❌ Voice chat connection failed");
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
        console.log("📞 Creating offer...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await setDoc(signalRef, {
          offer,
          offerFrom: currentWallet,
          timestamp: Date.now()
        }, { merge: true });
      }

    } catch (error) {
      console.error("❌ Voice chat init failed:", error);
      setConnected(false);
    }
  };

  const toggleMute = () => {
    if (!localStream.current) return;
    
    const newMutedState = !muted;
    localStream.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMutedState; // enabled = true means NOT muted
    });
    setMuted(newMutedState);
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

  return (
    <div className="flex justify-between items-center bg-gray-800 p-2 rounded-lg border border-gray-700">
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay />
      
      <span className="text-white text-sm">
        {connected 
          ? (peerConnected ? '🎙️ Voice Connected' : '🔌 Connecting...') 
          : '❌ Disconnected'}
      </span>
      
      <button
        onClick={toggleMute}
        disabled={!connected}
        className={`px-3 py-1 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          muted ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
    </div>
  );
};

