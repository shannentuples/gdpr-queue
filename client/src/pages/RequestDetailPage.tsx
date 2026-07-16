import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { AuditEvent, DsarRequest, FoundRecord, ResponseLetter } from "../types/dsar";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  classified: "Classified",
  needs_review: "Needs manual review",
  researching: "Researching",
  drafted: "Drafted",
  sent: "Sent",
};

const EVENT_LABELS: Record<string, string> = {
  classification: "Classified",
  search: "Searched",
  draft: "Drafted",
  edit: "Edited",
  send: "Sent",
};

function formatPayload(payload: unknown): string {
  if (payload && typeof payload === "object") {
    return Object.entries(payload as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  }
  return String(payload);
}

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<DsarRequest | null>(null);
  const [foundRecords, setFoundRecords] = useState<FoundRecord[]>([]);
  const [draftLetter, setDraftLetter] = useState<ResponseLetter | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [letterText, setLetterText] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [savingLetter, setSavingLetter] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api
      .getRequest(id)
      .then((detail) => {
        setRequest(detail.request);
        setFoundRecords(detail.foundRecords);
        setDraftLetter(detail.draftLetter);
        setAuditLog(detail.auditLog);
        setLetterText(detail.draftLetter?.content ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load request"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSearch() {
    if (!id) return;
    setSearching(true);
    setError(null);
    try {
      await api.runSearch(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleConfirm(recordId: string) {
    if (!id) return;
    setConfirmingId(recordId);
    try {
      const updated = await api.confirmMatch(id, recordId);
      setFoundRecords(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleGenerateDraft() {
    if (!id) return;
    setDrafting(true);
    setError(null);
    try {
      await api.generateDraft(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft generation failed");
    } finally {
      setDrafting(false);
    }
  }

  async function handleSaveEdits() {
    if (!id) return;
    setSavingLetter(true);
    setError(null);
    try {
      await api.updateDraftLetter(id, letterText);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving edits failed");
    } finally {
      setSavingLetter(false);
    }
  }

  async function handleSend() {
    if (!id) return;
    setSending(true);
    setError(null);
    try {
      await api.sendRequest(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Marking as sent failed");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;
  if (!request) return <p style={{ padding: 40, color: "#b91c1c" }}>{error ?? "Request not found"}</p>;

  const hasSearched = request.status === "researching" || request.status === "drafted" || request.status === "sent";
  const isSent = request.status === "sent";
  const letterDirty = draftLetter !== null && letterText !== draftLetter.content;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <Link to="/queue" style={{ fontSize: 13 }}>
        ← Back to queue
      </Link>
      <div style={{ fontSize: 13, color: "#777", marginTop: 12 }}>{request.referenceNumber}</div>
      <h1 style={{ marginTop: 4, marginBottom: 4 }}>{request.requesterName}</h1>
      <p style={{ color: "#555", marginTop: 0 }}>{request.requesterEmail}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        <span style={badgeStyle}>{STATUS_LABELS[request.status] ?? request.status}</span>
        <span style={badgeStyle}>{request.requestType ?? "type not set"}</span>
        <span style={{ ...badgeStyle, backgroundColor: request.verified ? "#dcfce7" : "#fee2e2" }}>
          {request.verified ? "Identity verified (stub)" : "Not verified"}
        </span>
      </div>

      <section style={sectionStyle}>
        <h3>Original request</h3>
        <p>{request.description}</p>
      </section>

      <section style={sectionStyle}>
        <h3>AI classification</h3>
        {request.classificationRationale ? (
          <>
            <p>{request.classificationRationale}</p>
            <p style={{ fontSize: 13, color: "#777" }}>
              Confidence: {Math.round((request.classificationConfidence ?? 0) * 100)}%
              {request.status === "needs_review" && (
                <span style={{ color: "#c2410c", fontWeight: 600 }}>
                  {" "}
                  — below the auto-classify threshold, flagged for manual review
                </span>
              )}
            </p>
          </>
        ) : (
          <p style={{ color: "#777" }}>Not yet classified.</p>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Data source search</h3>
          <button onClick={handleSearch} disabled={searching} style={buttonStyle}>
            {searching ? "Searching…" : "Run AI search"}
          </button>
        </div>
        {foundRecords.length === 0 ? (
          <p style={{ color: "#777" }}>
            {hasSearched ? "Search complete — no matching records found." : "No search has been run yet."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {foundRecords.map((r) => (
              <div
                key={r.id}
                style={{
                  ...matchCardStyle,
                  borderColor: r.confirmed ? "#d1fae5" : "#fed7aa",
                  backgroundColor: r.confirmed ? "#f0fdf4" : "#fff7ed",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong>
                    {r.sourceName} — {r.recordType}
                  </strong>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: r.confirmed ? "#15803d" : "#c2410c",
                    }}
                  >
                    {Math.round((r.matchConfidence ?? 0) * 100)}% match
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#555", margin: "4px 0" }}>{formatPayload(r.payload)}</div>
                <div style={{ fontSize: 12, color: "#777" }}>{r.matchReason}</div>
                {r.confirmed ? (
                  <div style={{ fontSize: 12, color: "#15803d", fontWeight: 600, marginTop: 6 }}>✓ Confirmed</div>
                ) : (
                  <button
                    onClick={() => handleConfirm(r.id)}
                    disabled={confirmingId === r.id}
                    style={{ ...buttonStyle, marginTop: 8, backgroundColor: "#c2410c" }}
                  >
                    {confirmingId === r.id ? "Confirming…" : "Confirm this is the right person"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Response letter</h3>
          {!isSent && (
            <button onClick={handleGenerateDraft} disabled={drafting} style={buttonStyle}>
              {drafting ? "Drafting…" : draftLetter ? "Regenerate draft" : "Generate draft"}
            </button>
          )}
        </div>
        {!draftLetter ? (
          <p style={{ color: "#777" }}>No draft has been generated yet.</p>
        ) : (
          <>
            <textarea
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
              readOnly={isSent}
              rows={14}
              style={letterTextareaStyle}
            />
            {!isSent && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={handleSaveEdits} disabled={!letterDirty || savingLetter} style={buttonStyle}>
                  {savingLetter ? "Saving…" : "Save edits"}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || letterDirty}
                  style={{ ...buttonStyle, backgroundColor: "#15803d" }}
                  title={letterDirty ? "Save your edits first" : undefined}
                >
                  {sending ? "Sending…" : "Mark as sent"}
                </button>
              </div>
            )}
            {isSent && <p style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>✓ Sent — letter is locked</p>}
          </>
        )}
      </section>

      <section style={sectionStyle}>
        <h3>Deadline</h3>
        <p>
          Received {new Date(request.receivedAt).toLocaleDateString()} — response due{" "}
          {new Date(request.extendedDeadlineAt ?? request.deadlineAt).toLocaleDateString()}
        </p>
      </section>

      <section style={sectionStyle}>
        <h3>Activity log</h3>
        {auditLog.length === 0 ? (
          <p style={{ color: "#777" }}>No activity yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {auditLog.map((event) => (
              <li
                key={event.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid #f5f5f5",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#777", whiteSpace: "nowrap" }}>
                  {new Date(event.createdAt).toLocaleString()}
                </span>
                <span style={{ fontWeight: 600 }}>{EVENT_LABELS[event.eventType] ?? event.eventType}</span>
                <span style={{ color: "#555" }}>{event.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
    </div>
  );
}

const sectionStyle = { margin: "20px 0", padding: "16px 0", borderTop: "1px solid #eee" };
const badgeStyle = {
  fontSize: 12,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 999,
  backgroundColor: "#eef2ff",
  color: "#3730a3",
};
const buttonStyle = {
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "#1d4ed8",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
const matchCardStyle = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid",
};
const letterTextareaStyle = {
  width: "100%",
  padding: 12,
  fontSize: 13,
  fontFamily: "inherit",
  lineHeight: 1.5,
  borderRadius: 8,
  border: "1px solid #ddd",
  boxSizing: "border-box" as const,
  resize: "vertical" as const,
};
