import type { DsarRequest, FoundRecord, RequestDetail, ResponseLetter } from "../types/dsar";

// In dev, relative "/api" is proxied to localhost:4000 by vite.config.ts.
// In production there's no proxy — VITE_API_BASE_URL (set in Vercel's
// project env vars) points directly at the deployed backend.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const BASE = `${API_BASE_URL}/api/requests`;

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

  generateDraft: (id: string) =>
    fetch(`${BASE}/${id}/draft`, { method: "POST" }).then((r) => handle<ResponseLetter>(r)),

  updateDraftLetter: (id: string, content: string) =>
    fetch(`${BASE}/${id}/letter`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }).then((r) => handle<ResponseLetter>(r)),

  sendRequest: (id: string) => fetch(`${BASE}/${id}/send`, { method: "POST" }).then((r) => handle<DsarRequest>(r)),
};
