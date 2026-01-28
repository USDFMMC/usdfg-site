import React from "react";

type ActivityType = "create" | "complete" | "leaderboard" | "generic";

const activityItems: { text: string; type: ActivityType }[] = [
  { text: "New challenge created · Competitive lobby forming", type: "create" },
  { text: "Challenge completed · Winner: Johnny · 35 USDFG awarded", type: "complete" },
  { text: "Match result recorded · 1v1 resolved", type: "complete" },
  { text: "Player joined an open challenge", type: "generic" },
  { text: "Leaderboard updated", type: "leaderboard" },
  { text: "Arena activity ongoing", type: "generic" },
];

const typeColor: Record<ActivityType, string> = {
  create: "text-blue-400/80",
  complete: "text-yellow-400/90",
  leaderboard: "text-purple-400/80",
  generic: "text-white/80",
};

export default function LiveActivityTicker() {
  return (
    <div className="relative w-full overflow-hidden border-b border-white/10 bg-gradient-to-r from-black via-neutral-950 to-black">
      {/* Edge fades */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-black to-transparent z-10" />

      <div className="relative flex h-9 items-center">
        <div className="ticker-track flex whitespace-nowrap text-sm font-medium">
          {activityItems.concat(activityItems).map((item, index) => (
            <span key={index} className="mx-6 flex items-center gap-2">
              {/* Live dot */}
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>

              {/* Live label */}
              <span className="text-yellow-400 font-semibold tracking-wide">Live</span>

              {/* Message */}
              <span className={typeColor[item.type]}>· {item.text}</span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .ticker-track {
          animation: tickerScroll 35s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes tickerScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
