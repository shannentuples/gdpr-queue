import type { DsarRequest } from "../types/dsar";

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
};
