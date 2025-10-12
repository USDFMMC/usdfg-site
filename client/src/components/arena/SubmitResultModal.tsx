import React, { useState } from "react";
import { X, Trophy, Loader2 } from "lucide-react";

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

  if (!isOpen) return null;

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
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-2 border-purple-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl">
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
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
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

        {/* Warning */}
        <p className="text-xs text-gray-500 text-center mt-4">
          ⚠️ Results are final and cannot be changed after submission
        </p>
      </div>
    </div>
  );
};

