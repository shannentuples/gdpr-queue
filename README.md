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

**Sprint 1 (current): Setup & Infrastructure** — project scaffold, deploy
pipeline, placeholder page live.

## Setup

```bash
npm install
cp .env.example .env   # server/.env — fill in ANTHROPIC_API_KEY once AI features land
```

Run both apps in dev mode:

```bash
npm run dev
```

- Server: http://localhost:4000
- Client: http://localhost:5173 (proxies `/api` to the server)

## Deploy

The client deploys to Vercel as a static build (`vercel.json` at the repo
root points at `client/`).

**Scope note — backend hosting.** Vercel serverless functions have an
ephemeral filesystem, so a SQLite file written there won't persist between
requests. The Express + SQLite backend will need a host with a persistent
disk (Railway, Render, Fly) once the live app needs to actually store
requests — deferred until that becomes necessary.

## Scope & assumptions

Identity verification is out of scope for this demo. Under GDPR Article
12(6), controllers can require additional information to confirm a
requester's identity before acting on a request — this prevents fraudulent
access or deletion of another person's data. In production this would sit
between intake and search (e.g. an email verification token, or a second
identifier). For this project, requests are assumed pre-verified
(`verified: true` stub in the schema, added in Sprint 2) so the demo can
focus on classification, search, and drafting logic.
