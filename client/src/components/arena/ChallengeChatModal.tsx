import React from "react";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-amber-400/30 bg-[#07080C]/95 p-6 shadow-[0_0_60px_rgba(255,215,130,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Chat - {challengeTitle}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-400">Chat feature coming soon...</p>
        </div>
      </div>
    </div>
  );
};
