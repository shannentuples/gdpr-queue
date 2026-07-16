import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { DsarRequest } from "../types/dsar";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  classified: "Classified",
  needs_review: "Needs manual review",
  researching: "Researching",
  drafted: "Drafted",
  sent: "Sent",
};

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<DsarRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getRequest(id)
      .then(setRequest)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load request"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;
  if (!request) return <p style={{ padding: 40, color: "#b91c1c" }}>{error ?? "Request not found"}</p>;

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
        <h3>Deadline</h3>
        <p>
          Received {new Date(request.receivedAt).toLocaleDateString()} — response due{" "}
          {new Date(request.extendedDeadlineAt ?? request.deadlineAt).toLocaleDateString()}
        </p>
      </section>
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
