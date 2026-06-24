// ── EventBus — Singleton Observer ─────────────────────────────────────────────
// Desacopla productores (telemetría, auth) de consumidores (alertas, bitácora, WS).

type ManejadorEvento<T = unknown> = (datos: T) => void | Promise<void>;

export class EventBus {
  private static instancia: EventBus;
  private oyentes = new Map<string, ManejadorEvento[]>();

  private constructor() {}

  static obtenerInstancia(): EventBus {
    if (!EventBus.instancia) {
      EventBus.instancia = new EventBus();
    }
    return EventBus.instancia;
  }

  suscribir<T>(evento: string, manejador: ManejadorEvento<T>): void {
    if (!this.oyentes.has(evento)) {
      this.oyentes.set(evento, []);
    }
    this.oyentes.get(evento)!.push(manejador as ManejadorEvento);
  }

  desuscribir<T>(evento: string, manejador: ManejadorEvento<T>): void {
    const lista = this.oyentes.get(evento);
    if (!lista) return;
    this.oyentes.set(evento, lista.filter(h => h !== manejador));
  }

  async emitir<T>(evento: string, datos: T): Promise<void> {
    const lista = this.oyentes.get(evento) ?? [];
    await Promise.all(lista.map(h => h(datos)));
  }
}

export const eventBus = EventBus.obtenerInstancia();

// ── Eventos del sistema (constantes para evitar typos) ────────────────────────
export const EVENTOS = {
  LECTURA_NUEVA:        "lectura:nueva",
  ALERTA_CREADA:        "alerta:creada",
  ALERTA_ACTUALIZADA:   "alerta:actualizada",
  EVACUACION_INICIADA:  "evacuacion:iniciada",
  SESION_INICIADA:      "sesion:iniciada",
  SESION_CERRADA:       "sesion:cerrada",
} as const;
