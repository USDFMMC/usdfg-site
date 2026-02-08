import React, { useEffect, useState } from "react";
import { listenToRecentChallenges } from "@/lib/firebase/firestore";
import type { ChallengeData } from "@/lib/firebase/firestore";

type ActivityType = "create" | "complete" | "leaderboard" | "generic" | "funded" | "active";

interface ActivityItem {
  text: string;
  type: ActivityType;
}

function shortWallet(wallet: string): string {
  if (!wallet || wallet.length < 12) return wallet;
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

function challengeToActivityItems(c: ChallengeData & { id?: string }): ActivityItem[] {
  const game = (c.game || c.category || "Challenge").replace(/\s*\|\s*.*$/, "").trim() || "Arena";
  const prize = c.prizePool != null ? Math.round(c.prizePool) : (c.entryFee != null ? Math.round((c.entryFee || 0) * 1.95) : 0);
  const prizeStr = prize > 0 ? ` ${prize} USDFG` : "";

  const status = c.status;
  if (status === "completed") {
    const winner = c.winner ? shortWallet(c.winner) : "Winner";
    return [{ text: `Challenge completed · ${winner} ·${prizeStr} awarded`, type: "complete" }];
  }
  if (status === "active") {
    return [{ text: `Match in progress · ${game} ·${prizeStr}`, type: "active" }];
  }
  if (status === "creator_funded") {
    return [{ text: `Challenge funded · ${game} · Waiting for opponent`, type: "funded" }];
  }
  if (status === "creator_confirmation_required") {
    return [{ text: `Player joined · ${game} · Awaiting creator`, type: "generic" }];
  }
  if (status === "pending_waiting_for_opponent") {
    return [{ text: `New challenge · ${game} ·${prizeStr}`, type: "create" }];
  }
  return [];
}

const FALLBACK_ITEMS: ActivityItem[] = [
  { text: "Arena activity ongoing", type: "generic" },
  { text: "Leaderboard updated", type: "leaderboard" },
];

const typeColor: Record<ActivityType, string> = {
  create: "text-blue-400/80",
  complete: "text-yellow-400/90",
  leaderboard: "text-purple-400/80",
  generic: "text-white/80",
  funded: "text-emerald-400/80",
  active: "text-amber-400/80",
};

const TICKER_LIMIT = 20;

export default function LiveActivityTicker() {
  const [activityItems, setActivityItems] = useState<ActivityItem[]>(FALLBACK_ITEMS);

  useEffect(() => {
    const unsubscribe = listenToRecentChallenges(TICKER_LIMIT, (challenges) => {
      const items: ActivityItem[] = [];
      for (const c of challenges) {
        items.push(...challengeToActivityItems(c as ChallengeData & { id?: string }));
      }
      setActivityItems(items.length > 0 ? items : FALLBACK_ITEMS);
    });
    return () => unsubscribe();
  }, []);

  const displayItems = activityItems.concat(activityItems);

  return (
    <div className="relative w-full overflow-hidden border-b border-purple-500/20 bg-gradient-to-r from-black via-black/95 to-black shadow-[0_2px_15px_rgba(147,51,234,0.1)]">
      <div className="pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-black to-transparent z-10" />

      <div className="relative flex h-9 items-center">
        <div className="ticker-track flex whitespace-nowrap text-sm font-medium">
          {displayItems.map((item, index) => (
            <span key={index} className="mx-6 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" style={{ boxShadow: "0 0 8px rgba(74, 222, 128, 0.5)" }} />
              </span>
              <span 
                className="font-semibold tracking-wide"
                style={{
                  background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.4))",
                }}
              >
                Live
              </span>
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
