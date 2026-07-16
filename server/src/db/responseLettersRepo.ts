import { randomUUID } from "node:crypto";
import { db } from "./index.js";
import type { ResponseLetter } from "../types/dsar.js";

interface ResponseLetterRow {
  id: string;
  request_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function rowToLetter(row: ResponseLetterRow): ResponseLetter {
  return {
    id: row.id,
    requestId: row.request_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// One row per request. Generating a fresh draft overwrites any existing
// content (and any unsaved reviewer edits) — see README for why this
// doesn't version drafts.
export function saveDraft(requestId: string, content: string): ResponseLetter {
  const now = new Date().toISOString();
  const existing = getDraft(requestId);
  if (existing) {
    db.prepare("UPDATE response_letters SET content = ?, updated_at = ? WHERE request_id = ?").run(
      content,
      now,
      requestId
    );
  } else {
    db.prepare(
      "INSERT INTO response_letters (id, request_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(randomUUID(), requestId, content, now, now);
  }
  return getDraft(requestId)!;
}

export function updateDraftContent(requestId: string, content: string): ResponseLetter | undefined {
  db.prepare("UPDATE response_letters SET content = ?, updated_at = ? WHERE request_id = ?").run(
    content,
    new Date().toISOString(),
    requestId
  );
  return getDraft(requestId);
}

export function getDraft(requestId: string): ResponseLetter | undefined {
  const row = db.prepare("SELECT * FROM response_letters WHERE request_id = ?").get(requestId) as
    | ResponseLetterRow
    | undefined;
  return row ? rowToLetter(row) : undefined;
}
