import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../../context/AuthContext";
import { useAuthStore } from "../../store/authStore";
import { useUbicacionStore } from "../../store/ubicacionStore";
import { useUbicacion } from "../../hooks/useUbicacion";
import DangerOverlay from "../../components/DangerOverlay/DangerOverlay";
import { CONSENTIMIENTO_UBICACION } from "../../legal/textos";
import { publicoApi, type Aviso, type Clima, type EvaluacionRiesgo, type ZonaRiesgo } from "../../services/publico";
import styles from "./CitizenPage.module.css";

const BUENOS_AIRES = { lat: -34.6037, lon: -58.3816 };
const COLOR_NIVEL = { WARNING: "#FFB020", CRITICAL: "#FF4D6D", CATASTROPHIC: "#FF2D55" } as const;
const ETIQUETA_TIPO: Record<string, string> = {
  HEAT: "Calor", COLD: "Frío", WIND: "Viento", RAIN: "Lluvia", STORM: "Tormenta", AIR_QUALITY: "Aire",
  FOG: "Niebla", SNOW: "Nieve", FLOOD: "Inundación", FIRE: "Incendio", POWER_OUT: "Energía",
};

interface PosicionPrueba { lat: number; lon: number; etiqueta: string }
const METROS_POR_GRADO = 111_320;

