import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "../../components/Layout/Sidebar";
import { useWebSocket, LecturaTelemetria } from "../../hooks/useWebSocket";
import api from "../../services/api";
import styles from "./CityMapPage.module.css";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadowUrl });

interface SensorMapa {
  id_sensor:        number;
  serial_code:      string;
  sensor_type_code: string;
  city_node_name:   string;
  status:           string;
  lat:              number;
  lon:              number;
  last_value?:      number;
  last_status?:     "OK" | "WARNING" | "CRITICAL";
  last_reading_at?: string;
  sensor_unit:      string;
}

interface LecturaSensor {
  value: number;
  unit: string | null;
  reading_status: string;
  is_simulated: boolean;
  recorded_at: string;
}

const COLOR_ESTADO: Record<string, string> = {
  OK:       "#19f5a0",
  WARNING:  "#ffb020",
  CRITICAL: "#ff4d6d",
  default:  "#22e5ff",
};

const ICONO_TIPO: Record<string, string> = {
  FLOOD:       "💧",
  FIRE:        "🔥",
  WIND:        "💨",
  AIR_QUALITY: "🌫",
};

function crearIconoSensor(estado?: string): L.DivIcon {
  const color = COLOR_ESTADO[estado ?? "default"] ?? COLOR_ESTADO.default;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2px solid rgba(255,255,255,0.7);
      box-shadow:0 0 6px ${color};
    "></div>`,
    iconSize:   [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function CityMapPage() {
  const { t }                  = useTranslation();
  const { conectado, ultimaLectura } = useWebSocket();
  const mapRef                 = useRef<HTMLDivElement>(null);
  const leafletRef             = useRef<L.Map | null>(null);
  const marcadoresRef          = useRef<Map<number, L.Marker>>(new Map());

  const [sensores, setSensores]     = useState<SensorMapa[]>([]);
  const [seleccionado, setSeleccionado] = useState<SensorMapa | null>(null);
  const [historial, setHistorial] = useState<LecturaSensor[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState(false);
  const [errorSensores, setErrorSensores] = useState(false);

  // Carga sensores desde la API
  const cargarSensores = useCallback(async () => {
    setErrorSensores(false);
    try {
      const respuesta = await api.get<{ sensores: SensorMapa[] }>("/sensores");
      setSensores(respuesta.data.sensores);
    } catch {
      setErrorSensores(true);
    }
  }, []);

  useEffect(() => {
    cargarSensores();
  }, [cargarSensores]);

  useEffect(() => {
    if (!seleccionado) {
      setHistorial([]);
      return;
    }
    let vigente = true;
    setCargandoHistorial(true);
    setErrorHistorial(false);
    api.get<{ lecturas: LecturaSensor[] }>(`/sensores/${seleccionado.id_sensor}/lecturas`)
      .then(r => { if (vigente) setHistorial(r.data.lecturas.slice(0, 6)); })
      .catch(() => { if (vigente) setErrorHistorial(true); })
      .finally(() => { if (vigente) setCargandoHistorial(false); });
    return () => { vigente = false; };
  }, [seleccionado?.id_sensor]);

  // Inicializa Leaflet
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    const map = L.map(mapRef.current, {
      center: [-34.6037, -58.3816],
      zoom:   13,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      className:   styles.darkTile,
    }).addTo(map);
    leafletRef.current = map;
    return () => { map.remove(); leafletRef.current = null; };
  }, []);

  // Pone / actualiza marcadores cuando llegan los sensores
  useEffect(() => {
    const map = leafletRef.current;
    if (!map || sensores.length === 0) return;

    sensores.forEach(sensor => {
      const icono = crearIconoSensor(sensor.last_status);
      const popup = `
        <div style="font-family:monospace;font-size:12px;min-width:160px">
          <strong>${ICONO_TIPO[sensor.sensor_type_code] ?? "📍"} ${sensor.serial_code}</strong><br>
          <span style="color:#94a3b8">${sensor.city_node_name} · ${sensor.sensor_type_code}</span><br>
          ${sensor.last_value != null
            ? `<span style="color:${COLOR_ESTADO[sensor.last_status ?? "default"]}">
                ${sensor.last_value} ${sensor.sensor_unit}
               </span>`
            : `<span style="color:#94a3b8">Sin lecturas aún</span>`
          }
        </div>`;

      const existente = marcadoresRef.current.get(sensor.id_sensor);
      if (existente) {
        existente.setIcon(icono);
        existente.setPopupContent(popup);
        existente.off("click").on("click", () => setSeleccionado(sensor));
      } else {
        const m = L.marker([sensor.lat, sensor.lon], { icon: icono })
          .addTo(map)
          .bindPopup(popup)
          .on("click", () => setSeleccionado(sensor));
        marcadoresRef.current.set(sensor.id_sensor, m);
      }
    });
  }, [sensores]);

  // Actualiza marcador en tiempo real cuando llega lectura WebSocket
  useEffect(() => {
    if (!ultimaLectura) return;
    const lr = ultimaLectura as LecturaTelemetria;
    const marker = marcadoresRef.current.get(lr.idSensor);
    if (marker) {
      marker.setIcon(crearIconoSensor(lr.estadoLectura));
      marker.setPopupContent(`
        <div style="font-family:monospace;font-size:12px">
          <strong>${lr.tipoSensor} #${lr.idSensor}</strong><br>
          <span style="color:${COLOR_ESTADO[lr.estadoLectura]}">
            ${lr.valor} ${lr.unidad} — ${lr.estadoLectura}
          </span>
        </div>`);
    }
    // Actualiza estado local también
    setSensores(prev => prev.map(s =>
      s.id_sensor === lr.idSensor
        ? { ...s, last_value: lr.valor, last_status: lr.estadoLectura, last_reading_at: lr.registradaEn }
        : s
    ));
  }, [ultimaLectura]);

  useEffect(() => {
    if (!ultimaLectura || seleccionado?.id_sensor !== ultimaLectura.idSensor) return;
    setSeleccionado(prev => prev ? {
      ...prev,
      last_value: ultimaLectura.valor,
      last_status: ultimaLectura.estadoLectura,
      last_reading_at: ultimaLectura.registradaEn,
    } : prev);
    setHistorial(prev => [{
      value: ultimaLectura.valor,
      unit: ultimaLectura.unidad,
      reading_status: ultimaLectura.estadoLectura,
      is_simulated: ultimaLectura.esSimulada,
      recorded_at: ultimaLectura.registradaEn,
    }, ...prev.filter(item => item.recorded_at !== ultimaLectura.registradaEn)].slice(0, 6));
  }, [ultimaLectura, seleccionado?.id_sensor]);

  const contadores = sensores.reduce(
    (acc, s) => {
      acc[s.last_status ?? "OK"] = (acc[s.last_status ?? "OK"] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className={styles.page}>
      <Sidebar />

      <div className={styles.mapLayout}>
        {/* ── Topbar del mapa */}
        <header className={styles.mapHeader}>
          <div>
            <h1 className={styles.mapTitle}>{t("nav.cityMap")}</h1>
            <p className={styles.mapSub}>Ciudad AEGIS — Buenos Aires</p>
          </div>
          <div className={styles.mapStats}>
            <span className={styles.statBadge} style={{ color: "#19f5a0" }}>
              ● {contadores.OK ?? 0} OK
            </span>
            <span className={styles.statBadge} style={{ color: "#ffb020" }}>
              ▲ {contadores.WARNING ?? 0} WARNING
            </span>
            <span className={styles.statBadge} style={{ color: "#ff4d6d" }}>
              ■ {contadores.CRITICAL ?? 0} CRITICAL
            </span>
            <span className={`${styles.wsBadge} ${conectado ? styles.wsOn : styles.wsOff}`}>
              {conectado ? "● LIVE" : "○ offline"}
            </span>
          </div>
        </header>

        {/* ── Mapa */}
        <div className={styles.mapWrapper}>
          <div ref={mapRef} className={styles.map} />

          {errorSensores && <div className={styles.mapMessage} role="alert">
            <strong>No se pudo cargar la red de sensores.</strong>
            <span>El mapa base sigue disponible; los marcadores pueden estar incompletos.</span>
            <button onClick={cargarSensores}>Reintentar</button>
          </div>}

          {/* Panel lateral con sensor seleccionado */}
          {seleccionado && (
            <div className={styles.sensorPanel}>
              <button className={styles.cerrarPanel} onClick={() => setSeleccionado(null)}>✕</button>
              <h3>{ICONO_TIPO[seleccionado.sensor_type_code]} {seleccionado.serial_code}</h3>
              <p className={styles.sensorNodo}>{seleccionado.city_node_name}</p>
              <div className={styles.sensorInfo}>
                <span>Tipo</span>
                <span>{seleccionado.sensor_type_code}</span>
                <span>Estado</span>
                <span style={{ color: COLOR_ESTADO[seleccionado.last_status ?? "default"] }}>
                  {seleccionado.last_status ?? "—"}
                </span>
                <span>Último valor</span>
                <span>
                  {seleccionado.last_value != null
                    ? `${seleccionado.last_value} ${seleccionado.sensor_unit}`
                    : "—"}
                </span>
                <span>Última lectura</span>
                <span>{seleccionado.last_reading_at
                  ? new Date(seleccionado.last_reading_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
                  : "Sin datos"}</span>
              </div>
              <section className={styles.historialSection} aria-label="Lecturas recientes del sensor">
                <div className={styles.historialHeader}>
                  <strong>Últimas 24 h</strong>
                  <span>{historial.length} lecturas</span>
                </div>
                {cargandoHistorial ? <p className={styles.historialEmpty}>Cargando lecturas…</p>
                  : errorHistorial ? <p className={styles.historialEmpty}>No se pudo cargar el historial.</p>
                  : historial.length === 0 ? <p className={styles.historialEmpty}>Sin lecturas recientes.</p>
                  : <ol className={styles.historialList}>{historial.map((lectura, i) => (
                    <li key={`${lectura.recorded_at}-${i}`}>
                      <span className={styles.historialValor}>{Number(lectura.value).toFixed(1)} {lectura.unit ?? seleccionado.sensor_unit}</span>
                      <span className={styles.historialMeta}>{new Date(lectura.recorded_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} · {lectura.reading_status}{lectura.is_simulated ? " · SIM" : ""}</span>
                    </li>
                  ))}</ol>}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
