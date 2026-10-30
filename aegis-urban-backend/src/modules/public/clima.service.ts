/**
 * Clima real vía Open-Meteo (gratuito, sin clave de API).
 * Se cachea por ubicación para no saturar la API externa.
 */

export interface ClimaActual {
  temperaturaC:   number;
  sensacionC:     number;
  precipitacionMm: number;
  vientoKmh:      number;
  rafagasKmh:     number;
  codigo:         number;
  descripcion:    string;
  aqi:            number | null;
  pm25:           number | null;
  actualizado:    string;
}

export type TipoAviso = "HEAT" | "COLD" | "WIND" | "RAIN" | "STORM" | "AIR_QUALITY" | "FOG" | "SNOW";

export interface Aviso {
  id:        string;
  origen:    "real" | "simulado";
  tipo:      TipoAviso | string;
  nivel:     "INFO" | "WARNING" | "CRITICAL";
  titulo:    string;
  detalle:   string;
  zona?:     string;
  fecha:     string;
}

const TTL_MS = 10 * 60_000;
const cache = new Map<string, { expira: number; valor: ClimaActual | null }>();

/** Códigos WMO de Open-Meteo → texto en español. */
export function describirCodigo(codigo: number): string {
  if (codigo === 0) return "Despejado";
  if (codigo <= 2) return "Parcialmente nublado";
  if (codigo === 3) return "Nublado";
  if (codigo === 45 || codigo === 48) return "Niebla";
  if (codigo >= 51 && codigo <= 57) return "Llovizna";
  if (codigo >= 61 && codigo <= 67) return "Lluvia";
  if (codigo >= 71 && codigo <= 77) return "Nieve";
  if (codigo >= 80 && codigo <= 82) return "Chubascos";
  if (codigo === 85 || codigo === 86) return "Chubascos de nieve";
  if (codigo >= 95) return "Tormenta eléctrica";
  return "Variable";
}

async function pedirJson(url: string): Promise<any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function obtenerClima(lat: number, lon: number): Promise<ClimaActual | null> {
  const clave = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(clave);
  if (hit && hit.expira > Date.now()) return hit.valor;

  try {
    const [meteo, aire] = await Promise.all([
      pedirJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,wind_gusts_10m,weather_code&timezone=auto`),
      pedirJson(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
        `&current=us_aqi,pm2_5&timezone=auto`).catch(() => null),
    ]);
    const c = meteo.current;
    const valor: ClimaActual = {
      temperaturaC:    c.temperature_2m,
      sensacionC:      c.apparent_temperature,
      precipitacionMm: c.precipitation,
      vientoKmh:       c.wind_speed_10m,
      rafagasKmh:      c.wind_gusts_10m,
      codigo:          c.weather_code,
      descripcion:     describirCodigo(c.weather_code),
      aqi:             aire?.current?.us_aqi ?? null,
      pm25:            aire?.current?.pm2_5 ?? null,
      actualizado:     new Date().toISOString(),
    };
    cache.set(clave, { expira: Date.now() + TTL_MS, valor });
    return valor;
  } catch {
    // Si la API externa falla, devuelve el último dato conocido (aunque esté vencido) o null.
    if (hit) return hit.valor;
    cache.set(clave, { expira: Date.now() + 60_000, valor: null });
    return null;
  }
}

/** Convierte el clima real en avisos para ciudadanos. Función pura. */
export function avisosDesdeClima(c: ClimaActual, ahora = new Date()): Aviso[] {
  const fecha = ahora.toISOString();
  const avisos: Aviso[] = [];
  const add = (tipo: TipoAviso, nivel: Aviso["nivel"], titulo: string, detalle: string) =>
    avisos.push({ id: `clima-${tipo}`, origen: "real", tipo, nivel, titulo, detalle, fecha });

  if (c.codigo >= 95) add("STORM", "CRITICAL", "Tormenta eléctrica", "Buscá refugio en un lugar cerrado y evitá árboles y zonas abiertas.");
  if (c.sensacionC >= 38) add("HEAT", "CRITICAL", "Calor extremo", `Sensación térmica de ${Math.round(c.sensacionC)} °C. Hidratate y evitá el sol entre 11 y 17 h.`);
  else if (c.sensacionC >= 33) add("HEAT", "WARNING", "Calor intenso", `Sensación térmica de ${Math.round(c.sensacionC)} °C. Tomá agua y buscá sombra.`);
  if (c.sensacionC <= 0) add("COLD", "CRITICAL", "Frío extremo", `Sensación térmica de ${Math.round(c.sensacionC)} °C. Abrigate y evitá exponerte.`);
  else if (c.sensacionC <= 5) add("COLD", "WARNING", "Frío intenso", `Sensación térmica de ${Math.round(c.sensacionC)} °C. Abrigate bien.`);
  if (c.rafagasKmh >= 80) add("WIND", "CRITICAL", "Ráfagas muy fuertes", `Ráfagas de ${Math.round(c.rafagasKmh)} km/h. Alejate de árboles, carteles y cables.`);
  else if (c.rafagasKmh >= 50) add("WIND", "WARNING", "Viento fuerte", `Ráfagas de ${Math.round(c.rafagasKmh)} km/h. Asegurá objetos sueltos.`);
  if (c.precipitacionMm >= 10) add("RAIN", "CRITICAL", "Lluvia intensa", `${c.precipitacionMm} mm en la última hora. Riesgo de anegamientos: evitá zonas bajas.`);
  else if (c.precipitacionMm >= 2.5) add("RAIN", "WARNING", "Lluvia moderada", `${c.precipitacionMm} mm en la última hora. Manejá con precaución.`);
  if (c.aqi !== null && c.aqi >= 150) add("AIR_QUALITY", "CRITICAL", "Mala calidad del aire", `Índice AQI ${c.aqi}. Evitá actividad física al aire libre.`);
  else if (c.aqi !== null && c.aqi >= 100) add("AIR_QUALITY", "WARNING", "Calidad del aire regular", `Índice AQI ${c.aqi}. Personas sensibles deben limitar el esfuerzo al aire libre.`);
  if (c.codigo === 45 || c.codigo === 48) add("FOG", "WARNING", "Niebla", "Visibilidad reducida. Usá luces bajas y reducí la velocidad.");
  if (c.codigo >= 71 && c.codigo <= 77) add("SNOW", "WARNING", "Nevadas", "Calzadas resbaladizas. Evitá viajes innecesarios.");

  return avisos;
}
