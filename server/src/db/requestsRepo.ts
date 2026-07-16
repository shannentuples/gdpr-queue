import { randomUUID } from "node:crypto";
import { db } from "./index.js";
import type { DsarRequest, RequestStatus, RequestType } from "../types/dsar.js";

interface RequestRow {
  id: string;
  reference_number: string;
  requester_name: string;
  requester_email: string;
  description: string;
  verified: number;
  request_type: RequestType | null;
  classification_confidence: number | null;
  classification_rationale: string | null;
  status: RequestStatus;
  received_at: string;
  deadline_at: string;
  extended_deadline_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRequest(row: RequestRow): DsarRequest {
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    description: row.description,
    verified: row.verified === 1,
    requestType: row.request_type,
    classificationConfidence: row.classification_confidence,
    classificationRationale: row.classification_rationale,
    status: row.status,
    receivedAt: row.received_at,
    deadlineAt: row.deadline_at,
    extendedDeadlineAt: row.extended_deadline_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildReferenceNumber(seq: number, receivedAt: Date): string {
  const year = receivedAt.getUTCFullYear();
  return `DSAR-${year}-${String(seq).padStart(5, "0")}`;
}

export function createRequest(input: {
  requesterName: string;
  requesterEmail: string;
  description: string;
  receivedAt: Date;
  deadlineAt: Date;
}): DsarRequest {
  const id = randomUUID();
  const now = new Date().toISOString();

  const insert = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO requests (id, reference_number, requester_name, requester_email, description, received_at, deadline_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        "", // placeholder — filled in below once we know the auto-assigned seq
        input.requesterName,
        input.requesterEmail,
        input.description,
        input.receivedAt.toISOString(),
        input.deadlineAt.toISOString(),
        now,
        now
      );

    const seq = result.lastInsertRowid as number;
    const referenceNumber = buildReferenceNumber(seq, input.receivedAt);
    db.prepare("UPDATE requests SET reference_number = ? WHERE id = ?").run(referenceNumber, id);
  });

  insert();
  return getRequest(id)!;
}

export function getRequest(id: string): DsarRequest | undefined {
  const row = db.prepare("SELECT * FROM requests WHERE id = ?").get(id) as RequestRow | undefined;
  return row ? rowToRequest(row) : undefined;
}

export function listRequests(): DsarRequest[] {
  const rows = db.prepare("SELECT * FROM requests ORDER BY deadline_at ASC").all() as RequestRow[];
  return rows.map(rowToRequest);
}
