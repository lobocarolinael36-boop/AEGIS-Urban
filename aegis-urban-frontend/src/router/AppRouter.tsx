import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// ── Lazy loading — cada página carga su chunk JS solo cuando se navega a ella.
// CityMap carga Leaflet (~500kb) únicamente cuando el usuario abre el mapa.
const PaginaLogin      = lazy(() => import("../pages/Login/LoginPage"));
const PaginaDashboard  = lazy(() => import("../pages/Dashboard/DashboardPage"));
const PaginaMapa       = lazy(() => import("../pages/CityMap/CityMapPage"));
const PaginaSensores   = lazy(() => import("../pages/Sensors/SensorsPage"));
const PaginaAlertas    = lazy(() => import("../pages/Alerts/AlertsPage"));
const PaginaSimulacion = lazy(() => import("../pages/Simulation/SimulationPage"));
const PaginaAdmin      = lazy(() => import("../pages/Admin/AdminPage"));

function CargadorPagina() {
  return (
    <div className="page-loader">
      <div className="spinner" />
      <span>Cargando módulo...</span>
    </div>
  );
}

function RutaPrivada({ children }: { children: React.ReactNode }) {
  const autenticado = useAuthStore((s) => s.autenticado);
  return autenticado ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<CargadorPagina />}>
      <Routes>
        {/* ── Pública */}
        <Route path="/login" element={<PaginaLogin />} />

        {/* ── Privadas */}
        <Route path="/dashboard" element={
          <RutaPrivada><PaginaDashboard /></RutaPrivada>
        } />
        <Route path="/mapa" element={
          <RutaPrivada><PaginaMapa /></RutaPrivada>
        } />
        <Route path="/sensores" element={
          <RutaPrivada><PaginaSensores /></RutaPrivada>
        } />
        <Route path="/alertas" element={
          <RutaPrivada><PaginaAlertas /></RutaPrivada>
        } />
        <Route path="/simulacion" element={
          <RutaPrivada><PaginaSimulacion /></RutaPrivada>
        } />
        <Route path="/admin" element={
          <RutaPrivada><PaginaAdmin /></RutaPrivada>
        } />

        {/* ── Redireccionamiento raíz */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
