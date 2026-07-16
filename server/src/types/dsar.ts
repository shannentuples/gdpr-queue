// Vocabulary matches Sprint 4's filter AC exactly (access/deletion/portability/correction).
export const REQUEST_TYPES = ["access", "deletion", "portability", "correction"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = [
  "new",
  "classified",
  "needs_review",
  "researching",
  "drafted",
  "sent",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface DsarRequest {
  id: string;
  referenceNumber: string;
  requesterName: string;
  requesterEmail: string;
  description: string;
  verified: boolean;
  requestType: RequestType | null;
  classificationConfidence: number | null;
  classificationRationale: string | null;
  status: RequestStatus;
  receivedAt: string; // ISO timestamp
  deadlineAt: string; // ISO timestamp — statutory response deadline
  extendedDeadlineAt: string | null; // ISO timestamp if Art. 12(3) extension applied
  createdAt: string;
  updatedAt: string;
}

export interface DataSource {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface FoundRecord {
  id: string;
  dataSourceId: string;
  sourceName: string;
  subjectName: string;
  subjectEmail: string;
  recordType: string;
  payload: unknown;
  requestId: string | null;
  matchConfidence: number | null;
  matchReason: string | null;
  confirmed: boolean;
  createdAt: string;
}

export interface ResponseLetter {
  id: string;
  requestId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const AUDIT_EVENT_TYPES = ["classification", "search", "draft", "edit", "send"] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export interface AuditEvent {
  id: string;
  requestId: string;
  eventType: AuditEventType;
  detail: string;
  createdAt: string;
}

export interface IntakeInput {
  requesterName: string;
  requesterEmail: string;
  description: string;
}
