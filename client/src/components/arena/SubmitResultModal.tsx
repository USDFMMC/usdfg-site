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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-amber-900/20 to-gray-900 border-2 border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
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

        {/* Question */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 rounded-xl p-4 mb-6">
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
          <div className="mb-6">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-amber-300">
                  📸 Upload Proof (Optional but Recommended)
                </p>
              </div>

              {!proofImage ? (
                <div className="space-y-2">
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
                  <div className="grid grid-cols-2 gap-2">
                    {/* Camera button (mobile) */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      <span className="text-sm font-medium">Take Photo</span>
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
                      className="flex items-center justify-center gap-2 p-3 bg-amber-700 hover:bg-amber-800 text-white rounded-lg transition-all"
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
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6">
          <p className="text-sm text-blue-300 text-center">
            ⏰ Your opponent has 2 hours to submit their result
          </p>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={selectedResult === null || isLoading || isSubmitting}
          className={`
            w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              selectedResult !== null
                ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg shadow-amber-500/20"
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

        {/* Warning */}
        <p className="text-xs text-gray-500 text-center mt-4">
          ⚠️ Results are final and cannot be changed after submission
        </p>
      </div>
    </div>
  );
};

