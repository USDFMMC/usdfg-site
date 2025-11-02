import React, { useState } from "react";
import { X, Star as StarIcon } from "lucide-react";

interface TrustReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponentName: string;
  completionRate: number;
  onSubmit: (payload: {
    honesty: number;
    fairness: number;
    sportsmanship: number;
    tags: string[];
    trustScore10: number;
    comment?: string;
  }) => void;
}

const reviewTags = [
  'Good Sport',
  'Respectful',
  'Fair Play',
  'Quick Response',
  'Helpful',
  'Skilled Player',
  'Poor Connection',
  'Slow Response',
  'Unsportsmanlike',
  'Disconnected Early'
];

export default function TrustReviewModal({
  isOpen,
  onClose,
  opponentName,
  completionRate,
  onSubmit
}: TrustReviewModalProps) {
  const [honesty, setHonesty] = useState(5);
  const [fairness, setFairness] = useState(5);
  const [sportsmanship, setSportsmanship] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    // Calculate overall trust score (average of the three ratings)
    const trustScore10 = Math.round((honesty + fairness + sportsmanship) / 3 * 10) / 10;
    
    onSubmit({
      honesty,
      fairness,
      sportsmanship,
      tags: selectedTags,
      trustScore10,
      comment: comment.trim() || undefined
    });
    
    // Reset form
    setHonesty(5);
    setFairness(5);
    setSportsmanship(5);
    setSelectedTags([]);
    setComment("");
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div>
      <label className="text-gray-300 mb-1.5 block text-sm">{label}</label>
      <div className="flex items-center gap-1 mb-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`transition-all ${
              star <= value
                ? 'text-amber-400 scale-105'
                : 'text-gray-600/60 hover:text-gray-400/80'
            }`}
          >
            <StarIcon className={`w-3.5 h-3.5 ${star <= value ? 'fill-current' : ''}`} />
          </button>
        ))}
        <span className="ml-2 text-amber-300 font-semibold text-sm">{value}/10</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-xl border border-amber-400/20 bg-[#07080C]/98 p-3 shadow-[0_0_40px_rgba(255,215,130,0.06)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-white">Review Your Opponent</h3>
            <p className="text-xs text-gray-400 mt-0.5">{opponentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Rating Fields */}
          <div className="space-y-2.5">
            <StarRating 
              value={honesty} 
              onChange={setHonesty} 
              label="Honesty"
            />
            <StarRating 
              value={fairness} 
              onChange={setFairness} 
              label="Fairness"
            />
            <StarRating 
              value={sportsmanship} 
              onChange={setSportsmanship} 
              label="Sportsmanship"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-gray-300 mb-1.5 block text-sm">Tags (Optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {reviewTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-2 py-1 rounded-md text-xs transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-amber-500/90 text-white border border-amber-400/50'
                      : 'bg-zinc-800/60 text-gray-300 border border-zinc-700/50 hover:border-amber-500/30'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-gray-300 mb-1.5 block text-sm">Additional Comments (Optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/60 border border-amber-400/20 rounded-lg text-sm text-white placeholder-gray-500 focus:border-amber-400/50 focus:outline-none resize-none"
              rows={2}
              placeholder="Share your experience with this player..."
            />
          </div>

          {/* Overall Trust Score Display */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-medium text-sm">Overall Trust Score:</span>
              <span className="text-xl font-bold text-amber-400">
                {Math.round((honesty + fairness + sportsmanship) / 3 * 10) / 10}/10
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 bg-zinc-800/60 text-white rounded-lg hover:bg-zinc-700/60 transition-colors text-sm font-semibold border border-zinc-700/50"
            >
              Skip Review
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white rounded-lg font-semibold hover:brightness-110 transition-all text-sm border border-amber-400/30"
            >
              Submit Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



