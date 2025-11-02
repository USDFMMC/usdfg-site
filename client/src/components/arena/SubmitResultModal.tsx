import React, { useState, useRef } from "react";
import { X, Trophy, Loader2, Camera, Upload, Image as ImageIcon } from "lucide-react";

interface SubmitResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId: string;
  challengeTitle: string;
  onSubmit: (didWin: boolean) => Promise<void>;
  isSubmitting?: boolean;
}

export const SubmitResultModal: React.FC<SubmitResultModalProps> = ({
  isOpen,
  onClose,
  challengeId,
  challengeTitle,
  onSubmit,
  isSubmitting = false,
}) => {
  const [selectedResult, setSelectedResult] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
      await onSubmit(selectedResult);
      onClose();
    } catch (error) {
      console.error("❌ Error submitting result:", error);
      alert("Failed to submit result. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-xl border border-amber-400/20 rounded-xl bg-[#07080C]/98 p-3 shadow-[0_0_40px_rgba(255,215,130,0.06)]">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-yellow-400/90 to-orange-500/90 rounded-lg">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Submit Result</h2>
              <p className="text-xs text-gray-400 mt-0.5">{challengeTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading || isSubmitting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 p-1.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question */}
        <div className="mb-3">
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
          <div className="mb-3">
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-amber-300">
                  📸 Upload Proof (Optional)
                </p>
              </div>

              {!proofImage ? (
                <div className="space-y-1.5">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageCapture}
                    className="hidden"
                  />
                  
                  {/* Upload buttons */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Camera button (mobile) */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg transition-all text-xs font-medium"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo</span>
                    </button>

                    {/* Upload button (desktop) */}
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
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 mb-3">
          <p className="text-xs text-blue-300 text-center">
            ⏰ Your opponent has 2 hours to submit their result
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={selectedResult === null || isLoading || isSubmitting}
          className={`
            w-full py-2 rounded-lg font-semibold text-sm transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed border
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

        {/* Warning */}
        <p className="text-xs text-gray-500 text-center mt-2">
          ⚠️ Results are final and cannot be changed after submission
        </p>
      </div>
    </div>
  );
};

