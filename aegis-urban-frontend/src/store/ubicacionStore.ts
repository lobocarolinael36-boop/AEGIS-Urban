import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Consentimiento de ubicación del dispositivo.
 *  null  = todavía no se le preguntó
 *  true  = dio su consentimiento expreso
 *  false = lo rechazó o lo revocó
 * Solo guardamos la decisión, nunca las coordenadas.
 */
interface EstadoUbicacion {
  consentida: boolean | null;
  notificaciones: boolean;
  fijarConsentimiento: (valor: boolean) => void;
  fijarNotificaciones: (valor: boolean) => void;
}

export const useUbicacionStore = create<EstadoUbicacion>()(
  persist(
    (set) => ({
      consentida: null,
      notificaciones: false,
      fijarConsentimiento: (consentida) => set({ consentida }),
      fijarNotificaciones: (notificaciones) => set({ notificaciones }),
    }),
    { name: "aegis-ubicacion" },
  ),
);
