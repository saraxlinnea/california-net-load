import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import AdoptionPage from "./pages/AdoptionPage";
import ComparePage from "./pages/ComparePage";
import FuelPage from "./pages/FuelPage";
import MethodsPage from "./pages/MethodsPage";
import OverviewPage from "./pages/OverviewPage";
import StoragePage from "./pages/StoragePage";
import "./index.css";

/** Vite base ends with /; React Router basename should not. */
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename === "/" ? undefined : basename}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<AdoptionPage />} />
          <Route path="charge" element={<OverviewPage />} />
          <Route path="fuel" element={<FuelPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="methods" element={<MethodsPage />} />
          <Route path="adoption" element={<Navigate to="/" replace />} />
          <Route path="overview" element={<Navigate to="/charge" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
