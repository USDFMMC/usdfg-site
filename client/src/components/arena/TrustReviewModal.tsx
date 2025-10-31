import React, { useState } from "react";

interface TrustReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponentName: string;
  completionRate: number;
  onSubmit: (opponentName: string, rating: number, comment: string) => void;
}

export default function TrustReviewModal({
  isOpen,
  onClose,
  opponentName,
  completionRate,
  onSubmit
}: TrustReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(opponentName, rating, comment);
    setRating(5);
    setComment("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-amber-400/30 bg-[#07080C]/95 p-6 shadow-[0_0_60px_rgba(255,215,130,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Review {opponentName}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-gray-300 mb-2 block">Rating (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-zinc-800 border border-amber-400/30 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="text-gray-300 mb-2 block">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-amber-400/30 rounded-lg text-white"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-lg font-semibold hover:brightness-110 transition-all"
            >
              Submit Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



