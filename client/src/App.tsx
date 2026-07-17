import { Link, Navigate, Route, Routes } from "react-router-dom";
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
            {/* Real staff tools are usually reached through a discreet, separate
                entry point rather than being linked from the public-facing page.
                There's no real auth behind this in the demo (out of scope — see
                README), so it's a plain link, not a login gate. */}
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <Link to="/queue" style={{ fontSize: 12, color: "#aaa" }}>
                Reviewer sign-in
              </Link>
            </div>
          </div>
        }
      />
      <Route path="/queue" element={<DashboardPage />} />
      <Route path="/requests/:id" element={<RequestDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
