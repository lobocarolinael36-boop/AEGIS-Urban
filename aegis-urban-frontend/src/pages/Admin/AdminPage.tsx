import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import api from "../../services/api";
import styles from "./AdminPage.module.css";

interface Usuario {
  id_user:     number;
  username:    string;
  email:       string;
  is_active:   boolean;
  created_at:  string;
  last_login:  string | null;
  family_name: string;
}

interface Familia {
  id_family:      number;
  name:           string;
  description:    string | null;
  is_active:      boolean;
  created_at:     string;
  total_usuarios: number;
}

interface EntradaBitacora {
  id_log:      string;
  action:      string;
  entity_name: string;
  entity_id:   string;
  id_user:     number | null;
  ip_address:  string;
  created_at:  string;
}

interface ResultadoIntegridad {
  esValida:     boolean;
  filaCorrupta: string | null;
  motivo:       string;
  totalFilas:   number;
}

type Tab = "usuarios" | "familias" | "bitacora" | "integridad";

const ACCION_LABEL: Record<string, string> = {
  USER_LOGIN:               "Sesión iniciada",
  USER_LOGOUT:              "Sesión cerrada",
  SENSOR_READING_ANOMALY:   "Anomalía",
  ALERT_CREATED:            "Alerta creada",
  EVACUATION_INITIATED:     "Evacuación",
};

