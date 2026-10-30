import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "../../components/Layout/Sidebar";
import { useWebSocket } from "../../hooks/useWebSocket";
import api from "../../services/api";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
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
  created_at:  string;
}

interface EstadoSalud {
  api: boolean | null;
  baseDatos: "conectada" | "desconectada" | "desconocida";
}

const ACCION_LABEL: Record<string, string> = {
  USER_LOGIN:              "Sesión iniciada",
  USER_LOGOUT:             "Sesión cerrada",
  SENSOR_READING_ANOMALY:  "Anomalía detectada",
  ALERT_CREATED:           "Alerta creada",
  ALERT_ACKNOWLEDGED:      "Alerta reconocida",
  ALERT_RESOLVED:          "Alerta resuelta",
  EVACUATION_INITIATED:    "Evacuación iniciada",
};

export default function DashboardPage() {
  const { t }                 = useTranslation();
  const { conectado, ultimaAlerta } = useWebSocket();
  const familia = useAuthStore(s => s.usuario?.familia);
  const puedeSimular = familia === "ADMIN_SISTEMA" || familia === "DEFENSA_CIVIL";

  const [stats, setStats]       = useState<Estadisticas | null>(null);
  const [actividad, setActividad] = useState<EntradaActividad[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [salud, setSalud] = useState<EstadoSalud>({ api: null, baseDatos: "desconocida" });

  const comprobarSalud = useCallback(async () => {
    try {
      const res = await api.get<{ estado: string; baseDatos: { estado: "conectada" | "desconectada" } }>("/health");
      setSalud({ api: true, baseDatos: res.data.baseDatos.estado });
    } catch (error) {
      const datos = (error as { response?: { data?: { baseDatos?: { estado?: "conectada" | "desconectada" } } } }).response?.data;
      setSalud({ api: false, baseDatos: datos?.baseDatos?.estado ?? "desconocida" });
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      const [statsRes, actRes] = await Promise.all([
        api.get<Estadisticas>("/telemetry/estadisticas"),
        api.get<{ actividad: EntradaActividad[] }>("/telemetry/actividad?limite=8"),
      ]);
      setStats(statsRes.data);
      setActividad(actRes.data.actividad);
      setErrorCarga(false);
      setActualizado(new Date());
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);
  useEffect(() => {
    comprobarSalud();
    const intervalo = setInterval(comprobarSalud, 30_000);
    return () => clearInterval(intervalo);
  }, [comprobarSalud]);

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
          <div>
            <p className={styles.eyebrow}>CENTRO DE OPERACIONES · BUENOS AIRES</p>
            <h1 className={styles.pageTitle}>{t("dashboard.title")}</h1>
            <p className={styles.subtitle}>Estado de sensores, alertas y actividad de la ciudad.</p>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.healthStrip} aria-label="Estado de los servicios">
              <span className={`${styles.healthBadge} ${salud.api ? styles.healthOk : salud.api === false ? styles.healthError : styles.healthUnknown}`}>
                API {salud.api === null ? "…" : salud.api ? "OK" : "ERROR"}
              </span>
              <span className={`${styles.healthBadge} ${salud.baseDatos === "conectada" ? styles.healthOk : salud.baseDatos === "desconectada" ? styles.healthError : styles.healthUnknown}`}>
                BD {salud.baseDatos === "conectada" ? "OK" : salud.baseDatos === "desconectada" ? "ERROR" : "…"}
              </span>
            </div>
            <span className={`${styles.wsBadge} ${conectado ? styles.wsOn : styles.wsOff}`}>
              <span aria-hidden="true">●</span> {conectado ? "EN VIVO" : "SIN CONEXIÓN"}
            </span>
            <button onClick={cargarDatos} className={styles.refreshBtn} title="Actualizar datos" aria-label="Actualizar datos">
              ↻ <span>Actualizar</span>
            </button>
          </div>
        </header>

        {errorCarga && <div className={styles.errorBanner} role="status">
          <span>No se pudieron actualizar los datos. Puede que la API no esté disponible.</span>
          <button onClick={cargarDatos}>Reintentar</button>
        </div>}

        <section className={styles.sectionIntro}>
          <div><span className={styles.sectionKicker}>SITUACIÓN ACTUAL</span><h2>Resumen operativo</h2></div>
          <span className={styles.updatedAt}>{actualizado ? `Actualizado ${actualizado.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : "Esperando datos"}</span>
        </section>

        {/* ── Tarjetas de estadísticas */}
        <section className={styles.statsGrid}>
          {tarjetas.map((s, index) => (
            <div key={s.etiqueta} className={`${styles.statCard} ${styles[`statCard--${s.variante}`]}`}>
              <span className={styles.statIndex}>0{index + 1}</span>
              <span className={styles.statValue}>{s.valor}</span>
              <span className={styles.statLabel}>{s.etiqueta}</span>
              <span className={styles.statSub}>{s.sub}</span>
            </div>
          ))}
        </section>

        <section className={styles.quickActions} aria-label="Accesos rápidos">
          <NavLink to="/mapa" className={styles.quickAction}><span className={styles.quickIcon}>⌖</span><span><strong>Abrir mapa</strong><small>Ver sensores por zona</small></span><span aria-hidden="true">→</span></NavLink>
          <NavLink to="/alertas" className={styles.quickAction}><span className={styles.quickIcon}>!</span><span><strong>Gestionar alertas</strong><small>Revisar eventos activos</small></span><span aria-hidden="true">→</span></NavLink>
          {puedeSimular && <NavLink to="/simulacion" className={styles.quickAction}><span className={styles.quickIcon}>↗</span><span><strong>Probar escenario</strong><small>Simular lecturas de sensores</small></span><span aria-hidden="true">→</span></NavLink>}
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
                  <span className={styles.actTime}>{new Date(e.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
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
