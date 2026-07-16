import { Navigate, Route, Routes } from "react-router-dom";
import { IntakePage } from "./pages/IntakePage";
import { RequestDetailPage } from "./pages/RequestDetailPage";

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
      {/* Reviewer-only view, not linked from the public intake flow. Reached
          directly by reference/URL until Sprint 4's dashboard links to it. */}
      <Route path="/requests/:id" element={<RequestDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
