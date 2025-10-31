import React, { useState } from "react";
import { ChatBox } from "./ChatBox";
import { VoiceChat } from "./VoiceChat";
import { X, Minimize2, Maximize2 } from "lucide-react";

interface ChallengeChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId: string;
  challengeTitle: string;
  currentWallet: string;
  allowSpectators?: boolean;
  isParticipant?: boolean;
}

export const ChallengeChatModal: React.FC<ChallengeChatModalProps> = ({
  isOpen,
  onClose,
  challengeId,
  challengeTitle,
  currentWallet,
  allowSpectators = true,
  isParticipant = false
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Minimized floating button */}
      {isMinimized ? (
        <div className="fixed bottom-20 right-4 z-40 md:bottom-24 md:right-6">
          <button
            onClick={() => setIsMinimized(false)}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-500 text-white rounded-lg shadow-[0_0_15px_rgba(255,215,130,0.2)] hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
          </button>
        </div>
      ) : (
        /* Full chat panel - non-blocking sidebar */
        <div className="fixed top-0 right-0 h-full w-full sm:w-96 md:w-[420px] z-40 flex flex-col bg-[#07080C]/98 backdrop-blur-md border-l border-amber-400/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-amber-400/20 bg-[#07080C]/95">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">Chat</h3>
              <p className="text-xs text-gray-400 truncate mt-0.5">{challengeTitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content - Chat and Voice */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Voice Chat */}
            {isParticipant && challengeId && challengeId.trim() !== '' && (
              <div className="mb-4">
                <VoiceChat challengeId={challengeId} currentWallet={currentWallet} />
              </div>
            )}

            {/* Text Chat */}
            {challengeId && challengeId.trim() !== '' && (
              <ChatBox challengeId={challengeId} currentWallet={currentWallet} />
            )}
          </div>
        </div>
      )}
    </>
  );
};
