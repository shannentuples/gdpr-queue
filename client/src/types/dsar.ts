export type RequestType = "access" | "deletion" | "portability" | "correction";
export const REQUEST_TYPES: RequestType[] = ["access", "deletion", "portability", "correction"];

export type RequestStatus = "new" | "classified" | "needs_review" | "researching" | "drafted" | "sent";

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
  receivedAt: string;
  deadlineAt: string;
  extendedDeadlineAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export type AuditEventType = "classification" | "search" | "draft" | "edit" | "send";

export interface AuditEvent {
  id: string;
  requestId: string;
  eventType: AuditEventType;
  detail: string;
  createdAt: string;
}

export interface RequestDetail {
  request: DsarRequest;
  foundRecords: FoundRecord[];
  draftLetter: ResponseLetter | null;
  auditLog: AuditEvent[];
}
