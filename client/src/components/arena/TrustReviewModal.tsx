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
      <label className="text-gray-300 mb-2 block">{label}</label>
      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`transition-all ${
              star <= value
                ? 'text-amber-400 scale-110'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            <StarIcon className={`w-5 h-5 ${star <= value ? 'fill-current' : ''}`} />
          </button>
        ))}
        <span className="ml-2 text-amber-300 font-semibold">{value}/10</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-xl border border-amber-400/30 bg-[#07080C]/95 p-4 shadow-[0_0_40px_rgba(255,215,130,0.06)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white">Review Your Opponent</h3>
            <p className="text-sm text-gray-400 mt-1">{opponentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Rating Fields */}
          <div className="space-y-4">
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
            <label className="text-gray-300 mb-3 block">Tags (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {reviewTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-amber-500 text-white border border-amber-400'
                      : 'bg-zinc-800 text-gray-300 border border-zinc-700 hover:border-amber-500/50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-gray-300 mb-2 block">Additional Comments (Optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-amber-400/30 rounded-lg text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none"
              rows={3}
              placeholder="Share your experience with this player..."
            />
          </div>

          {/* Overall Trust Score Display */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-medium">Overall Trust Score:</span>
              <span className="text-2xl font-bold text-amber-400">
                {Math.round((honesty + fairness + sportsmanship) / 3 * 10) / 10}/10
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors font-semibold"
            >
              Skip Review
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:brightness-110 transition-all"
            >
              Submit Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



