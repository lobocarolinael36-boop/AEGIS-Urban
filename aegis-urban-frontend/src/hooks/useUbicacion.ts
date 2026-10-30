import { useEffect, useState } from "react";

export interface Posicion { lat: number; lon: number; precisionM: number | null }
export type EstadoGps = "inactivo" | "buscando" | "activo" | "denegado" | "no-soportado" | "error";

/**
 * Sigue la ubicación del dispositivo SOLO si `habilitado` (consentimiento expreso).
 * Al deshabilitarse se detiene el seguimiento y se descarta la posición.
 */
export function useUbicacion(habilitado: boolean) {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [estado, setEstado] = useState<EstadoGps>("inactivo");

  useEffect(() => {
    if (!habilitado) { setPosicion(null); setEstado("inactivo"); return; }
    if (!("geolocation" in navigator)) { setEstado("no-soportado"); return; }

    setEstado("buscando");
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPosicion({ lat: p.coords.latitude, lon: p.coords.longitude, precisionM: p.coords.accuracy ?? null });
        setEstado("activo");
      },
      (e) => setEstado(e.code === e.PERMISSION_DENIED ? "denegado" : "error"),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [habilitado]);

  return { posicion, estado };
}
