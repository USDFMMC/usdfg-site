import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Loader2, Camera, Upload, Image as ImageIcon } from "lucide-react";
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

export const SubmitResultRoom: React.FC<SubmitResultRoomProps> = ({
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProofImage(null);
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (selectedResult === null) return;
    
    setIsLoading(true);
    try {
      await onSubmit(selectedResult, proofFile);
      onClose();
    } catch (error) {
      console.error("❌ Error submitting result:", error);
      alert("Failed to submit result. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Main Panel - Slides up from bottom */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-2xl bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-t-2 border-x-2 border-purple-500/30 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start sticky top-0 bg-gray-900/95 backdrop-blur-sm -mx-6 px-6 py-4 border-b border-gray-800 z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Submit Result</h2>
                      <p className="text-sm text-gray-400 mt-0.5">{challengeTitle}</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    disabled={isLoading || isSubmitting}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Result Selection */}
                <div>
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
                    <p className="text-xl font-semibold text-white text-center">
                      Did you win this match?
                    </p>
                  </div>

                  {/* YES/NO Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* YES Button */}
                    <button
                      onClick={() => setSelectedResult(true)}
                      disabled={isLoading || isSubmitting}
                      className={`
                        relative overflow-hidden p-6 rounded-xl border-2 transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${
                          selectedResult === true
                            ? "border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-500/20 shadow-lg shadow-green-500/20"
                            : "border-gray-600 bg-gray-800/50 hover:border-green-500/50 hover:bg-green-500/10"
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2">🏆</div>
                        <p className="text-xl font-bold text-white">YES</p>
                        <p className="text-xs text-gray-400 mt-1">I won</p>
                      </div>
                      {selectedResult === true && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        relative overflow-hidden p-6 rounded-xl border-2 transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${
                          selectedResult === false
                            ? "border-red-500 bg-gradient-to-br from-red-500/20 to-rose-500/20 shadow-lg shadow-red-500/20"
                            : "border-gray-600 bg-gray-800/50 hover:border-red-500/50 hover:bg-red-500/10"
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2">😔</div>
                        <p className="text-xl font-bold text-white">NO</p>
                        <p className="text-xs text-gray-400 mt-1">I lost</p>
                      </div>
                      {selectedResult === false && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-purple-300">
                          📸 Upload Proof (Optional but Recommended)
                        </p>
                      </div>

                      {!proofImage ? (
                        <div className="space-y-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageCapture}
                            className="hidden"
                          />
                          
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all"
                            >
                              <Camera className="w-5 h-5" />
                              <span className="text-sm font-medium">Take Photo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (fileInputRef.current) {
                                  fileInputRef.current.removeAttribute('capture');
                                  fileInputRef.current.click();
                                }
                              }}
                              className="flex items-center justify-center gap-2 p-3 bg-purple-700 hover:bg-purple-800 text-white rounded-lg transition-all"
                            >
                              <Upload className="w-5 h-5" />
                              <span className="text-sm font-medium">Upload</span>
                            </button>
                          </div>

                          <p className="text-xs text-gray-400 text-center mt-2">
                            Screenshot of victory screen, final score, or match result
                          </p>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={proofImage}
                            alt="Proof"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-full text-white transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-600 rounded text-xs text-white flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Proof uploaded
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Voice Chat */}
                <VoiceChat challengeId={challengeId} currentWallet={currentWallet} />

                {/* Text Chat */}
                <ChatBox challengeId={challengeId} currentWallet={currentWallet} />

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-300 text-center">
                    ⏰ Your opponent has 2 hours to submit their result
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={selectedResult === null || isLoading || isSubmitting}
                    className={`
                      w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${
                        selectedResult !== null
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/20"
                          : "bg-gray-700 text-gray-400 cursor-not-allowed"
                      }
                    `}
                  >
                    {isLoading || isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      "Submit Result"
                    )}
                  </button>
                </div>

                {/* Warning */}
                <p className="text-xs text-gray-500 text-center">
                  ⚠️ Results are final and cannot be changed after submission
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

