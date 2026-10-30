import api from "./api";

export interface Clima {
  temperaturaC: number; sensacionC: number; precipitacionMm: number;
  vientoKmh: number; rafagasKmh: number; codigo: number; descripcion: string;
  aqi: number | null; pm25: number | null; actualizado: string;
}

export interface Aviso {
  id: string; origen: "real" | "simulado"; tipo: string;
  nivel: "INFO" | "WARNING" | "CRITICAL"; titulo: string; detalle: string; zona?: string; fecha: string;
}

export interface ZonaRiesgo {
  id: number; nombre: string; tipo: string; nivel: "WARNING" | "CRITICAL" | "CATASTROPHIC";
  lat: number; lon: number; radioM: number;
}

export type EstadoRiesgo = "SEGURO" | "PRECAUCION" | "PELIGRO";

export interface EvaluacionRiesgo {
  estado: EstadoRiesgo; zona: ZonaRiesgo | null; distanciaM: number | null;
  rumboAlejarse: number | null; direccion: string | null; mensaje: string;
}

export interface Consentimiento { consent_type: string; version: string; granted: boolean; created_at: string }
export interface MisDatos {
  perfil: { id_user: number; username: string; email: string; created_at: string; terms_verified_at: string | null; familia: string };
  ubicacionConsentida: boolean;
  consentimientos: Consentimiento[];
}

/** Redondea a 2 decimales (~1 km): el clima no necesita la posición exacta. */
export const aproximar = (n: number) => Math.round(n * 100) / 100;

export const publicoApi = {
  clima: (lat?: number, lon?: number) =>
    api.get<{ disponible: boolean; clima: Clima | null }>("/publico/clima", { params: coords(lat, lon) }).then(r => r.data),
  avisos: (lat?: number, lon?: number) =>
    api.get<{ avisos: Aviso[]; climaDisponible: boolean }>("/publico/avisos", { params: coords(lat, lon) }).then(r => r.data),
  zonas: () => api.get<{ zonas: ZonaRiesgo[] }>("/publico/zonas").then(r => r.data.zonas),
  // POST: la ubicación exacta va en el cuerpo, no en la URL (no queda en logs de acceso).
  riesgo: (lat: number, lon: number) =>
    api.post<EvaluacionRiesgo>("/publico/riesgo", { lat, lon }).then(r => r.data),
  misDatos: () => api.get<MisDatos>("/auth/mis-datos").then(r => r.data),
  darDeBaja: () => api.delete("/auth/mis-datos").then(r => r.data),
  fijarUbicacion: (acepta: boolean) => api.put("/auth/consentimiento-ubicacion", { acepta }).then(r => r.data),
};

function coords(lat?: number, lon?: number) {
  return lat === undefined || lon === undefined ? undefined : { lat: aproximar(lat), lon: aproximar(lon) };
}
