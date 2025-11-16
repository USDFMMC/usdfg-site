import React from "react";
import type { TournamentState } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";
import { VoiceChat } from "./VoiceChat";
import { ChatBox } from "./ChatBox";

interface TournamentBracketViewProps {
  tournament?: TournamentState;
  players?: string[];
  currentWallet?: string | null;
  challengeId: string;
  onOpenSubmitResult?: (matchId: string, opponentWallet: string) => void;
}

const TournamentBracketView: React.FC<TournamentBracketViewProps> = ({
  tournament,
  players = [],
  currentWallet,
  challengeId,
  onOpenSubmitResult,
}) => {
  if (!tournament || !tournament.bracket?.length) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
        Bracket will populate once players join.
      </div>
    );
  }

  const { bracket, currentRound, stage } = tournament;

  const findMatchForPlayer = (wallet?: string | null) => {
    if (!wallet) return null;
    const lower = wallet.toLowerCase();
    for (const round of bracket) {
      for (const match of round.matches) {
        if (
          match.player1?.toLowerCase() === lower ||
          match.player2?.toLowerCase() === lower
        ) {
          return { round, match };
        }
      }
    }
    return null;
  };

  const playerMatch = findMatchForPlayer(currentWallet);
  const opponentWallet =
    playerMatch &&
    (playerMatch.match.player1?.toLowerCase() ===
    currentWallet?.toLowerCase()
      ? playerMatch.match.player2
      : playerMatch.match.player1);

  const maxPlayers = tournament.maxPlayers || players.length;
  const currentPlayers = players.length;
  const isWaitingForPlayers = stage === 'waiting_for_players';

  return (
    <div className="space-y-4">
      {isWaitingForPlayers && (
        <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-100">
          <div className="text-xs uppercase tracking-widest text-blue-300">
            Waiting for players
          </div>
          <div className="mt-2 text-base font-semibold text-white">
            {currentPlayers} / {maxPlayers} players joined
          </div>
          <p className="mt-1 text-xs text-blue-100/80">
            The tournament will start automatically when all {maxPlayers} players join. Share the challenge link to invite others!
          </p>
        </div>
      )}

      {playerMatch && stage === 'round_in_progress' && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="text-xs uppercase tracking-widest text-amber-300">
            You're locked in
          </div>
          <div className="mt-2 text-base font-semibold text-white">
            Round {playerMatch.round.roundNumber}:{" "}
            {opponentWallet
              ? `${opponentWallet.slice(0, 4)}...${opponentWallet.slice(-4)}`
              : "Waiting for opponent"}
          </div>
          <p className="mt-1 text-xs text-amber-100/80">
            Chat with your opponent and start the match. Submit results once
            you finish—winner advances automatically.
          </p>
          {opponentWallet && onOpenSubmitResult && playerMatch.match.status !== 'completed' && (
            <button
              onClick={() => onOpenSubmitResult(playerMatch.match.id, opponentWallet)}
              className="mt-3 w-full rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-200 transition-all hover:bg-amber-400/30 hover:shadow-[0_0_12px_rgba(255,215,130,0.3)] border border-amber-400/40"
            >
              Submit Result
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 overflow-x-auto">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${bracket.length}, minmax(200px, 1fr))`,
            }}
          >
        {bracket.map((round) => (
          <div key={round.roundNumber} className="space-y-4">
            <div
              className={cn(
                "text-center text-xs font-semibold uppercase tracking-widest",
                round.roundNumber === currentRound
                  ? "text-amber-300"
                  : "text-gray-400"
              )}
            >
              {round.roundNumber === bracket.length
                ? "Final"
                : `Round ${round.roundNumber}`}
            </div>

            <div className="space-y-3">
              {round.matches.map((match) => {
                const youAreInMatch =
                  (currentWallet &&
                    (match.player1?.toLowerCase() ===
                      currentWallet.toLowerCase() ||
                      match.player2?.toLowerCase() ===
                        currentWallet.toLowerCase())) ||
                  false;

                const matchStatus =
                  match.status === "completed"
                    ? "Completed"
                    : match.status === "in-progress"
                    ? "In progress"
                    : match.status === "ready"
                    ? "Ready"
                    : "Waiting";

                const renderSlot = (slot?: string) => {
                  if (!slot) {
                    return (
                      <div className="flex h-8 items-center justify-between rounded-lg border border-dashed border-white/10 px-3 text-xs text-gray-400">
                        <span>Waiting...</span>
                      </div>
                    );
                  }

                  const isCurrent = currentWallet
                    ? slot.toLowerCase() === currentWallet.toLowerCase()
                    : false;
                  return (
                    <div
                      className={cn(
                        "flex h-8 items-center justify-between rounded-lg border px-3 text-xs font-semibold",
                        isCurrent
                          ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                          : "border-white/10 bg-white/5 text-white"
                      )}
                    >
                      <span className="truncate">{`${slot.slice(
                        0,
                        4
                      )}...${slot.slice(-4)}`}</span>
                    </div>
                  );
                };

                const isChampionMatch =
                  round.roundNumber === bracket.length &&
                  match.status === "completed" &&
                  match.winner;

                return (
                  <div
                    key={match.id}
                    className={cn(
                      "rounded-xl border bg-black/40 p-3 backdrop-blur-sm",
                      youAreInMatch ? "border-amber-400/40" : "border-white/5"
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-400">
                      <span>
                        Match {match.id.replace("r", "").replace("-", "")}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          match.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                            : match.status === "in-progress"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-400/30"
                            : "bg-white/5 text-gray-300 border border-white/10"
                        )}
                      >
                        {matchStatus}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {renderSlot(match.player1)}
                      {renderSlot(match.player2)}
                    </div>

                    {match.winner && (
                      <div className="mt-3 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">
                        Winner:{" "}
                        <span className="font-semibold">
                          {`${match.winner.slice(0, 4)}...${match.winner.slice(
                            -4
                          )}`}
                        </span>
                      </div>
                    )}

                    {isChampionMatch && (
                      <div className="mt-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-center text-[11px] font-semibold text-amber-200">
                        🏆 Champion
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
        </div>

        <div className="w-full lg:max-w-xs space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
              Voice Room
            </div>
            <VoiceChat challengeId={challengeId} currentWallet={currentWallet || ""} />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
              Match Chat
            </div>
            <ChatBox challengeId={challengeId} currentWallet={currentWallet || ""} />
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Stage:{" "}
        <span className="font-semibold text-white">
          {stage === "round_in_progress"
            ? `Round ${currentRound} running`
            : stage.replace(/_/g, " ")}
        </span>
      </div>
    </div>
  );
};

export default TournamentBracketView;