export default function AdminPage() {
  const [tab, setTab]             = useState<Tab>("usuarios");
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [familias, setFamilias]   = useState<Familia[]>([]);
  const [bitacora, setBitacora]   = useState<EntradaBitacora[]>([]);
  const [integridad, setIntegridad] = useState<ResultadoIntegridad | null>(null);
  const [cargando, setCargando]   = useState(false);
  const [verificando, setVerificando] = useState(false);

  const cargarTab = useCallback(async (t: Tab) => {
    setCargando(true);
    try {
      if (t === "usuarios") {
        const res = await api.get<{ usuarios: Usuario[] }>("/admin/usuarios");
        setUsuarios(res.data.usuarios);
      } else if (t === "familias") {
        const res = await api.get<{ familias: Familia[] }>("/admin/familias");
        setFamilias(res.data.familias);
      } else if (t === "bitacora") {
        const res = await api.get<{ entradas: EntradaBitacora[] }>("/admin/bitacora?limite=30");
        setBitacora(res.data.entradas);
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarTab(tab); }, [tab, cargarTab]);

  const verificarIntegridad = async () => {
    setVerificando(true);
    try {
      const res = await api.get<{ integridad: ResultadoIntegridad }>("/admin/integridad");
      setIntegridad(res.data.integridad);
      setTab("integridad");
    } finally {
      setVerificando(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "usuarios",   label: "Usuarios" },
    { id: "familias",   label: "Familias" },
    { id: "bitacora",   label: "Bitácora" },
    { id: "integridad", label: "Integridad DVH/DVV" },
  ];

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Administración</h1>
            <p className={styles.subtitle}>Gestión de usuarios, familias y verificación de integridad DVH/DVV</p>
          </div>
          <button
            className={styles.btnIntegridad}
            onClick={verificarIntegridad}
            disabled={verificando}
          >
            {verificando ? "Verificando…" : "🔐 Verificar Integridad"}
          </button>
        </header>

        {/* Tabs */}
        <div className={styles.tabRow}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Usuarios */}
        {tab === "usuarios" && (
          <div className={styles.panelWrap}>
            {cargando ? <div className={styles.loading}>Cargando…</div> : (
              <table className={styles.tabla}>
                <thead><tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Familia</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                </tr></thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id_user}>
                      <td className={styles.mono}>#{u.id_user}</td>
                      <td className={styles.negrita}>{u.username}</td>
                      <td className={styles.muted}>{u.email}</td>
                      <td>{u.family_name}</td>
                      <td>
                        <span className={`${styles.estadoBadge} ${u.is_active ? styles["estadoBadge--activo"] : styles["estadoBadge--inactivo"]}`}>
                          {u.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className={styles.mono}>
                        {u.last_login
                          ? new Date(u.last_login).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Familias */}
        {tab === "familias" && (
          <div className={styles.panelWrap}>
            {cargando ? <div className={styles.loading}>Cargando…</div> : (
              <table className={styles.tabla}>
                <thead><tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Usuarios</th>
                  <th>Creada</th>
                </tr></thead>
                <tbody>
                  {familias.map(f => (
                    <tr key={f.id_family}>
                      <td className={styles.mono}>#{f.id_family}</td>
                      <td className={styles.negrita}>{f.name}</td>
                      <td className={styles.muted}>{f.description ?? "—"}</td>
                      <td>
                        <span className={styles.usuariosBadge}>{f.total_usuarios}</span>
                      </td>
                      <td className={styles.mono}>
                        {new Date(f.created_at).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Bitácora */}
        {tab === "bitacora" && (
          <div className={styles.panelWrap}>
            {cargando ? <div className={styles.loading}>Cargando…</div> : (
              <table className={styles.tabla}>
                <thead><tr>
                  <th>#Log</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>ID</th>
                  <th>IP</th>
                  <th>Fecha</th>
                </tr></thead>
                <tbody>
                  {bitacora.map(e => (
                    <tr key={e.id_log}>
                      <td className={styles.mono}>{e.id_log}</td>
                      <td>
                        <span className={`${styles.actTag} ${styles[`actTag--${e.action}`]}`}>
                          {ACCION_LABEL[e.action] ?? e.action}
                        </span>
                      </td>
                      <td className={styles.muted}>{e.entity_name}</td>
                      <td className={styles.mono}>{e.entity_id}</td>
                      <td className={styles.mono}>{e.ip_address}</td>
                      <td className={styles.mono}>
                        {new Date(e.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Integridad */}
        {tab === "integridad" && (
          <div className={styles.integridadPanel}>
            {!integridad ? (
              <div className={styles.integridadEmpty}>
                <p>Hacé clic en <strong>"Verificar Integridad"</strong> para recalcular DVH + DVV de todos los registros del audit log.</p>
                <p className={styles.integridadDesc}>
                  El sistema recorre cada fila de <code>audit_log</code>, recalcula el hash individual (DVH)
                  y el hash encadenado (DVV), y compara con los valores almacenados.
                  Cualquier fila alterada queda identificada.
                </p>
              </div>
            ) : (
              <>
                <div className={`${styles.integridadResultado} ${integridad.esValida ? styles["integridadResultado--ok"] : styles["integridadResultado--error"]}`}>
                  <span className={styles.integridadIcon}>{integridad.esValida ? "✓" : "✗"}</span>
                  <div>
                    <div className={styles.integridadVeredicto}>
                      {integridad.esValida ? "Integridad VÁLIDA" : "Integridad COMPROMETIDA"}
                    </div>
                    <div className={styles.integridadSub}>
                      {integridad.totalFilas} filas analizadas
                      {integridad.filaCorrupta
                        ? ` — fila #${integridad.filaCorrupta} comprometida`
                        : " — sin alteraciones detectadas"}
                    </div>
                  </div>
                </div>

                <div className={styles.integridadMeta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Total de filas</span>
                    <span className={styles.metaVal}>{integridad.totalFilas}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Resultado</span>
                    <span className={styles.metaVal}>{integridad.motivo}</span>
                  </div>
                  {integridad.filaCorrupta && (
                    <div className={styles.metaRow}>
                      <span className={styles.metaKey}>Fila corrupta</span>
                      <span className={`${styles.metaVal} ${styles["metaVal--danger"]}`}>
                        #{integridad.filaCorrupta}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.integridadDesc}>
                  <p>
                    Cada fila tiene un <strong>DVH</strong> (hash SHA-256 de sus propios campos)
                    y un <strong>DVV</strong> (hash encadenado que incluye el DVV de la fila anterior).
                    Si cualquier campo de una fila es alterado — incluso por superusuario — el DVH cambia
                    y rompe toda la cadena DVV a partir de esa fila.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
