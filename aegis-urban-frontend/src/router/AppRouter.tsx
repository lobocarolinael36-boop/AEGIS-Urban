import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// ── Lazy loading — cada página carga su chunk JS solo cuando se navega a ella.
// CityMap carga Leaflet (~500kb) únicamente cuando el usuario abre el mapa.
const LoginPage    = lazy(() => import("../pages/Login/LoginPage"));
const DashboardPage = lazy(() => import("../pages/Dashboard/DashboardPage"));
const CityMapPage  = lazy(() => import("../pages/CityMap/CityMapPage"));
const SensorsPage  = lazy(() => import("../pages/Sensors/SensorsPage"));
const AlertsPage   = lazy(() => import("../pages/Alerts/AlertsPage"));
const SimulationPage = lazy(() => import("../pages/Simulation/SimulationPage"));
const AdminPage    = lazy(() => import("../pages/Admin/AdminPage"));

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="spinner" />
      <span>Cargando módulo...</span>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuth);
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Privadas */}
        <Route path="/dashboard" element={
          <PrivateRoute><DashboardPage /></PrivateRoute>
        } />
        <Route path="/map" element={
          <PrivateRoute><CityMapPage /></PrivateRoute>
        } />
        <Route path="/sensors" element={
          <PrivateRoute><SensorsPage /></PrivateRoute>
        } />
        <Route path="/alerts" element={
          <PrivateRoute><AlertsPage /></PrivateRoute>
        } />
        <Route path="/simulation" element={
          <PrivateRoute><SimulationPage /></PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute><AdminPage /></PrivateRoute>
        } />

        {/* ── Redireccionamiento raíz */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
