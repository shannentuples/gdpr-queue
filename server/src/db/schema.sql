-- seq is an internal auto-increment used only to generate human-readable
-- reference numbers (e.g. DSAR-2026-00001); id is the public/opaque identifier
-- used in URLs and API responses.
CREATE TABLE IF NOT EXISTS requests (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT UNIQUE NOT NULL,
  reference_number TEXT UNIQUE NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  description TEXT NOT NULL,
  -- Identity verification is out of scope for this demo (see README Scope &
  -- Assumptions) — requests are assumed pre-verified. Stubbed here so the
  -- design decision is visible and the real check has a place to plug in.
  verified INTEGER NOT NULL DEFAULT 1,
  request_type TEXT,
  classification_confidence REAL,
  classification_rationale TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  received_at TEXT NOT NULL,
  deadline_at TEXT NOT NULL,
  extended_deadline_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Two kinds of rows share this table: catalog rows (request_id IS NULL,
-- seeded once — "what personal data exists in these systems") and match
-- rows (request_id set — a per-request search result copied from a catalog
-- row, carrying that request's match_confidence/match_reason/confirmed).
-- Search never mutates catalog rows; it deletes and re-inserts a request's
-- match rows each run, so re-searching is idempotent.
CREATE TABLE IF NOT EXISTS found_records (
  id TEXT PRIMARY KEY,
  data_source_id TEXT NOT NULL REFERENCES data_sources(id),
  subject_name TEXT NOT NULL,
  subject_email TEXT NOT NULL,
  record_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
  match_confidence REAL,
  match_reason TEXT,
  confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS response_letters (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_found_records_data_source_id ON found_records(data_source_id);
CREATE INDEX IF NOT EXISTS idx_found_records_request_id ON found_records(request_id);
CREATE INDEX IF NOT EXISTS idx_response_letters_request_id ON response_letters(request_id);
