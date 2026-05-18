import React from "react";
import { isWarmupEnabled } from "@/lib/utils/warmup-phase";

interface WarmUpBadgeProps {
  challenge: Record<string, unknown> | null | undefined;
  className?: string;
}

const WarmUpBadge: React.FC<WarmUpBadgeProps> = ({ challenge, className = "" }) => {
  if (!challenge || !isWarmupEnabled(challenge)) {
    return null;
  }

  return (
    <span
      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border bg-blue-500/15 text-blue-200 border-blue-400/30 font-semibold uppercase tracking-wide ${className}`}
    >
      Warm-Up
    </span>
  );
};

export default WarmUpBadge;
