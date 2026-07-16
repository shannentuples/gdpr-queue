// Below this, two names are dissimilar enough that we don't even surface the
// record as a candidate — it'd just be noise for the reviewer.
const NAME_SIMILARITY_FLOOR = 0.5;

// Below this, a match is shown but requires manual confirmation before it
// counts as "found" for this request (Sprint 5 AC). At/above, it's
// auto-confirmed. No numeric threshold was given in the spec, same
// situation as Sprint 3's classification threshold — documented in README.
export const MATCH_CONFIRM_THRESHOLD = 0.7;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }
  return dist[rows - 1][cols - 1];
}

// 1.0 = identical (after normalizing case/whitespace), 0.0 = completely different.
export function nameSimilarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  if (normA === normB) return 1;
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(normA, normB) / maxLen;
}

export function emailsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export interface MatchScore {
  confidence: number;
  reason: string;
}

// Email is the authoritative identifier — an exact match is always
// high-confidence regardless of name spelling (nicknames, typos, maiden
// names). Without an email match, we fall back to name similarity alone,
// which is inherently less certain — hence the lower ceiling. Returns null
// when neither signal clears the floor, meaning "not a candidate at all."
export function scoreMatch(
  record: { subjectName: string; subjectEmail: string },
  query: { name: string; email: string }
): MatchScore | null {
  if (emailsMatch(record.subjectEmail, query.email)) {
    return { confidence: 1, reason: `Exact email match (${record.subjectEmail})` };
  }
  const similarity = nameSimilarity(record.subjectName, query.name);
  if (similarity >= NAME_SIMILARITY_FLOOR) {
    return {
      confidence: Math.round(similarity * 100) / 100,
      reason: `Name similarity ${Math.round(similarity * 100)}% ("${record.subjectName}" vs "${query.name}"), email did not match`,
    };
  }
  return null;
}
