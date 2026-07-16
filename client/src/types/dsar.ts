export type RequestType = "access" | "deletion" | "portability" | "correction";

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
