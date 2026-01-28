import React from "react";

const activityItems = [
  "Live · New challenge created · Competitive lobby forming",
  "Live · Challenge completed · Winner: Johnny · 35 USDFG awarded",
  "Live · Match result recorded · 1v1 resolved",
  "Live · Player joined an open challenge",
  "Live · Leaderboard updated",
  "Live · Arena activity ongoing",
];

export default function LiveActivityTicker() {
  return (
    <div className="w-full overflow-hidden bg-black border-b border-white/10">
      <div className="relative flex h-9 items-center">
        <div className="ticker-track whitespace-nowrap text-sm font-medium text-white/80">
          {activityItems.concat(activityItems).map((item, index) => (
            <span key={index} className="mx-6">
              {item}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .ticker-track {
          display: inline-flex;
          animation: tickerScroll 30s linear infinite;
        }

        .ticker-track:hover {
          animation-play-state: paused;
        }

        @keyframes tickerScroll {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
