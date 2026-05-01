import React from "react";

export function getTrustLabel(score: number) {
  if (score >= 8) return "Elite";
  if (score >= 6) return "Trusted";
  if (score >= 4) return "Neutral";
  return "Risky";
}

const TRUST_BADGE_TOOLTIP =
  "Trust combines gameplay behavior and peer reviews. Low trust may indicate forfeits or disputes.";

export function TrustBadge({
  score,
  className = "",
  compact,
}: {
  score: number;
  className?: string;
  compact?: boolean;
}) {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 5;
  const label = getTrustLabel(safeScore);
  const labelKey = label.toLowerCase().replace(/\s+/g, "-");
  if (compact) {
    return <span className={`trust-${labelKey} ${className}`.trim()}>{label}</span>;
  }
  return (
    <span
      className={`trust-badge trust-${labelKey} ${className}`.trim()}
      title={TRUST_BADGE_TOOLTIP}
    >
      {label} ({safeScore.toFixed(1)})
    </span>
  );
}
