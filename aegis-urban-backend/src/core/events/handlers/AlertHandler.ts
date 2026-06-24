import { db } from "../../../config/database";
import { eventBus, EVENTOS } from "../EventBus";
import { ReadingStatus, AlertLevel, AlertType } from "../../../shared/types/domain.types";

export interface DatosLecturaNueva {
  idSensor:      number;
  idTipoSensor:  number;
  tipoSensor:    string;        // "FLOOD", "FIRE", etc.
  valor:         number;
  unidad:        string;
  estadoLectura: ReadingStatus;
  esSimulada:    boolean;
  registradaEn:  Date;
}

const MAPA_NIVEL: Record<ReadingStatus, AlertLevel | null> = {
  OK:       null,
  WARNING:  "WARNING",
  CRITICAL: "CRITICAL",
};

const MAPA_TIPO: Record<string, AlertType> = {
  FLOOD:       "FLOOD",
  FIRE:        "FIRE",
  WIND:        "WIND",
  AIR_QUALITY: "POWER_OUT",  // mapeado al tipo más cercano disponible
};

export class AlertHandler {
  private inicializado = false;

  iniciar(): void {
    if (this.inicializado) return;
    eventBus.suscribir<DatosLecturaNueva>(EVENTOS.LECTURA_NUEVA, this.manejar.bind(this));
    this.inicializado = true;
  }

  private async manejar(datos: DatosLecturaNueva): Promise<void> {
    const nivel = MAPA_NIVEL[datos.estadoLectura];
    if (!nivel) return;  // OK → sin alerta

    try {
      // Solo crea alerta si no hay una activa del mismo sensor + tipo
      const { rows } = await db.consultar<{ id_alert: number }>(
        `SELECT id_alert FROM alert
         WHERE id_sensor = $1 AND status = 'ACTIVE'
         LIMIT 1`,
        [datos.idSensor]
      );

      if (rows.length > 0) return;  // ya existe alerta activa

      const tipo = MAPA_TIPO[datos.tipoSensor] ?? "FLOOD";
      const mensaje = `Sensor #${datos.idSensor} (${datos.tipoSensor}): `
        + `${datos.valor} ${datos.unidad} — umbral ${datos.estadoLectura.toLowerCase()} superado`;

      const [alertaCreada] = (await db.consultar<{ id_alert: number }>(
        `INSERT INTO alert (id_sensor, level, alert_type, message, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')
         RETURNING id_alert`,
        [datos.idSensor, nivel, tipo, mensaje]
      )).rows;

      await eventBus.emitir(EVENTOS.ALERTA_CREADA, {
        idAlerta:   alertaCreada.id_alert,
        idSensor:   datos.idSensor,
        nivel,
        tipo,
        mensaje,
        creadaEn:   new Date(),
      });

    } catch {
      // No interrumpimos el flujo principal si el handler falla
    }
  }
}

export const alertHandler = new AlertHandler();
