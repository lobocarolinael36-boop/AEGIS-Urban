import React, { useEffect, useState, useCallback, useRef } from "react";
import Sidebar from "../../components/Layout/Sidebar";
import { useWebSocket } from "../../hooks/useWebSocket";
import api from "../../services/api";
import styles from "./SimulationPage.module.css";

interface Sensor {
  id_sensor:        number;
  serial_code:      string;
  sensor_type_code: string;
  sensor_unit:      string;
  city_node_name:   string;
  last_value:       number | null;
  last_status:      string | null;
}

interface RespuestaSimulacion {
  mensaje: string;
  tipo:    string;
  valor:   number;
}

interface ResultadoSimulacion {
  idSensor: number;
  tipo:     string;
  valor:    number;
}

const TIPO_ICON: Record<string, string> = {
  FLOOD: "💧", FIRE: "🔥", WIND: "💨", AIR_QUALITY: "🌫",
};

const ESTRATEGIAS = [
  {
    nombre: "EstrategiaZonal",
    patron: "Strategy",
    nivel: "HIGH / CRITICAL",
    icono: "🏘",
    personas: "800",
    radio: "500m",
    color: "high",
    descripcion: "Evacúa sólo la zona de 500m de radio alrededor del sensor afectado. Minimiza el impacto en el resto de la ciudad.",
    instrucciones: ["Acordonar perímetro 500m", "Evacuar edificios del radio", "Activar refugios cercanos", "Notificar a equipos de respuesta"],
  },
  {
    nombre: "EstraategiaMasiva",
    patron: "Strategy",
    nivel: "CRITICAL (FIRE/FLOOD)",
    icono: "🏙",
    personas: "45.000",
    radio: "Distrito",
    color: "critical",
    descripcion: "Evacuación de todo el distrito. Activa cuando la crisis supera la capacidad zonal y requiere coordinación inter-barrial.",
    instrucciones: ["Activar protocolo ciudad completa", "Coordinar transporte público", "Abrir todos los refugios del distrito", "Activar cadena de mando municipal"],
  },
  {
    nombre: "EstrategiaRefugio",
    patron: "Strategy",
    nivel: "LOW / MEDIUM",
    icono: "🏠",
    personas: "0 (in situ)",
    radio: "—",
    color: "safe",
    descripcion: "Refugio en el lugar. Para crisis de calidad de aire o viento, las personas permanecen en interiores con ventanas selladas.",
    instrucciones: ["Cerrar ventanas y puertas", "Apagar ventilación", "Esperar instrucciones oficiales", "Monitorear valores cada 5 min"],
  },
];

