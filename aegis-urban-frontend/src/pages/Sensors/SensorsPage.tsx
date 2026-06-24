import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import { useWebSocket } from "../../hooks/useWebSocket";
import api from "../../services/api";
import styles from "./SensorsPage.module.css";

interface Sensor {
  id_sensor:        number;
  serial_code:      string;
  sensor_type_code: string;
  sensor_unit:      string;
  city_node_name:   string;
  status:           string;
  lat:              number;
  lon:              number;
  is_simulated:     boolean;
  last_value:       number | null;
  last_status:      string | null;
  last_reading_at:  string | null;
}

const TIPO_ICON: Record<string, string> = {
  FLOOD:       "💧",
  FIRE:        "🔥",
  WIND:        "💨",
  AIR_QUALITY: "🌫",
};

const TIPO_LABEL: Record<string, string> = {
  FLOOD:       "Inundación",
  FIRE:        "Incendio",
  WIND:        "Viento",
  AIR_QUALITY: "Calidad Aire",
};

function badgeEstado(estado: string | null) {
  if (!estado) return "ok";
  return estado.toLowerCase();
}

export default function SensorsPage() {
  const { conectado, ultimaLectura } = useWebSocket();
  const [sensores, setSensores]      = useState<Sensor[]>([]);
  const [cargando, setCargando]      = useState(true);
  const [filtroTipo, setFiltroTipo]  = useState<string>("TODOS");
  const [simulando, setSimulando]    = useState<number | null>(null);
  const [flash, setFlash]            = useState<Set<number>>(new Set());

  const cargarSensores = useCallback(async () => {
    try {
      const res = await api.get<{ sensores: Sensor[] }>("/sensores");
      setSensores(res.data.sensores);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarSensores(); }, [cargarSensores]);

  // Actualiza el sensor que recibió la lectura vía WebSocket
  useEffect(() => {
    if (!ultimaLectura) return;
    setSensores(prev => prev.map(s =>
      s.id_sensor === ultimaLectura.idSensor
        ? { ...s, last_value: ultimaLectura.valor, last_status: ultimaLectura.estadoLectura, last_reading_at: ultimaLectura.registradaEn }
        : s
    ));
    setFlash(prev => new Set(prev).add(ultimaLectura.idSensor));
    setTimeout(() => setFlash(prev => {
      const next = new Set(prev);
      next.delete(ultimaLectura.idSensor);
      return next;
    }), 1500);
  }, [ultimaLectura]);

  const simular = async (id: number) => {
    setSimulando(id);
    try {
      await api.post(`/sensores/${id}/simular`);
    } finally {
      setSimulando(null);
    }
  };

  const tipos = ["TODOS", "FLOOD", "FIRE", "WIND", "AIR_QUALITY"];
  const filtrados = filtroTipo === "TODOS"
    ? sensores
    : sensores.filter(s => s.sensor_type_code === filtroTipo);

  const resumen = {
    ok:       sensores.filter(s => !s.last_status || s.last_status === "OK").length,
    warning:  sensores.filter(s => s.last_status === "WARNING").length,
    critical: sensores.filter(s => s.last_status === "CRITICAL").length,
  };

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Sensores</h1>
            <p className={styles.subtitle}>Red de sensores IoT — datos en tiempo real vía WebSocket</p>
          </div>
          <div className={styles.topbarRight}>
            <span className={`${styles.wsBadge} ${conectado ? styles.wsOn : styles.wsOff}`}>
              {conectado ? "● LIVE" : "○ offline"}
            </span>
            <button onClick={cargarSensores} className={styles.refreshBtn} title="Actualizar">↻</button>
          </div>
        </header>

        {/* Resumen */}
        <div className={styles.resumenGrid}>
          <div className={`${styles.resumenCard} ${styles["resumenCard--ok"]}`}>
            <span className={styles.resumenVal}>{resumen.ok}</span>
            <span className={styles.resumenLabel}>Normales</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--warning"]}`}>
            <span className={styles.resumenVal}>{resumen.warning}</span>
            <span className={styles.resumenLabel}>Advertencia</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--critical"]}`}>
            <span className={styles.resumenVal}>{resumen.critical}</span>
            <span className={styles.resumenLabel}>Críticos</span>
          </div>
          <div className={`${styles.resumenCard} ${styles["resumenCard--total"]}`}>
            <span className={styles.resumenVal}>{sensores.length}</span>
            <span className={styles.resumenLabel}>Total</span>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.filtros}>
          {tipos.map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`${styles.filtroBtn} ${filtroTipo === t ? styles.filtroBtnActive : ""}`}
            >
              {t === "TODOS" ? "Todos" : `${TIPO_ICON[t]} ${TIPO_LABEL[t]}`}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className={styles.panelWrap}>
          {cargando ? (
            <div className={styles.loading}>Cargando sensores…</div>
          ) : (
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Serial</th>
                  <th>Distrito</th>
                  <th>Estado</th>
                  <th>Última Lectura</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(s => (
                  <tr key={s.id_sensor} className={flash.has(s.id_sensor) ? styles.flashRow : ""}>
                    <td>
                      <span className={styles.tipoChip}>
                        {TIPO_ICON[s.sensor_type_code]} {TIPO_LABEL[s.sensor_type_code] ?? s.sensor_type_code}
                      </span>
                    </td>
                    <td className={styles.monoCell}>{s.serial_code}</td>
                    <td>{s.city_node_name}</td>
                    <td>
                      <span className={`${styles.estadoBadge} ${styles[`estadoBadge--${badgeEstado(s.last_status)}`]}`}>
                        {s.last_status ?? "SIN DATOS"}
                      </span>
                    </td>
                    <td className={styles.lecturaCell}>
                      {s.last_value != null ? (
                        <>
                          <span className={styles.lecturaVal}>{parseFloat(String(s.last_value)).toFixed(1)}</span>
                          <span className={styles.lecturaUnit}> {s.sensor_unit}</span>
                        </>
                      ) : "—"}
                    </td>
                    <td>
                      <button
                        className={styles.simularBtn}
                        onClick={() => simular(s.id_sensor)}
                        disabled={simulando === s.id_sensor}
                        title="Forzar lectura simulada"
                      >
                        {simulando === s.id_sensor ? "…" : "⚡ Simular"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
