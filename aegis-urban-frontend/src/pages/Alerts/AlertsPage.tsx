import { useEffect, useState, useCallback } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import { useWebSocket } from "../../hooks/useWebSocket";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";
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
  id_city_node: number;
}
interface Zona { id_node: number; name: string; node_type: string }
interface Paginacion { page: number; pageSize: number; total: number; totalPages: number }

interface PlanEvacuacion {
  nombreEstrategia:   string;
  descripcion:        string;
  personasEstimadas:  number;
  instrucciones:      string[];
  tiempoEstimadoMin:  number;
  radioMetros:        number | null;
}

const NIVEL_CONFIG: Record<string, { label: string; cls: string }> = {
  WARNING:      { label: "ADVERTENCIA", cls: "medium" },
  CRITICAL:     { label: "CRÍTICA", cls: "high" },
  CATASTROPHIC: { label: "CATASTRÓFICA", cls: "critical" },
};

const TIPO_ICON: Record<string, string> = {
  FLOOD: "💧", FIRE: "🔥", WIND: "💨", AIR_QUALITY: "🌫", POWER_OUT: "⚡",
};

export default function AlertsPage() {
  const { conectado, ultimaAlerta } = useWebSocket();
  const familia = useAuthStore(s => s.usuario?.familia);
  const puedeOperar = familia === "ADMIN_SISTEMA" || familia === "DEFENSA_CIVIL";
  const [alertas, setAlertas]       = useState<Alerta[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [filtro, setFiltro]         = useState<"TODOS" | "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED">("TODOS");
  const [filtroNivel, setFiltroNivel] = useState("TODOS");
  const [busqueda, setBusqueda]     = useState("");
  const [accionando, setAccionando] = useState<number | null>(null);
  const [plan, setPlan]             = useState<PlanEvacuacion | null>(null);
  const [planAlertaId, setPlanAlertaId] = useState<number | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [zonaId, setZonaId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState<Paginacion>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  const cargarAlertas = useCallback(async () => {
    try {
      const params = { page: pagina.page, pageSize: pagina.pageSize, zonaId: zonaId || undefined,
        desde: desde || undefined, hasta: hasta || undefined, estado: filtro === "TODOS" ? undefined : filtro,
        nivel: filtroNivel === "TODOS" ? undefined : filtroNivel, busqueda: busqueda.trim() || undefined };
      const res = await api.get<{ alertas: Alerta[]; paginacion: Paginacion }>("/alertas", { params });
      setAlertas(res.data.alertas);
      setPagina(res.data.paginacion);
      setErrorCarga(false);
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  }, [pagina.page, pagina.pageSize, zonaId, desde, hasta, filtro, filtroNivel, busqueda]);

  useEffect(() => { void api.get<{ zonas: Zona[] }>("/alertas/zonas").then(r => setZonas(r.data.zonas)).catch(() => undefined); }, []);
  useEffect(() => { cargarAlertas(); }, [cargarAlertas]);
  useEffect(() => { if (ultimaAlerta) cargarAlertas(); }, [ultimaAlerta, cargarAlertas]);

  const reconocer = async (id: number) => {
    setAccionando(id);
    setErrorAccion(null);
    try {
      await api.patch(`/alertas/${id}/reconocer`);
      setAlertas(prev => prev.map(a =>
        a.id_alert === id ? { ...a, status: "ACKNOWLEDGED" } : a
      ));
    } catch {
      setErrorAccion("No se pudo reconocer la alerta. Actualizá la lista e intentá de nuevo.");
    } finally {
      setAccionando(null);
    }
  };

  const evacuar = async (id: number) => {
    setAccionando(id);
    setErrorAccion(null);
    try {
      const res = await api.post<{ plan: PlanEvacuacion }>(`/alertas/${id}/evacuar`);
      setPlan(res.data.plan);
      setPlanAlertaId(id);
    } catch {
      setErrorAccion("No se pudo generar el plan. Actualizá la lista e intentá de nuevo.");
    } finally {
      setAccionando(null);
    }
  };

  const resolver = async (id: number) => {
    setAccionando(id);
    setErrorAccion(null);
    try {
      await api.patch(`/alertas/${id}/resolver`);
      setAlertas(prev => prev.map(a => a.id_alert === id ? { ...a, status: "RESOLVED" } : a));
    } catch {
      setErrorAccion("No se pudo resolver la alerta. Actualizá la lista e intentá de nuevo.");
    } finally {
      setAccionando(null);
    }
  };

  const filtradas = alertas;
  const cambiarFiltro = (actualizar: () => void) => { actualizar(); setPagina(p => ({ ...p, page: 1 })); };

  const conteo = {
    active:       alertas.filter(a => a.status === "ACTIVE").length,
    acknowledged: alertas.filter(a => a.status === "ACKNOWLEDGED").length,
    resolved:     alertas.filter(a => a.status === "RESOLVED").length,
    critical:     alertas.filter(a => ["CRITICAL", "CATASTROPHIC"].includes(a.level) && a.status !== "RESOLVED").length,
  };

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Alertas</h1>
            <p className={styles.subtitle}>Eventos por severidad, zona y estado de atención.</p>
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
        {errorAccion && <div className={styles.actionError} role="alert">{errorAccion}</div>}
        <div className={styles.filtros}>
          {(["TODOS", "ACTIVE", "ACKNOWLEDGED", "RESOLVED"] as const).map(f => (
            <button
              key={f}
              onClick={() => cambiarFiltro(() => setFiltro(f))}
              className={`${styles.filtroBtn} ${filtro === f ? styles.filtroBtnActive : ""}`}
            >
              {f === "TODOS" ? "Todas" : f === "ACTIVE" ? "Activas" : f === "ACKNOWLEDGED" ? "Reconocidas" : "Resueltas"}
            </button>
          ))}
        </div>

        <div className={styles.filtroDetalle}>
          <label className={styles.busquedaWrap}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={busqueda}
              onChange={e => cambiarFiltro(() => setBusqueda(e.target.value))}
              placeholder="Buscar por sensor, zona o descripción"
              aria-label="Buscar alertas"
            />
          </label>
          <label className={styles.nivelSelectWrap}>
            <span>Severidad</span>
            <select value={filtroNivel} onChange={e => cambiarFiltro(() => setFiltroNivel(e.target.value))} aria-label="Filtrar por severidad">
              <option value="TODOS">Todas</option>
              <option value="WARNING">Advertencia</option>
              <option value="CRITICAL">Crítica</option>
              <option value="CATASTROPHIC">Catastrófica</option>
            </select>
          </label>
          <label className={styles.nivelSelectWrap}><span>Zona</span><select value={zonaId} onChange={e => cambiarFiltro(() => setZonaId(e.target.value))}>
            <option value="">Todas</option>{zonas.map(z => <option key={z.id_node} value={z.id_node}>{z.name} · {z.node_type}</option>)}
          </select></label>
          <label className={styles.nivelSelectWrap}><span>Desde</span><input type="date" value={desde} onChange={e => cambiarFiltro(() => setDesde(e.target.value))}/></label>
          <label className={styles.nivelSelectWrap}><span>Hasta</span><input type="date" value={hasta} onChange={e => cambiarFiltro(() => setHasta(e.target.value))}/></label>
          <span className={styles.resultadosFiltro}>{pagina.total} alertas en total</span>
        </div>

        {/* Lista de alertas */}
        <div className={styles.alertasList}>
          {errorCarga && alertas.length === 0 ? (
            <div className={styles.empty}>
              <p>No se pudieron cargar las alertas.</p>
              <button className={styles.filtroBtn} onClick={cargarAlertas}>Reintentar</button>
            </div>
          ) : cargando ? (
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
                    {puedeOperar && a.status !== "RESOLVED" && (
                      <div className={styles.alertaAcciones}>
                        {a.status === "ACTIVE" && <button
                          className={styles.btnReconocer}
                          onClick={() => reconocer(a.id_alert)}
                          disabled={accionando === a.id_alert}
                        >
                          {accionando === a.id_alert ? "…" : "✓ Reconocer"}
                        </button>}
                        <button
                          className={styles.btnEvacuar}
                          onClick={() => evacuar(a.id_alert)}
                          disabled={accionando === a.id_alert}
                        >
                          {accionando === a.id_alert ? "…" : "↗ Iniciar evacuación"}
                        </button>
                        {a.status === "ACKNOWLEDGED" && <button
                          className={styles.btnReconocer}
                          onClick={() => resolver(a.id_alert)}
                          disabled={accionando === a.id_alert}
                        >
                          {accionando === a.id_alert ? "…" : "✓ Resolver alerta"}
                        </button>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.filtros} aria-label="Paginación">
          <button className={styles.filtroBtn} disabled={pagina.page <= 1} onClick={() => setPagina(p => ({ ...p, page: p.page - 1 }))}>← Anterior</button>
          <span className={styles.resultadosFiltro}>Página {pagina.page} / {Math.max(1, pagina.totalPages)}</span>
          <button className={styles.filtroBtn} disabled={pagina.page >= pagina.totalPages} onClick={() => setPagina(p => ({ ...p, page: p.page + 1 }))}>Siguiente →</button>
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
                <div className={styles.planAlertaId}>Plan iniciado para la alerta #{planAlertaId}. La alerta permanece reconocida hasta que un operador la resuelva.</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
