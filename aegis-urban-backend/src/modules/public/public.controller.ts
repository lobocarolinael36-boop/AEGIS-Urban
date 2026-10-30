import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../config/database";
import { AppError } from "../../shared/errors/AppError";
import { evaluarRiesgo, radioPorAlerta, ZonaRiesgo } from "../../core/geo/riesgo";
import { obtenerClima, avisosDesdeClima, Aviso } from "./clima.service";

/**
 * Endpoints públicos de solo lectura para ciudadanos (sin login).
 * No exponen datos internos: ni usuarios, ni bitácora, ni acciones de gestión.
 */
const router = Router();

// Buenos Aires: ubicación por defecto cuando el ciudadano no comparte la suya.
const DEFECTO = { lat: -34.6037, lon: -58.3816 };
const VENTANA_ALERTAS_HORAS = 6;

// ── Límite simple por IP (60 req/min) para proteger la API pública y la externa.
const visitas = new Map<string, { n: number; reinicia: number }>();
function limitar(req: Request, _res: Response, next: NextFunction) {
  const ip = req.ip ?? "?";
  const ahora = Date.now();
  const v = visitas.get(ip);
  if (!v || v.reinicia < ahora) visitas.set(ip, { n: 1, reinicia: ahora + 60_000 });
  else if (++v.n > 60) return next(new AppError("Demasiadas solicitudes, intentá en un minuto", 429));
  next();
}
router.use(limitar);

function validarCoordenadas(rawLat: unknown, rawLon: unknown): { lat: number; lon: number } {
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (rawLat === undefined || rawLon === undefined || rawLat === null || rawLon === null ||
      !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new AppError("Coordenadas inválidas", 400);
  }
  return { lat, lon };
}

/** Clima y avisos usan coordenadas aproximadas (query string, ~1 km); sin ellas, Buenos Aires. */
function leerCoordenadas(req: Request): { lat: number; lon: number } {
  if (req.query.lat === undefined && req.query.lon === undefined) return DEFECTO;
  return validarCoordenadas(req.query.lat, req.query.lon);
}

const ETIQUETA_TIPO: Record<string, string> = {
  FLOOD: "Inundación", FIRE: "Incendio", WIND: "Viento fuerte",
  POWER_OUT: "Corte de energía", AIR_QUALITY: "Calidad del aire",
};

interface FilaAlerta {
  id_alert: number; level: ZonaRiesgo["nivel"]; alert_type: string; message: string | null;
  created_at: string; lat: string | null; lon: string | null; zona: string;
}

/** Última alerta vigente por sensor dentro de la ventana de tiempo. */
async function alertasVigentes(): Promise<FilaAlerta[]> {
  const { rows } = await db.consultar<FilaAlerta>(`
    SELECT DISTINCT ON (a.id_sensor) a.id_alert, a.level, a.alert_type, a.message, a.created_at,
           s.lat, s.lon, cn.name AS zona
      FROM alert a
      JOIN sensor s ON s.id_sensor = a.id_sensor
      JOIN city_node cn ON cn.id_node = s.id_city_node
     WHERE a.status IN ('ACTIVE', 'ACKNOWLEDGED')
       AND a.created_at > NOW() - make_interval(hours => $1)
     ORDER BY a.id_sensor, a.created_at DESC`, [VENTANA_ALERTAS_HORAS]);
  return rows;
}

async function zonasDeRiesgo(): Promise<ZonaRiesgo[]> {
  const zonas: ZonaRiesgo[] = [];
  for (const a of await alertasVigentes()) {
    if (a.lat === null || a.lon === null) continue;
    zonas.push({
      id: a.id_alert,
      nombre: a.zona,
      tipo: ETIQUETA_TIPO[a.alert_type] ?? a.alert_type,
      nivel: a.level,
      lat: Number(a.lat),
      lon: Number(a.lon),
      radioM: radioPorAlerta(a.level, a.alert_type),
    });
  }
  return zonas;
}

// GET /api/publico/clima?lat=&lon=
router.get("/clima", async (req: Request, res: Response) => {
  const { lat, lon } = leerCoordenadas(req);
  const clima = await obtenerClima(lat, lon);
  res.json({ disponible: clima !== null, lat, lon, fuente: "Open-Meteo", clima });
});

// GET /api/publico/zonas — zonas de riesgo vigentes (para dibujar en el mapa)
router.get("/zonas", async (_req: Request, res: Response) => {
  res.json({ zonas: await zonasDeRiesgo() });
});

// GET /api/publico/avisos?lat=&lon= — avisos reales (clima) + simulados (sensores)
router.get("/avisos", async (req: Request, res: Response) => {
  const { lat, lon } = leerCoordenadas(req);
  const [clima, alertas] = await Promise.all([obtenerClima(lat, lon), alertasVigentes()]);
  const avisos: Aviso[] = clima ? avisosDesdeClima(clima) : [];
  for (const a of alertas) {
    avisos.push({
      id: `sim-${a.id_alert}`,
      origen: "simulado",
      tipo: a.alert_type,
      nivel: a.level === "WARNING" ? "WARNING" : "CRITICAL",
      titulo: `${ETIQUETA_TIPO[a.alert_type] ?? a.alert_type} en ${a.zona}`,
      detalle: a.message ?? "Alerta detectada por sensores de la ciudad.",
      zona: a.zona,
      fecha: new Date(a.created_at).toISOString(),
    });
  }
  const peso = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;
  avisos.sort((x, y) => peso[x.nivel] - peso[y.nivel] || y.fecha.localeCompare(x.fecha));
  res.json({ avisos, climaDisponible: clima !== null });
});

// POST /api/publico/riesgo — ¿estoy cerca de una zona de peligro?
// Es POST a propósito: la ubicación exacta viaja en el cuerpo y no queda en los logs de acceso (URL).
// No se guarda: se usa solo para este cálculo.
router.post("/riesgo", async (req: Request, res: Response) => {
  const { lat, lon } = validarCoordenadas(req.body?.lat, req.body?.lon);
  res.json({ ...evaluarRiesgo(lat, lon, await zonasDeRiesgo()) });
});

export default router;
