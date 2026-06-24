import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import { useWebSocket } from "../../hooks/useWebSocket";
import api from "../../services/api";
import styles from "./AlertsPage.module.css";

interface Alerta {
  id_alert:       number;
  level:          string;
  alert_type:     string;
  message:        string;
  status:         string;
  created_at:     string;
  updated_at:     string;
  serial_code:    string;
  lat:            number;
  lon:            number;
  sensor_type:    string;
  city_node_name: string;
}

interface PlanEvacuacion {
  nombreEstrategia:   string;
  descripcion:        string;
  personasEstimadas:  number;
  instrucciones:      string[];
  tiempoEstimadoMin:  number;
  radioMetros:        number | null;
}

const NIVEL_CONFIG: Record<string, { label: string; cls: string }> = {
  INFO:     { label: "INFO",     cls: "info" },
  LOW:      { label: "BAJO",     cls: "low" },
  MEDIUM:   { label: "MEDIO",    cls: "medium" },
  HIGH:     { label: "ALTO",     cls: "high" },
  CRITICAL: { label: "CRÍTICO",  cls: "critical" },
};

const TIPO_ICON: Record<string, string> = {
  FLOOD: "💧", FIRE: "🔥", WIND: "💨", AIR_QUALITY: "🌫",
};

export default function AlertsPage() {
  const { conectado, ultimaAlerta } = useWebSocket();
  const [alertas, setAlertas]       = useState<Alerta[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [filtro, setFiltro]         = useState<"TODOS" | "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED">("TODOS");
  const [accionando, setAccionando] = useState<number | null>(null);
  const [plan, setPlan]             = useState<PlanEvacuacion | null>(null);
  const [planAlertaId, setPlanAlertaId] = useState<number | null>(null);

  const cargarAlertas = useCallback(async () => {
    try {
      const res = await api.get<{ alertas: Alerta[] }>("/alertas");
      setAlertas(res.data.alertas);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarAlertas(); }, [cargarAlertas]);
  useEffect(() => { if (ultimaAlerta) cargarAlertas(); }, [ultimaAlerta, cargarAlertas]);

  const reconocer = async (id: number) => {
    setAccionando(id);
    try {
      await api.patch(`/alertas/${id}/reconocer`);
      setAlertas(prev => prev.map(a =>
        a.id_alert === id ? { ...a, status: "ACKNOWLEDGED" } : a
      ));
    } finally {
      setAccionando(null);
    }
  };

  const evacuar = async (id: number) => {
    setAccionando(id);
    try {
      const res = await api.post<{ plan: PlanEvacuacion }>(`/alertas/${id}/evacuar`);
      setPlan(res.data.plan);
      setPlanAlertaId(id);
      setAlertas(prev => prev.map(a =>
        a.id_alert === id ? { ...a, status: "RESOLVED" } : a
      ));
    } finally {
      setAccionando(null);
    }
  };

  const filtradas = filtro === "TODOS" ? alertas : alertas.filter(a => a.status === filtro);

  const conteo = {
    active:       alertas.filter(a => a.status === "ACTIVE").length,
    acknowledged: alertas.filter(a => a.status === "ACKNOWLEDGED").length,
    resolved:     alertas.filter(a => a.status === "RESOLVED").length,
    critical:     alertas.filter(a => a.level === "CRITICAL" && a.status === "ACTIVE").length,
  };

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Alertas</h1>
            <p className={styles.subtitle}>Panel de alertas — niveles INFO / LOW / MEDIUM / HIGH / CRITICAL</p>
          </div>
          <div className={styles.topbarRight}>
            <span className={`${styles.wsBadge} ${conectado ? styles.wsOn : styles.wsOff}`}>
              {conectado ? "● LIVE" : "○ offline"}
            </span>
            <button onClick={cargarAlertas} className={styles.refreshBtn} title="Actualizar">↻</button>
          </div>
        </header>

        {/* Resumen */}
        <div className={styles.resumenGrid}>
          <div className={`${styles.resumenCard} ${styles["resumenCard--danger"]}`}>
            <span className={styles.resumenVal}>{conteo.active}</span>
            <span className={styles.resumenLabel}>Activas</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--critical"]}`}>
            <span className={styles.resumenVal}>{conteo.critical}</span>
            <span className={styles.resumenLabel}>Críticas</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--warning"]}`}>
            <span className={styles.resumenVal}>{conteo.acknowledged}</span>
            <span className={styles.resumenLabel}>Reconocidas</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--ok"]}`}>
            <span className={styles.resumenVal}>{conteo.resolved}</span>
            <span className={styles.resumenLabel}>Resueltas</span>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.filtros}>
          {(["TODOS", "ACTIVE", "ACKNOWLEDGED", "RESOLVED"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`${styles.filtroBtn} ${filtro === f ? styles.filtroBtnActive : ""}`}
            >
              {f === "TODOS" ? "Todas" : f === "ACTIVE" ? "Activas" : f === "ACKNOWLEDGED" ? "Reconocidas" : "Resueltas"}
            </button>
          ))}
        </div>

        {/* Lista de alertas */}
        <div className={styles.alertasList}>
          {cargando ? (
            <div className={styles.empty}>Cargando alertas…</div>
          ) : filtradas.length === 0 ? (
            <div className={styles.empty}>
              <p>Sin alertas en este filtro.</p>
              <small>El motor de simulación genera lecturas cada 15 segundos.</small>
            </div>
          ) : (
            filtradas.map(a => {
              const nivel = NIVEL_CONFIG[a.level] ?? { label: a.level, cls: "info" };
              return (
                <div key={a.id_alert} className={`${styles.alertaCard} ${styles[`alertaCard--${nivel.cls}`]}`}>
                  <div className={styles.alertaHeader}>
                    <div className={styles.alertaHeaderLeft}>
                      <span className={`${styles.nivelBadge} ${styles[`nivelBadge--${nivel.cls}`]}`}>
                        {nivel.label}
                      </span>
                      <span className={styles.alertaTipo}>
                        {TIPO_ICON[a.sensor_type] ?? "📡"} {a.alert_type}
                      </span>
                      <span className={styles.alertaDistrito}>{a.city_node_name}</span>
                    </div>
                    <div className={styles.alertaHeaderRight}>
                      <span className={`${styles.statusBadge} ${styles[`statusBadge--${a.status.toLowerCase()}`]}`}>
                        {a.status === "ACTIVE" ? "ACTIVA" : a.status === "ACKNOWLEDGED" ? "RECONOCIDA" : "RESUELTA"}
                      </span>
                      <span className={styles.alertaTime}>
                        {new Date(a.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>
                  <p className={styles.alertaMensaje}>{a.message}</p>
                  <div className={styles.alertaFooter}>
                    <span className={styles.alertaSerial}>📡 {a.serial_code}</span>
                    {a.status === "ACTIVE" && (
                      <div className={styles.alertaAcciones}>
                        <button
                          className={styles.btnReconocer}
                          onClick={() => reconocer(a.id_alert)}
                          disabled={accionando === a.id_alert}
                        >
                          {accionando === a.id_alert ? "…" : "✓ Reconocer"}
                        </button>
                        <button
                          className={styles.btnEvacuar}
                          onClick={() => evacuar(a.id_alert)}
                          disabled={accionando === a.id_alert}
                        >
                          {accionando === a.id_alert ? "…" : "⚡ Evacuar"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal plan de evacuación */}
        {plan && (
          <div className={styles.modalBackdrop} onClick={() => setPlan(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Plan de Evacuación</h2>
                <button className={styles.modalClose} onClick={() => setPlan(null)}>✕</button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.planRow}>
                  <span className={styles.planLabel}>Estrategia</span>
                  <span className={styles.planVal}>{plan.nombreEstrategia}</span>
                </div>
                <div className={styles.planRow}>
                  <span className={styles.planLabel}>Descripción</span>
                  <span className={styles.planVal}>{plan.descripcion}</span>
                </div>
                <div className={styles.planRow}>
                  <span className={styles.planLabel}>Personas estimadas</span>
                  <span className={styles.planVal}>{plan.personasEstimadas.toLocaleString("es-AR")}</span>
                </div>
                <div className={styles.planRow}>
                  <span className={styles.planLabel}>Tiempo estimado</span>
                  <span className={styles.planVal}>{plan.tiempoEstimadoMin} minutos</span>
                </div>
                {plan.radioMetros && (
                  <div className={styles.planRow}>
                    <span className={styles.planLabel}>Radio afectado</span>
                    <span className={styles.planVal}>{plan.radioMetros}m</span>
                  </div>
                )}
                <div className={styles.instruccionesTitle}>Instrucciones:</div>
                <ol className={styles.instrucciones}>
                  {plan.instrucciones.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ol>
                <div className={styles.planAlertaId}>Alerta #{planAlertaId} → estado RESUELTA</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
