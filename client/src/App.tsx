import { useEffect, useState } from "react";

export function App() {
  const [apiStatus, setApiStatus] = useState<"checking" | "up" | "down">("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? setApiStatus("up") : setApiStatus("down")))
      .catch(() => setApiStatus("down"));
  }, []);

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "80px auto",
        padding: "0 20px",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <h1>GDPR DSAR Assistant</h1>
      <p style={{ color: "#555" }}>
        Intake → AI classification → deadline-tracked dashboard → AI-driven data source search →
        drafted response letter.
      </p>
      <p style={{ fontSize: 13, color: "#888" }}>
        Sprint 1: scaffold + deploy pipeline. API status:{" "}
        <strong style={{ color: apiStatus === "up" ? "#15803d" : apiStatus === "down" ? "#b91c1c" : "#888" }}>
          {apiStatus}
        </strong>
      </p>
    </div>
  );
}
