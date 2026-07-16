# GDPR DSAR Assistant

A tool for handling GDPR Data Subject Access Requests: intake → AI
classification → deadline-tracked dashboard → AI-driven search across mock
data sources via tool-calling → drafted response letter.

Built as a portfolio project following an explicit sprint plan (see
`docs/` or project board for the full backlog). This README grows with each
sprint.

## Stack

- **Client**: React + TypeScript, Vite
- **Server**: Node + Express + TypeScript
- **Storage**: SQLite (`better-sqlite3`)
- **AI**: Claude (`@anthropic-ai/sdk`)

## Project layout

```
client/   React app (Vite)
server/   Express API
```

## Status

- **Sprint 1: Setup & Infrastructure** — done. Project scaffold, deploy
  pipeline, placeholder page live at https://gdpr-dsar-assistant.vercel.app
- **Sprint 2: Data Model & Intake** — done. `requests`, `data_sources`,
  `found_records`, `response_letters` tables created; `data_sources` and
  `found_records` seeded with mock CRM/Support/Billing records; intake form
  submits and stores a request with a generated reference number.
- **Sprint 3: Classification** — done. Claude classifies each request into
  access/deletion/portability/correction with a confidence score and
  rationale (`server/src/services/classification.ts`). Confidence ≥ 0.6
  auto-sets the type and moves status to `classified`; below that, the type
  stays unset and status becomes `needs_review`. A reviewer-only detail page
  at `/requests/:id` shows the reasoning.
- **Sprint 4: Dashboard & SLA Tracking** — done. Reviewer queue at `/queue`
  lists requests sorted by deadline (soonest first, using the extended
  deadline when one's been applied), with a color-coded countdown badge
  (green >14 days, yellow 3–14, red <3 including overdue). Status filter
  defaults to "Open (not sent)" with an "All statuses" option and per-status
  options; type filter covers all four request types. Detail page links back
  to the queue. Still no auth (out of scope) — `/queue` and `/requests/:id`
  are reviewer-only by convention, not by access control.
- **Sprint 5: Data Source Search** — done. A `search_data_sources` tool
  (email/name/sources params) lets Claude decide which data sources to
  search; matching itself is deterministic, not left to the model (email
  exact-match, name fuzzy-match via Levenshtein similarity —
  `server/src/utils/fuzzyMatch.ts`). Each match carries its own confidence
  and reason. Matches ≥ 0.7 confidence auto-confirm; below that, they render
  visually distinct (orange) on the detail page and require an explicit
  "Confirm this is the right person" click before counting as found. Search
  results are stored as `found_records` rows scoped to the request
  (`request_id` set); the original seeded rows are never mutated, so
  re-running search is safe.
- **Sprint 6 (current): Drafting, Audit Log & Polish** — draft generation
  (`server/src/services/letterDraft.ts`) is handed only confirmed matches, so
  an unconfirmed fuzzy match can never leak into a letter. One
  `response_letters` row per request; the reviewer can edit the content and
  save, then "Mark as sent" locks it — the server rejects further edits
  (409) once `status = 'sent'`, not just the UI. Every classification,
  search, draft, edit, and send action writes an append-only `audit_log`
  row with a timestamp and human-readable detail, shown chronologically on
  the detail page.

**Match confidence threshold note.** Same situation as classification: the
spec says matches "below a threshold" need confirmation without giving a
number. Used 0.5 as the floor below which a name isn't even surfaced as a
candidate, and 0.7 as the auto-confirm line — both in
`server/src/utils/fuzzyMatch.ts`, both arbitrary starting points pending real
usage data.

**Confidence threshold note.** The sprint spec says "high/medium confidence
auto-sets the type; low confidence flags for review" without giving numeric
bands. Implemented as a single 0.6 cut line rather than three named tiers —
simplest thing that satisfies the AC. Revisit once there's real classifier
behavior to tune against.

**Deadline note.** Sprint 2's acceptance criteria describes "a deadline 30
days out." This implementation uses GDPR Art. 12(3)'s actual rule — one
calendar month from receipt — which is 28-31 days depending on the month,
not a flat 30. Chose legal accuracy over the literal AC wording; flagging
the deviation here rather than silently diverging from the written spec.

## Setup

```bash
npm install
cp .env.example server/.env   # fill in ANTHROPIC_API_KEY (required for classification)
```

Run both apps in dev mode:

```bash
npm run dev
```

- Server: http://localhost:4000
- Client: http://localhost:5173 (proxies `/api` to the server)

## Deploy

- **Client**: Vercel, static build (`vercel.json` points at `client/`).
  Push to `main` auto-deploys. Public URL:
  https://gdpr-dsar-assistant.vercel.app
- **Server**: Railway, persistent volume mounted at `/data` for the SQLite
  file (`DATABASE_PATH=/data/dsar.sqlite`). Deployed via `railway up` from
  `server/` — not git-connected (see note below), so deploys are manual for
  now: `railway up server --path-as-root --service server --detach`.
  Public URL: https://server-production-a299.up.railway.app

The client's `VITE_API_BASE_URL` (a Vercel production env var) points at
the Railway URL; the server's `CLIENT_ORIGIN` env var is set to the Vercel
URL for CORS. Both are plain HTTPS URLs, not secrets.

**Note on the build fix this required.** `tsc` compiles `.ts` files but
doesn't copy non-TS assets — `dist/db/schema.sql` didn't exist after a
production build, so the deployed server crashed on boot reading it
(`ENOENT`). Fixed by copying it as a build step:
`"build": "tsc -p tsconfig.json && cp src/db/schema.sql dist/db/schema.sql"`.
This wasn't Railway-specific — `npm run build && npm start` was broken
locally too; local dev just never exercised it because `npm run dev` runs
`tsx` directly against `src/`, skipping the compiled build entirely.

**Note on git-based deploys.** Vercel's GitHub App is connected to this
repo, so client pushes auto-deploy. Railway's isn't (would need the same
GitHub App authorization flow as Vercel required) — deferred since manual
`railway up` works fine for a portfolio project's cadence; revisit if this
becomes a real CI/CD requirement.

## Scope & assumptions

Identity verification is out of scope for this demo. Under GDPR Article
12(6), controllers can require additional information to confirm a
requester's identity before acting on a request — this prevents fraudulent
access or deletion of another person's data. In production this would sit
between intake and search (e.g. an email verification token, or a second
identifier). For this project, requests are assumed pre-verified
(`verified: true` stub in the schema, added in Sprint 2) so the demo can
focus on classification, search, and drafting logic.

