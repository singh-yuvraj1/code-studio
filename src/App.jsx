import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";

const WorkspacePage = lazy(() => import("./pages/WorkspacePage.jsx"));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/room/:roomId"
        element={
          <Suspense fallback={<main className="workspace-loading">Opening workspace…</main>}>
            <WorkspacePage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
