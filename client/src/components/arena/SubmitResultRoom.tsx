import React, { useState, useRef, useEffect, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Loader2, Camera, Upload, Image as ImageIcon, Minimize2, Maximize2 } from "lucide-react";
import { ChatBox } from "./ChatBox";
import { VoiceChat } from "./VoiceChat";

interface SubmitResultRoomProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId: string;
  challengeTitle: string;
  currentWallet: string;
  onSubmit: (didWin: boolean, proofFile?: File | null) => Promise<void>;
  isSubmitting?: boolean;
}

export const SubmitResultRoom: React.FC<SubmitResultRoomProps> = memo(({
  isOpen,
  onClose,
  challengeId,
  challengeTitle,
  currentWallet,
  onSubmit,
  isSubmitting = false,
}) => {
  const [selectedResult, setSelectedResult] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback(() => {
    setProofImage(null);
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedResult === null) return;
    
    setIsLoading(true);
    try {
      await onSubmit(selectedResult, proofFile);
      onClose();
    } catch (error: any) {
      console.error("❌ Error submitting result:", error);
      alert(error.message || "Failed to submit result. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedResult, proofFile, onSubmit, onClose]);

  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading && !isSubmitting) {
        console.log('⌨️ ESC pressed - closing modal');
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isLoading, isSubmitting, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Minimized floating button */}
          {isMinimized ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-20 left-4 z-40 md:bottom-24 md:left-6"
            >
              <button
                onClick={() => setIsMinimized(false)}
                className="px-3 py-1.5 bg-gradient-to-r from-yellow-600/90 to-orange-500/90 text-white rounded-lg shadow-[0_0_15px_rgba(255,215,130,0.2)] hover:brightness-110 transition-all flex items-center gap-1.5 text-sm font-medium border border-amber-400/30"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Submit Result</span>
              </button>
            </motion.div>
          ) : (
            <>
              {/* Light backdrop - non-blocking */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                onClick={() => setIsMinimized(true)}
              />

              {/* Main Panel - Slides up from bottom, non-blocking */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full max-w-xl bg-gradient-to-br from-gray-900 via-amber-900/20 to-gray-900 border-t border-x border-amber-500/20 rounded-t-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto pointer-events-auto">
                  <div className="p-3 space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start sticky top-0 bg-gray-900/95 backdrop-blur-sm -mx-3 px-3 py-3 border-b border-gray-800/50 z-10">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-yellow-400/90 to-orange-500/90 rounded-lg">
                          <Trophy className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white">Submit Result</h2>
                          <p className="text-xs text-gray-400 mt-0.5">{challengeTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setIsMinimized(true)}
                          disabled={isLoading || isSubmitting}
                          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 p-1.5"
                          title="Minimize"
                        >
                          <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={onClose}
                          disabled={isLoading || isSubmitting}
                          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 p-1.5"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                {/* Result Selection */}
                <div>
                  <div className="bg-gradient-to-r from-amber-500/5 to-amber-600/5 border border-amber-500/20 rounded-lg p-2 mb-3">
                    <p className="text-sm font-semibold text-white text-center">
                      Did you win this match?
                    </p>
                  </div>

                  {/* YES/NO Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* YES Button */}
                    <button
                      onClick={() => setSelectedResult(true)}
                      disabled={isLoading || isSubmitting}
                      className={`
                        relative overflow-hidden p-3 rounded-lg border transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${
                          selectedResult === true
                            ? "border-green-500/60 bg-gradient-to-br from-green-500/10 to-emerald-500/10 shadow shadow-green-500/10"
                            : "border-zinc-700/50 bg-zinc-800/60 hover:border-green-500/30 hover:bg-green-500/5"
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">🏆</div>
                        <p className="text-sm font-bold text-white">YES</p>
                        <p className="text-xs text-gray-400 mt-0.5">I won</p>
                      </div>
                      {selectedResult === true && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* NO Button */}
                    <button
                      onClick={() => setSelectedResult(false)}
                      disabled={isLoading || isSubmitting}
                      className={`
                        relative overflow-hidden p-3 rounded-lg border transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${
                          selectedResult === false
                            ? "border-red-500/60 bg-gradient-to-br from-red-500/10 to-rose-500/10 shadow shadow-red-500/10"
                            : "border-zinc-700/50 bg-zinc-800/60 hover:border-red-500/30 hover:bg-red-500/5"
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">😔</div>
                        <p className="text-sm font-bold text-white">NO</p>
                        <p className="text-xs text-gray-400 mt-0.5">I lost</p>
                      </div>
                      {selectedResult === false && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Proof Upload Section */}
                {selectedResult === true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-amber-300">
                          📸 Upload Proof (Optional)
                        </p>
                      </div>

                      {!proofImage ? (
                        <div className="space-y-1.5">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageCapture}
                            className="hidden"
                          />
                          
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg transition-all text-xs font-medium"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Take Photo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (fileInputRef.current) {
                                  fileInputRef.current.removeAttribute('capture');
                                  fileInputRef.current.click();
                                }
                              }}
                              className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-amber-700/90 hover:bg-amber-800 text-white rounded-lg transition-all text-xs font-medium"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload</span>
                            </button>
                          </div>

                          <p className="text-xs text-gray-400 text-center mt-1.5">
                            Screenshot of victory screen or match result
                          </p>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={proofImage}
                            alt="Proof"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-1.5 right-1.5 p-1.5 bg-red-600/90 hover:bg-red-700 rounded-full text-white transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-green-600/90 rounded text-xs text-white flex items-center gap-1">
                            <ImageIcon className="w-2.5 h-2.5" />
                            Proof uploaded
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Voice Chat - Available to all players (up to 24) in Submit Result Room */}
                {challengeId && challengeId.trim() !== '' && (
                  <VoiceChat challengeId={challengeId} currentWallet={currentWallet} />
                )}

                {/* Text Chat - Available to all players (up to 24) in Submit Result Room */}
                {challengeId && challengeId.trim() !== '' && (
                  <ChatBox challengeId={challengeId} currentWallet={currentWallet} />
                )}

                {/* Info Box */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2">
                  <p className="text-xs text-blue-300 text-center">
                    ⏰ Your opponent has 2 hours to submit their result
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={selectedResult === null || isLoading || isSubmitting}
                    className={`
                      w-full py-2 rounded-lg font-semibold text-sm transition-all duration-200 border
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${
                        selectedResult !== null
                          ? "bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-700 hover:to-amber-800 text-white shadow shadow-amber-500/10 border-amber-400/30"
                          : "bg-zinc-700/60 text-gray-400 cursor-not-allowed border-zinc-700/50"
                      }
                    `}
                  >
                    {isLoading || isSubmitting ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      "Submit Result"
                    )}
                  </button>
                </div>

                {/* Warning */}
                <p className="text-xs text-gray-500 text-center mt-2">
                  ⚠️ Results are final and cannot be changed after submission
                </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </>
      )}
    </AnimatePresence>
  );
});

