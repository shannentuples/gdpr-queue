import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { REQUEST_TYPES, type DsarRequest, type RequestStatus, type RequestType } from "../types/dsar";
import { DeadlineBadge } from "../components/DeadlineBadge";

const STATUS_OPTIONS: RequestStatus[] = ["new", "classified", "needs_review", "researching", "drafted", "sent"];

type StatusFilter = "open" | "all" | RequestStatus;
type TypeFilter = "all" | RequestType;

function effectiveDeadline(r: DsarRequest): string {
  return r.extendedDeadlineAt ?? r.deadlineAt;
}

export function DashboardPage() {
  const [requests, setRequests] = useState<DsarRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  useEffect(() => {
    api
      .listRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load requests"))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    return requests
      .filter((r) => {
        if (statusFilter === "open") return r.status !== "sent";
        if (statusFilter === "all") return true;
        return r.status === statusFilter;
      })
      .filter((r) => (typeFilter === "all" ? true : r.requestType === typeFilter))
      .sort((a, b) => new Date(effectiveDeadline(a)).getTime() - new Date(effectiveDeadline(b)).getTime());
  }, [requests, statusFilter, typeFilter]);

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;
  if (error) return <p style={{ padding: 40, color: "#b91c1c" }}>{error}</p>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Request Queue</h1>

      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
        <label style={{ fontSize: 13 }}>
          Status{" "}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="open">Open (not sent)</option>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          Type{" "}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
            <option value="all">All types</option>
            {REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: 13, color: "#777" }}>
          {visible.length} of {requests.length} requests
        </span>
      </div>

      {visible.length === 0 ? (
        <p style={{ color: "#777" }}>No requests match these filters.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
              <th style={thStyle}>Requester</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={tdStyle}>
                  <Link to={`/requests/${r.id}`}>{r.requesterName}</Link>
                  <div style={{ fontSize: 12, color: "#777" }}>{r.referenceNumber}</div>
                </td>
                <td style={tdStyle}>{r.requestType ?? <span style={{ color: "#aaa" }}>unset</span>}</td>
                <td style={tdStyle}>{r.status.replace("_", " ")}</td>
                <td style={tdStyle}>
                  <DeadlineBadge deadlineAt={effectiveDeadline(r)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = { padding: "8px 12px", fontSize: 13, color: "#555" };
const tdStyle = { padding: "10px 12px", fontSize: 14, verticalAlign: "top" as const };
