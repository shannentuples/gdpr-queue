import { daysRemaining, formatCountdown, getUrgency, type DeadlineUrgency } from "../utils/deadlines";

const COLORS: Record<DeadlineUrgency, { bg: string; fg: string }> = {
  green: { bg: "#dcfce7", fg: "#15803d" },
  yellow: { bg: "#fef9c3", fg: "#a16207" },
  red: { bg: "#fee2e2", fg: "#b91c1c" },
};

export function DeadlineBadge({ deadlineAt }: { deadlineAt: string }) {
  const days = daysRemaining(deadlineAt);
  const urgency = getUrgency(days);
  const { bg, fg } = COLORS[urgency];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: fg,
        backgroundColor: bg,
        whiteSpace: "nowrap",
      }}
    >
      {formatCountdown(days)}
    </span>
  );
}
