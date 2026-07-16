import { randomUUID } from "node:crypto";
import { db } from "./index.js";
import type { AuditEvent, AuditEventType } from "../types/dsar.js";

interface AuditLogRow {
  id: string;
  request_id: string;
  event_type: AuditEventType;
  detail: string;
  created_at: string;
}

function rowToEvent(row: AuditLogRow): AuditEvent {
  return {
    id: row.id,
    requestId: row.request_id,
    eventType: row.event_type,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

export function logEvent(requestId: string, eventType: AuditEventType, detail: string): void {
  db.prepare(
    "INSERT INTO audit_log (id, request_id, event_type, detail, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(randomUUID(), requestId, eventType, detail, new Date().toISOString());
}

export function listEvents(requestId: string): AuditEvent[] {
  const rows = db
    .prepare("SELECT * FROM audit_log WHERE request_id = ? ORDER BY created_at ASC")
    .all(requestId) as AuditLogRow[];
  return rows.map(rowToEvent);
}
