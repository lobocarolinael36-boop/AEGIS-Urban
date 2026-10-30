/**
 * Cálculo de cercanía a zonas de peligro a partir de la ubicación del usuario.
 * Funciones puras (sin I/O) para poder testearlas sin base de datos.
 */

export type EstadoRiesgo = "SEGURO" | "PRECAUCION" | "PELIGRO";

export interface ZonaRiesgo {
  id:        number;
  nombre:    string;
  tipo:      string;
  nivel:     "WARNING" | "CRITICAL" | "CATASTROPHIC";
  lat:       number;
  lon:       number;
  radioM:    number;
}

export interface EvaluacionRiesgo {
  estado:      EstadoRiesgo;
  zona:        ZonaRiesgo | null;
  distanciaM:  number | null;
  /** Rumbo en grados (0 = norte) hacia el cual conviene alejarse. */
  rumboAlejarse: number | null;
  direccion:   string | null;
  mensaje:     string;
}

const RADIO_TIERRA_M = 6_371_000;
const aRad = (g: number) => (g * Math.PI) / 180;

/** Distancia entre dos coordenadas en metros (fórmula de haversine). */
export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = aRad(lat2 - lat1);
  const dLon = aRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(a));
}

/** Rumbo inicial (0–360°, 0 = norte) del punto 1 al punto 2. */
export function rumbo(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(aRad(lon2 - lon1)) * Math.cos(aRad(lat2));
  const x = Math.cos(aRad(lat1)) * Math.sin(aRad(lat2)) -
    Math.sin(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.cos(aRad(lon2 - lon1));
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

const PUNTOS_CARDINALES = ["norte", "noreste", "este", "sureste", "sur", "suroeste", "oeste", "noroeste"];
export function nombreRumbo(grados: number): string {
  return PUNTOS_CARDINALES[Math.round((((grados % 360) + 360) % 360) / 45) % 8];
}

/** Radio de peligro según severidad y tipo de evento. */
export function radioPorAlerta(nivel: ZonaRiesgo["nivel"], tipo: string): number {
  const base = nivel === "WARNING" ? 800 : nivel === "CRITICAL" ? 1500 : 2500;
  return tipo === "FIRE" ? Math.round(base * 1.5) : base;
}

/** Margen extra, como fracción del radio, en el que se avisa "precaución". */
const MARGEN_PRECAUCION = 0.6;

export function evaluarRiesgo(lat: number, lon: number, zonas: ZonaRiesgo[]): EvaluacionRiesgo {
  let peor: { zona: ZonaRiesgo; distancia: number; estado: EstadoRiesgo; gravedad: number } | null = null;

  for (const zona of zonas) {
    const distancia = distanciaMetros(lat, lon, zona.lat, zona.lon);
    let estado: EstadoRiesgo = "SEGURO";
    if (distancia <= zona.radioM) estado = zona.nivel === "WARNING" ? "PRECAUCION" : "PELIGRO";
    else if (distancia <= zona.radioM * (1 + MARGEN_PRECAUCION)) estado = "PRECAUCION";
    if (estado === "SEGURO") continue;

    // Prioriza PELIGRO sobre PRECAUCION y, a igual estado, la zona más cercana al borde.
    const gravedad = (estado === "PELIGRO" ? 1_000_000 : 0) - distancia;
    if (!peor || gravedad > peor.gravedad) peor = { zona, distancia, estado, gravedad };
  }

  if (!peor) {
    return { estado: "SEGURO", zona: null, distanciaM: null, rumboAlejarse: null, direccion: null,
      mensaje: "No hay zonas de peligro cerca de tu ubicación." };
  }

  const { zona, distancia, estado } = peor;
  const metros = Math.round(distancia);
  // Alejarse = rumbo desde el centro de la zona hacia el usuario (si está justo en el centro, norte).
  const rumboAlejarse = metros < 5 ? 0 : rumbo(zona.lat, zona.lon, lat, lon);
  const direccion = nombreRumbo(rumboAlejarse);
  const dentro = distancia <= zona.radioM;

  const mensaje = estado === "PELIGRO"
    ? `⚠ Estás en una zona peligrosa (${zona.nombre}, ${zona.tipo}). Alejate hacia el ${direccion}.`
    : dentro
      ? `Precaución: hay una alerta en ${zona.nombre}. Evitá la zona y alejate hacia el ${direccion}.`
      : `Precaución: estás a ${metros} m de una zona de riesgo (${zona.nombre}). No te acerques.`;

  return { estado, zona, distanciaM: metros, rumboAlejarse: Math.round(rumboAlejarse), direccion, mensaje };
}