export default function CitizenPage() {
  const { cerrarSesion } = useAuth();
  const { autenticado, usuario } = useAuthStore();
  const { consentida, notificaciones, fijarConsentimiento, fijarNotificaciones } = useUbicacionStore();

  const [prueba, setPrueba] = useState<PosicionPrueba | null>(null);
  const { posicion: gps, estado: estadoGps } = useUbicacion(consentida === true && !prueba);
  const posicion = prueba ?? gps;

  const [clima, setClima] = useState<Clima | null>(null);
  const [climaOk, setClimaOk] = useState(true);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [zonas, setZonas] = useState<ZonaRiesgo[]>([]);
  const [evaluacion, setEvaluacion] = useState<EvaluacionRiesgo | null>(null);
  const [descartado, setDescartado] = useState<{ id: number; hasta: number } | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const lat = posicion?.lat ?? BUENOS_AIRES.lat;
  const lon = posicion?.lon ?? BUENOS_AIRES.lon;
  // El clima y los avisos solo necesitan una posición aproximada (~1 km).
  const latAprox = Math.round(lat * 100) / 100;
  const lonAprox = Math.round(lon * 100) / 100;

  // ── Carga periódica de clima, avisos y zonas
  const cargar = useCallback(async () => {
    const [c, a, z] = await Promise.allSettled([
      publicoApi.clima(latAprox, lonAprox), publicoApi.avisos(latAprox, lonAprox), publicoApi.zonas(),
    ]);
    if (c.status === "fulfilled") { setClima(c.value.clima); setClimaOk(c.value.disponible); }
    if (a.status === "fulfilled") setAvisos(a.value.avisos);
    if (z.status === "fulfilled") setZonas(z.value);
  }, [latAprox, lonAprox]);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), 30_000);
    return () => clearInterval(id);
  }, [cargar]);

  // ── Evaluación de riesgo según la ubicación (solo si hay posición consentida o de prueba)
  const evaluar = useCallback(async () => {
    if (!posicion) { setEvaluacion(null); return; }
    try { setEvaluacion(await publicoApi.riesgo(posicion.lat, posicion.lon)); } catch { /* reintenta en el próximo ciclo */ }
  }, [posicion]);

  useEffect(() => {
    void evaluar();
    const id = setInterval(() => void evaluar(), 15_000);
    return () => clearInterval(id);
  }, [evaluar]);

  // ── Notificaciones del navegador: avisos críticos nuevos y entrada a zona de peligro
  const vistos = useRef<Set<string> | null>(null);
  const estadoPrevio = useRef<string>("SEGURO");

  const notificar = useCallback((titulo: string, cuerpo: string) => {
    if (notificaciones && "Notification" in window && Notification.permission === "granted") {
      new Notification(titulo, { body: cuerpo, tag: titulo });
    }
  }, [notificaciones]);

  useEffect(() => {
    const criticos = avisos.filter((a) => a.nivel === "CRITICAL");
    if (vistos.current === null) { vistos.current = new Set(criticos.map((a) => a.id)); return; }
    for (const a of criticos) {
      if (!vistos.current.has(a.id)) { vistos.current.add(a.id); notificar(`AEGIS: ${a.titulo}`, a.detalle); }
    }
  }, [avisos, notificar]);

  useEffect(() => {
    const estado = evaluacion?.estado ?? "SEGURO";
    if (estado === "PELIGRO" && estadoPrevio.current !== "PELIGRO") notificar("¡Estás en una zona peligrosa!", evaluacion?.mensaje ?? "");
    estadoPrevio.current = estado;
  }, [evaluacion, notificar]);

  // ── Consentimiento de ubicación (se guarda en el servidor si hay cuenta)
  async function decidirUbicacion(acepta: boolean) {
    fijarConsentimiento(acepta);
    if (!acepta) setPrueba(null);
    if (autenticado) { try { await publicoApi.fijarUbicacion(acepta); } catch { /* queda local */ } }
  }

  async function activarNotificaciones() {
    if (!("Notification" in window)) { setMensaje("Tu navegador no soporta notificaciones."); return; }
    const permiso = await Notification.requestPermission();
    fijarNotificaciones(permiso === "granted");
    setMensaje(permiso === "granted" ? "Notificaciones activadas." : "No se activaron las notificaciones (permiso denegado).");
  }

  // ── Modo prueba: ubicarse en/cerca de una zona sin moverse
  function probar(zona: ZonaRiesgo, donde: "dentro" | "cerca" | "lejos") {
    const grados = (m: number) => m / METROS_POR_GRADO;
    const desplazamiento = donde === "dentro" ? 100 : donde === "cerca" ? zona.radioM * 1.3 : zona.radioM * 6;
    setPrueba({ lat: zona.lat + grados(desplazamiento), lon: zona.lon, etiqueta: `${donde} de ${zona.nombre}` });
    setDescartado(null);
  }

  // ── Mapa
  const contenedorMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capa = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!contenedorMapa.current || mapa.current) return;
    const m = L.map(contenedorMapa.current, { zoomControl: true }).setView([BUENOS_AIRES.lat, BUENOS_AIRES.lon], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(m);
    capa.current = L.layerGroup().addTo(m);
    mapa.current = m;
    return () => { m.remove(); mapa.current = null; };
  }, []);

  const centradoEnUsuario = useRef(false);
  useEffect(() => {
    if (!mapa.current || !capa.current) return;
    capa.current.clearLayers();
    for (const z of zonas) {
      L.circle([z.lat, z.lon], { radius: z.radioM, color: COLOR_NIVEL[z.nivel], fillOpacity: 0.18, weight: 2 })
        .bindPopup(`<strong>${z.tipo}</strong><br/>${z.nombre}`).addTo(capa.current);
    }
    if (posicion) {
      L.circleMarker([posicion.lat, posicion.lon], { radius: 8, color: "#fff", weight: 2, fillColor: "#22E5FF", fillOpacity: 1 })
        .bindTooltip("Vos").addTo(capa.current);
      if (!centradoEnUsuario.current || prueba) { mapa.current.setView([posicion.lat, posicion.lon], 14); centradoEnUsuario.current = true; }
    }
  }, [zonas, posicion, prueba]);

  const mostrarCartel = evaluacion?.estado === "PELIGRO" && evaluacion.zona &&
    !(descartado && descartado.id === evaluacion.zona.id && Date.now() < descartado.hasta);

  const resumen = useMemo(() => ({
    criticos: avisos.filter((a) => a.nivel === "CRITICAL").length,
    total: avisos.length,
  }), [avisos]);

  // ── Derechos del titular (Ley 25.326)
  async function descargarDatos() {
    try {
      const datos = await publicoApi.misDatos();
      const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = "mis-datos-aegis.json"; a.click();
      URL.revokeObjectURL(url);
    } catch { setMensaje("No se pudieron descargar tus datos."); }
  }

  async function eliminarCuenta() {
    if (!window.confirm("¿Dar de baja tu cuenta? Se anonimizarán tus datos personales y no podrás volver a entrar con ella.")) return;
    try { await publicoApi.darDeBaja(); await cerrarSesion(); } catch { setMensaje("No se pudo dar de baja la cuenta."); }
  }

  const esStaff = autenticado && usuario?.familia !== "CIUDADANO";

  return (
    <div className={styles.page}>
      {mostrarCartel && evaluacion && (
        <DangerOverlay evaluacion={evaluacion}
          onEntendido={() => setDescartado({ id: evaluacion.zona!.id, hasta: Date.now() + 3 * 60_000 })} />
      )}

      <header className={styles.top}>
        <div>
          <p className={styles.kicker}>AEGIS URBAN · CIUDADANO</p>
          <h1>Clima y zonas de riesgo</h1>
        </div>
        <nav className={styles.nav}>
          {autenticado
            ? <>{esStaff && <Link to="/dashboard">Panel de gestión</Link>}<button onClick={() => void cerrarSesion()}>Cerrar sesión</button></>
            : <><Link to="/login">Ingresar</Link><Link to="/registro" className={styles.cta}>Crear cuenta</Link></>}
        </nav>
      </header>

      {mensaje && <p className={styles.mensaje} role="status" onClick={() => setMensaje(null)}>{mensaje}</p>}

      {/* ── Estado de riesgo en la ubicación */}
      {evaluacion && evaluacion.estado !== "SEGURO" && (
        <section className={`${styles.estado} ${evaluacion.estado === "PELIGRO" ? styles.peligro : styles.precaucion}`} role="alert">
          <strong>{evaluacion.estado === "PELIGRO" ? "ZONA PELIGROSA" : "PRECAUCIÓN"}</strong>
          <span>{evaluacion.mensaje}</span>
        </section>
      )}
      {evaluacion?.estado === "SEGURO" && posicion && (
        <section className={`${styles.estado} ${styles.seguro}`}><strong>SEGURO</strong><span>{evaluacion.mensaje}</span></section>
      )}

      {/* ── Consentimiento de ubicación */}
      {consentida === null && (
        <section className={styles.consent}>
          <h2>¿Querés que te avisemos si estás cerca de una zona de peligro?</h2>
          <ul>{CONSENTIMIENTO_UBICACION.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className={styles.legalMini}>
            Al permitirlo aceptás el uso de tu ubicación según la <Link to="/privacidad">Política de Privacidad</Link> (Ley 25.326).
          </p>
          <div className={styles.acciones}>
            <button className={styles.primario} onClick={() => void decidirUbicacion(true)}>Permitir ubicación</button>
            <button className={styles.secundario} onClick={() => void decidirUbicacion(false)}>Ahora no</button>
          </div>
        </section>
      )}

      <div className={styles.grid}>
        {/* ── Clima real */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Clima ahora</h2>
            <span className={styles.chipReal}>REAL · Open-Meteo</span>
          </div>
          {clima ? (
            <>
              <div className={styles.temp}>{Math.round(clima.temperaturaC)}°<small>{clima.descripcion}</small></div>
              <dl className={styles.datos}>
                <div><dt>Sensación</dt><dd>{Math.round(clima.sensacionC)}°</dd></div>
                <div><dt>Viento</dt><dd>{Math.round(clima.vientoKmh)} km/h</dd></div>
                <div><dt>Ráfagas</dt><dd>{Math.round(clima.rafagasKmh)} km/h</dd></div>
                <div><dt>Lluvia</dt><dd>{clima.precipitacionMm} mm</dd></div>
                <div><dt>Aire (AQI)</dt><dd>{clima.aqi ?? "—"}</dd></div>
              </dl>
            </>
          ) : <p className={styles.vacio}>{climaOk ? "Cargando clima…" : "El servicio de clima no está disponible por el momento."}</p>}
          <p className={styles.nota}>Ubicación: {posicion ? (prueba ? `modo prueba (${prueba.etiqueta})` : "tu dispositivo") : "Buenos Aires (por defecto)"}</p>
        </section>

        {/* ── Ubicación y notificaciones */}
        <section className={styles.card}>
          <div className={styles.cardHead}><h2>Mi ubicación</h2></div>
          {consentida === true && (
            <>
              <p className={styles.nota}>
                Estado del GPS: <strong>{{ inactivo: "inactivo", buscando: "buscando señal…", activo: "activo", denegado: "bloqueado por el navegador", "no-soportado": "no soportado", error: "sin señal" }[estadoGps]}</strong>
              </p>
              {estadoGps === "denegado" && <p className={styles.mensajeChico}>Habilitá la ubicación en la configuración del navegador (candado junto a la dirección).</p>}
              <button className={styles.secundario} onClick={() => void decidirUbicacion(false)}>Revocar permiso de ubicación</button>
            </>
          )}
          {consentida === false && (
            <>
              <p className={styles.nota}>No estás compartiendo tu ubicación.</p>
              <button className={styles.primario} onClick={() => void decidirUbicacion(true)}>Permitir ubicación</button>
            </>
          )}
          {consentida === null && <p className={styles.nota}>Respondé la pregunta de arriba para activar los avisos por ubicación.</p>}
          <button className={styles.secundario} onClick={() => void activarNotificaciones()} disabled={notificaciones}>
            {notificaciones ? "Notificaciones activadas ✓" : "Activar notificaciones del navegador"}
          </button>
        </section>
      </div>

      {/* ── Mapa */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Mapa de zonas de riesgo</h2>
          <span className={styles.chipSim}>{zonas.length} zona(s) activa(s)</span>
        </div>
        <div ref={contenedorMapa} className={styles.mapa} />
      </section>

      {/* ── Avisos */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Avisos</h2>
          <span className={styles.nota}>{resumen.total} en total · {resumen.criticos} críticos</span>
        </div>
        {avisos.length === 0 ? <p className={styles.vacio}>Sin avisos por el momento. ¡Todo tranquilo!</p> : (
          <ul className={styles.avisos}>
            {avisos.map((a) => (
              <li key={a.id} className={`${styles.aviso} ${styles[`nivel${a.nivel}`]}`}>
                <div className={styles.avisoHead}>
                  <strong>{a.titulo}</strong>
                  <span className={a.origen === "real" ? styles.chipReal : styles.chipSim}>{a.origen === "real" ? "REAL" : "SIMULADO"}</span>
                </div>
                <p>{a.detalle}</p>
                <small>{ETIQUETA_TIPO[a.tipo] ?? a.tipo} · {new Date(a.fecha).toLocaleString("es-AR")}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Modo prueba */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Modo prueba</h2>
          {prueba && <button className={styles.secundario} onClick={() => setPrueba(null)}>Salir del modo prueba</button>}
        </div>
        <p className={styles.nota}>Simulá tu posición respecto de una zona de riesgo para ver el cartel de peligro sin moverte. Se crean zonas iniciando un escenario desde el panel de Simulación.</p>
        {zonas.length === 0 ? <p className={styles.vacio}>No hay zonas de riesgo activas ahora.</p> : (
          <ul className={styles.pruebas}>
            {zonas.map((z) => (
              <li key={z.id}>
                <span>{z.tipo} · {z.nombre}</span>
                <div>
                  <button onClick={() => probar(z, "dentro")}>Dentro</button>
                  <button onClick={() => probar(z, "cerca")}>Cerca</button>
                  <button onClick={() => probar(z, "lejos")}>Lejos</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Mis datos */}
      {autenticado && usuario?.familia === "CIUDADANO" && (
        <section className={styles.card}>
          <div className={styles.cardHead}><h2>Mis datos</h2></div>
          <p className={styles.nota}>Cuenta: <strong>{usuario.username}</strong> · perfil verificado</p>
          <div className={styles.acciones}>
            <button className={styles.secundario} onClick={() => void descargarDatos()}>Descargar mis datos</button>
            <button className={styles.peligroBtn} onClick={() => void eliminarCuenta()}>Dar de baja mi cuenta</button>
          </div>
        </section>
      )}

      <footer className={styles.pie}>
        <Link to="/terminos">Términos y Condiciones</Link>
        <Link to="/privacidad">Política de Privacidad</Link>
        <span>Información orientativa. En una emergencia llamá al 911.</span>
      </footer>
    </div>
  );
}
