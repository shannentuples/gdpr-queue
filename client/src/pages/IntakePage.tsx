import { CSSProperties, FormEvent, useState } from "react";
import { api } from "../api/client";
import type { DsarRequest } from "../types/dsar";

export function IntakePage() {
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<DsarRequest | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createRequest({ requesterName, requesterEmail, description });
      setConfirmed(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1>Request received</h1>
        <p>
          Thanks, {confirmed.requesterName}. Your request is now in our compliance queue and will
          be handled within the statutory deadline.
        </p>
        <div style={confirmationBoxStyle}>
          <div style={{ fontSize: 13, color: "#555" }}>Reference number</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>
            {confirmed.referenceNumber}
          </div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 12 }}>
            Response due by {new Date(confirmed.deadlineAt).toLocaleDateString()}
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#777" }}>
          Keep this reference number — you may be asked for it if you contact us about this
          request.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1>Submit a Data Subject Request</h1>
      <p style={{ color: "#555" }}>
        Describe what you're asking for. We'll confirm receipt with a reference number and
        respond within the statutory deadline.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label>
          Your name
          <input
            required
            value={requesterName}
            onChange={(e) => setRequesterName(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label>
          Your email
          <input
            required
            type="email"
            value={requesterEmail}
            onChange={(e) => setRequesterEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label>
          What are you asking for?
          <textarea
            required
            rows={6}
            placeholder="e.g. 'Please send me a copy of all personal data you hold on me.'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Submitting…" : "Submit request"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid #ccc",
  borderRadius: 6,
  boxSizing: "border-box",
};

const buttonStyle: CSSProperties = {
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "#1d4ed8",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const confirmationBoxStyle: CSSProperties = {
  padding: 20,
  borderRadius: 8,
  border: "1px solid #eee",
  backgroundColor: "#fafafa",
  margin: "20px 0",
};