export default function SimulationPage() {
  const { conectado, ultimaLectura } = useWebSocket();
  const [sensores, setSensores]       = useState<Sensor[]>([]);
  const [simulando, setSimulando]     = useState<number | "todos" | null>(null);
  const [resultados, setResultados]   = useState<ResultadoSimulacion[]>([]);
  const [ciclo, setCiclo]             = useState(0);
  const [countdown, setCountdown]     = useState(15);
  const countdownRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargarSensores = useCallback(async () => {
    try {
      const res = await api.get<{ sensores: Sensor[] }>("/sensores");
      setSensores(res.data.sensores);
    } catch { /* silencioso — muestra lista vacía */ }
  }, []);

  useEffect(() => { cargarSensores(); }, [cargarSensores]);

  // Countdown del motor (cada 15s el backend ejecuta un ciclo)
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCiclo(c => c + 1);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  // Cuando llega una lectura WS, reinicia el countdown visual
  useEffect(() => {
    if (ultimaLectura) {
      setCountdown(15);
      setCiclo(c => c + 1);
    }
  }, [ultimaLectura]);

  const simularSensor = async (id: number) => {
    setSimulando(id);
    try {
      const res = await api.post<RespuestaSimulacion>(`/sensores/${id}/simular`);
      setResultados(prev => [{ idSensor: id, tipo: res.data.tipo, valor: res.data.valor }, ...prev.slice(0, 19)]);
    } finally {
      setSimulando(null);
    }
  };

  const simularTodos = async () => {
    setSimulando("todos");
    const resultadosBatch: ResultadoSimulacion[] = [];
    for (const s of sensores) {
      try {
        const res = await api.post<RespuestaSimulacion>(`/sensores/${s.id_sensor}/simular`);
        resultadosBatch.push({ idSensor: s.id_sensor, tipo: res.data.tipo, valor: res.data.valor });
      } catch { /* continúa con el siguiente */ }
    }
    setResultados(prev => [...resultadosBatch, ...prev].slice(0, 20));
    setSimulando(null);
  };

  const pct = ((15 - countdown) / 15) * 100;

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>Motor de Simulación</h1>
            <p className={styles.subtitle}>Mocking Engine — genera telemetría sintética para todos los sensores SIMULATED</p>
          </div>
          <span className={`${styles.wsBadge} ${conectado ? styles.wsOn : styles.wsOff}`}>
            {conectado ? "● LIVE" : "○ offline"}
          </span>
        </header>

        {/* Panel del motor */}
        <div className={styles.motorPanel}>
          <div className={styles.motorStatus}>
            <div className={styles.motorDot} />
            <span className={styles.motorLabel}>Motor activo</span>
            <span className={styles.motorCiclo}>ciclo #{ciclo}</span>
          </div>
          <div className={styles.countdownWrap}>
            <div className={styles.countdownBar}>
              <div className={styles.countdownFill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.countdownNum}>{countdown}s hasta próximo ciclo</span>
          </div>
          <button
            className={styles.btnTodos}
            onClick={simularTodos}
            disabled={simulando !== null}
          >
            {simulando === "todos" ? "Simulando todos…" : "⚡ Simular todos los sensores ahora"}
          </button>
        </div>

        <div className={styles.columnas}>
          {/* Tabla de sensores */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Sensores SIMULATED</h2>
              <span className={styles.panelBadge}>{sensores.length}</span>
            </div>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Serial</th>
                  <th>Último valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sensores.map(s => (
                  <tr key={s.id_sensor}>
                    <td>{TIPO_ICON[s.sensor_type_code]} {s.sensor_type_code}</td>
                    <td className={styles.mono}>{s.serial_code}</td>
                    <td className={styles.mono}>
                      {s.last_value != null
                        ? <span className={`${styles.val} ${styles[`val--${(s.last_status ?? "ok").toLowerCase()}`]}`}>{parseFloat(String(s.last_value)).toFixed(1)} {s.sensor_unit}</span>
                        : <span className={styles.muted}>—</span>}
                    </td>
                    <td>
                      <button
                        className={styles.btnSimular}
                        onClick={() => simularSensor(s.id_sensor)}
                        disabled={simulando !== null}
                      >
                        {simulando === s.id_sensor ? "…" : "▶"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Log de simulaciones manuales */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Log de simulaciones</h2>
              <span className={styles.panelBadge}>{resultados.length}</span>
            </div>
            {resultados.length === 0 ? (
              <div className={styles.logEmpty}>Presioná ▶ en un sensor o "Simular todos" para ver resultados aquí.</div>
            ) : (
              <ul className={styles.logList}>
                {resultados.map((r, i) => (
                  <li key={i} className={styles.logItem}>
                    <span className={styles.logIcon}>{TIPO_ICON[r.tipo] ?? "📡"}</span>
                    <span className={styles.logSensor}>Sensor #{r.idSensor}</span>
                    <span className={styles.logTipo}>{r.tipo}</span>
                    <span className={styles.logValor}>{typeof r.valor === "number" ? r.valor.toFixed(1) : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Estrategias */}
        <div className={styles.estrategiasSection}>
          <h2 className={styles.seccionTitle}>Patrón Strategy — Estrategias de Evacuación</h2>
          <p className={styles.seccionDesc}>
            El <code>ContextoEvacuacion</code> selecciona automáticamente la estrategia según nivel y tipo de alerta.
            Cada clase implementa la interfaz <code>IEstrategiaEvacuacion</code>.
          </p>
          <div className={styles.estrategiasGrid}>
            {ESTRATEGIAS.map(e => (
              <div key={e.nombre} className={`${styles.estrategiaCard} ${styles[`estrategiaCard--${e.color}`]}`}>
                <div className={styles.estrategiaHeader}>
                  <span className={styles.estrategiaIcon}>{e.icono}</span>
                  <div>
                    <div className={styles.estrategiaNombre}>{e.nombre}</div>
                    <div className={styles.estrategiaPatron}>«{e.patron}»</div>
                  </div>
                </div>
                <div className={styles.estrategiaMeta}>
                  <span className={styles.metaChip}>Nivel: {e.nivel}</span>
                  <span className={styles.metaChip}>Personas: {e.personas}</span>
                  <span className={styles.metaChip}>Radio: {e.radio}</span>
                </div>
                <p className={styles.estrategiaDesc}>{e.descripcion}</p>
                <ul className={styles.estrategiaInst}>
                  {e.instrucciones.map((inst, i) => <li key={i}>{inst}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
