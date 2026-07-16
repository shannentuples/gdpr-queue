import type { DsarRequest, FoundRecord, RequestDetail } from "../types/dsar";

const BASE = "/api/requests";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface IntakeInput {
  requesterName: string;
  requesterEmail: string;
  description: string;
}

export const api = {
  createRequest: (input: IntakeInput) =>
    fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => handle<DsarRequest>(r)),

  listRequests: () => fetch(BASE).then((r) => handle<DsarRequest[]>(r)),

  getRequest: (id: string) => fetch(`${BASE}/${id}`).then((r) => handle<RequestDetail>(r)),

  runSearch: (id: string) =>
    fetch(`${BASE}/${id}/search`, { method: "POST" }).then((r) =>
      handle<{ matches: FoundRecord[]; summary: string }>(r)
    ),

  confirmMatch: (requestId: string, recordId: string) =>
    fetch(`${BASE}/${requestId}/records/${recordId}/confirm`, { method: "POST" }).then((r) =>
      handle<FoundRecord[]>(r)
    ),
};
