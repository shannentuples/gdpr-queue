import { Navigate, Route, Routes } from "react-router-dom";
import { IntakePage } from "./pages/IntakePage";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { DashboardPage } from "./pages/DashboardPage";

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div style={{ padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
            <IntakePage />
          </div>
        }
      />
      {/* Reviewer-only views — not linked from the public intake flow. There's
          no auth in this demo (out of scope), so these are reachable by
          direct URL rather than gated behind a login. */}
      <Route path="/queue" element={<DashboardPage />} />
      <Route path="/requests/:id" element={<RequestDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
