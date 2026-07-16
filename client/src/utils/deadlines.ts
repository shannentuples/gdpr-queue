// Sprint 4 color coding: green (>14 days), yellow (3-14 days), red (<3 days,
// including overdue/negative). Boundaries are inclusive on the yellow side
// per the spec wording ("3–14 days").
export type DeadlineUrgency = "green" | "yellow" | "red";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysRemaining(deadlineAt: string, now: Date = new Date()): number {
  return Math.ceil((new Date(deadlineAt).getTime() - now.getTime()) / MS_PER_DAY);
}

export function getUrgency(days: number): DeadlineUrgency {
  if (days > 14) return "green";
  if (days >= 3) return "yellow";
  return "red";
}

export function formatCountdown(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}
