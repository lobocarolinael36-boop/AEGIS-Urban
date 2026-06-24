import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "../../components/Layout/Sidebar";
import { useWebSocket } from "../../hooks/useWebSocket";
import api from "../../services/api";
import styles from "./DashboardPage.module.css";

interface Estadisticas {
  sensoresActivos:  number;
  sensoresTotal:    number;
  alertasActivas:   number;
  alertasCriticas:  number;
  lecturas24h:      number;
}

interface EntradaActividad {
  id_log:      string;
  action:      string;
  entity_name: string;
  entity_id:   string;
  ip_address:  string;
  created_at:  string;
}

const ACCION_LABEL: Record<string, string> = {
  USER_LOGIN:              "Sesión iniciada",
  USER_LOGOUT:             "Sesión cerrada",
  SENSOR_READING_ANOMALY:  "Anomalía detectada",
  ALERT_CREATED:           "Alerta creada",
  EVACUATION_INITIATED:    "Evacuación iniciada",
};

export default function DashboardPage() {
  const { t }                 = useTranslation();
  const { conectado, ultimaAlerta } = useWebSocket();

  const [stats, setStats]       = useState<Estadisticas | null>(null);
  const [actividad, setActividad] = useState<EntradaActividad[]>([]);
  const [cargando, setCargando]   = useState(true);

  const cargarDatos = useCallback(async () => {
    try {
      const [statsRes, actRes] = await Promise.all([
        api.get<Estadisticas>("/telemetry/estadisticas"),
        api.get<{ actividad: EntradaActividad[] }>("/telemetry/actividad?limite=8"),
      ]);
      setStats(statsRes.data);
      setActividad(actRes.data.actividad);
    } catch {
      // silencioso — muestra "—" en tarjetas
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Recarga las estadísticas cuando llega una nueva alerta por WebSocket
  useEffect(() => {
    if (ultimaAlerta) cargarDatos();
  }, [ultimaAlerta, cargarDatos]);

  const tarjetas = [
    {
      etiqueta: t("dashboard.activeSensors"),
      valor:    cargando ? "…" : (stats ? `${stats.sensoresActivos}/${stats.sensoresTotal}` : "—"),
      variante: "cyan",
      sub:      "sensores activos",
    },
    {
      etiqueta: t("dashboard.activeAlerts"),
      valor:    cargando ? "…" : (stats?.alertasActivas ?? "—"),
      variante: stats?.alertasActivas ? "warning" : "safe",
      sub:      "alertas en curso",
    },
    {
      etiqueta: t("dashboard.criticalAlerts"),
      valor:    cargando ? "…" : (stats?.alertasCriticas ?? "—"),
      variante: stats?.alertasCriticas ? "danger" : "safe",
      sub:      "críticas activas",
    },
    {
      etiqueta: "Lecturas 24h",
      valor:    cargando ? "…" : (stats?.lecturas24h ?? "—"),
      variante: "cyan",
      sub:      "registros de telemetría",
    },
  ];

  return (
    <div className={styles.page}>
      <Sidebar />

      <main className={styles.main}>
        <header className={styles.topbar}>
          <h1 className={styles.pageTitle}>{t("dashboard.title")}</h1>
          <div className={styles.topbarRight}>
            <span className={`${styles.wsBadge} ${conectado ? styles.wsOn : styles.wsOff}`}>
              {conectado ? "● LIVE" : "○ offline"}
            </span>
            <button onClick={cargarDatos} className={styles.refreshBtn} title="Actualizar">
              ↻
            </button>
          </div>
        </header>

        {/* ── Tarjetas de estadísticas */}
        <section className={styles.statsGrid}>
          {tarjetas.map((s) => (
            <div key={s.etiqueta} className={`${styles.statCard} ${styles[`statCard--${s.variante}`]}`}>
              <span className={styles.statValue}>{s.valor}</span>
              <span className={styles.statLabel}>{s.etiqueta}</span>
              <span className={styles.statSub}>{s.sub}</span>
            </div>
          ))}
        </section>

        {/* ── Actividad reciente */}
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Actividad Reciente</h2>
            <span className={styles.panelBadge}>{actividad.length} eventos</span>
          </div>

          {actividad.length === 0 && !cargando ? (
            <div className={styles.emptyState}>
              <p>{t("common.noData")}</p>
              <small>El motor de simulación genera actividad cada 15 segundos.</small>
            </div>
          ) : (
            <ul className={styles.actividadList}>
              {actividad.map((e) => (
                <li key={e.id_log} className={styles.actividadItem}>
                  <span className={`${styles.actTag} ${styles[`actTag--${e.action}`]}`}>
                    {ACCION_LABEL[e.action] ?? e.action}
                  </span>
                  <span className={styles.actEntidad}>
                    {e.entity_name} #{e.entity_id}
                  </span>
                  <span className={styles.actTime}>{e.created_at}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Alerta recibida por WS */}
        {ultimaAlerta && (
          <div className={`${styles.wsAlert} ${styles[`wsAlert--${ultimaAlerta.nivel.toLowerCase()}`]}`}>
            <strong>⚠ Nueva alerta:</strong> {ultimaAlerta.mensaje}
          </div>
        )}
      </main>
    </div>
  );
}
