/**
 * GDPR Art. 12(3): controllers must respond within one calendar month of
 * receipt, extendable by a further two months for complex requests.
 */
const STATUTORY_MONTHS = 1;
const EXTENSION_MONTHS = 2;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function calculateDeadline(receivedAt: Date): Date {
  return addMonths(receivedAt, STATUTORY_MONTHS);
}

export function calculateExtendedDeadline(receivedAt: Date): Date {
  return addMonths(receivedAt, STATUTORY_MONTHS + EXTENSION_MONTHS);
}

// Deadline-urgency color banding (Sprint 4: green >14 days, yellow 3-14,
// red <3) lands with the dashboard, since it's dashboard presentation logic
// rather than something intake needs.
