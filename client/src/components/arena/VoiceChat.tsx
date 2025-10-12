import React, { useEffect, useState, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { collection, doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
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

  // Initialize voice chat
  useEffect(() => {
    initVoiceChat();
    
    return () => {
      cleanup();
    };
  }, [challengeId, currentWallet]);

  const initVoiceChat = async () => {
    try {
      // Get user's microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
      setConnected(true);

      // Create peer connection
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
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

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await setDoc(doc(db, "voice_signals", `${challengeId}_${currentWallet}`), {
            candidate: event.candidate.toJSON(),
            from: currentWallet,
            timestamp: Date.now()
          }, { merge: true });
        }
      };

      // Listen for remote signals
      const signalRef = doc(db, "voice_signals", `${challengeId}_peer`);
      const unsubscribe = onSnapshot(signalRef, async (snapshot) => {
        const data = snapshot.data();
        if (!data) return;

        if (data.offer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(data.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await setDoc(doc(db, "voice_signals", `${challengeId}_${currentWallet}`), {
            answer,
            from: currentWallet,
            timestamp: Date.now()
          }, { merge: true });
        } else if (data.answer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(data.answer);
        } else if (data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(doc(db, "voice_signals", `${challengeId}_${currentWallet}`), {
        offer,
        from: currentWallet,
        timestamp: Date.now()
      }, { merge: true });

    } catch (error) {
      console.error("❌ Voice chat init failed:", error);
      setConnected(false);
    }
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMuted(!muted);
    }
  };

  const cleanup = async () => {
    // Stop all tracks
    localStream.current?.getTracks().forEach((track) => track.stop());
    
    // Close peer connection
    peerConnection.current?.close();
    
    // Clean up Firestore signals
    try {
      await deleteDoc(doc(db, "voice_signals", `${challengeId}_${currentWallet}`));
    } catch (error) {
      console.error("Failed to clean up voice signals:", error);
    }
    
    setConnected(false);
    setPeerConnected(false);
  };

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-3">
      <audio ref={remoteAudioRef} autoPlay />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-white text-sm font-medium">
            {connected ? (peerConnected ? '🎙️ Voice Connected' : '🎙️ Connecting...') : '❌ Voice Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            disabled={!connected}
            className={`p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              muted
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <p className="text-xs text-gray-400 mt-2">
        {connected 
          ? peerConnected 
            ? '✅ Connected with opponent' 
            : '⏳ Waiting for opponent...'
          : '⚠️ Voice unavailable'}
      </p>
    </div>
  );
};

