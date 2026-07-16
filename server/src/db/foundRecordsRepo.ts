import { randomUUID } from "node:crypto";
import { db } from "./index.js";
import type { FoundRecord } from "../types/dsar.js";

interface FoundRecordRow {
  id: string;
  data_source_id: string;
  source_name: string;
  subject_name: string;
  subject_email: string;
  record_type: string;
  payload: string;
  request_id: string | null;
  match_confidence: number | null;
  match_reason: string | null;
  confirmed: number;
  created_at: string;
}

function rowToFoundRecord(row: FoundRecordRow): FoundRecord {
  return {
    id: row.id,
    dataSourceId: row.data_source_id,
    sourceName: row.source_name,
    subjectName: row.subject_name,
    subjectEmail: row.subject_email,
    recordType: row.record_type,
    payload: JSON.parse(row.payload),
    requestId: row.request_id,
    matchConfidence: row.match_confidence,
    matchReason: row.match_reason,
    confirmed: row.confirmed === 1,
    createdAt: row.created_at,
  };
}

export function listDataSourceNames(): string[] {
  const rows = db.prepare("SELECT name FROM data_sources ORDER BY name").all() as { name: string }[];
  return rows.map((r) => r.name);
}

// Catalog rows only (request_id IS NULL) — the "world" the search tool queries.
export function getCatalogRecordsBySourceNames(sourceNames: string[]): FoundRecordRow[] {
  if (sourceNames.length === 0) return [];
  const placeholders = sourceNames.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT fr.*, ds.name as source_name
       FROM found_records fr
       JOIN data_sources ds ON ds.id = fr.data_source_id
       WHERE fr.request_id IS NULL AND ds.name IN (${placeholders})`
    )
    .all(...sourceNames) as FoundRecordRow[];
}

export function clearRequestMatches(requestId: string): void {
  db.prepare("DELETE FROM found_records WHERE request_id = ?").run(requestId);
}

export function insertMatch(input: {
  requestId: string;
  dataSourceId: string;
  subjectName: string;
  subjectEmail: string;
  recordType: string;
  payload: unknown;
  matchConfidence: number;
  matchReason: string;
  confirmed: boolean;
}): void {
  db.prepare(
    `INSERT INTO found_records
       (id, data_source_id, subject_name, subject_email, record_type, payload, request_id, match_confidence, match_reason, confirmed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    input.dataSourceId,
    input.subjectName,
    input.subjectEmail,
    input.recordType,
    JSON.stringify(input.payload),
    input.requestId,
    input.matchConfidence,
    input.matchReason,
    input.confirmed ? 1 : 0,
    new Date().toISOString()
  );
}

export function listRequestMatches(requestId: string): FoundRecord[] {
  const rows = db
    .prepare(
      `SELECT fr.*, ds.name as source_name
       FROM found_records fr
       JOIN data_sources ds ON ds.id = fr.data_source_id
       WHERE fr.request_id = ?
       ORDER BY fr.match_confidence DESC`
    )
    .all(requestId) as FoundRecordRow[];
  return rows.map(rowToFoundRecord);
}

export function confirmMatch(requestId: string, recordId: string): boolean {
  const result = db
    .prepare("UPDATE found_records SET confirmed = 1 WHERE id = ? AND request_id = ?")
    .run(recordId, requestId);
  return result.changes > 0;
}
