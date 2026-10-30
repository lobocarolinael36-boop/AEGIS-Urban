import { db } from "../../../config/database";
import { eventBus, EVENTOS } from "../EventBus";
import { ReadingStatus, AlertLevel, AlertType } from "../../../shared/types/domain.types";
import { bitacora } from "../../../integrity/BitacoraService";

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
  AIR_QUALITY: "AIR_QUALITY",
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

    const tipo = MAPA_TIPO[datos.tipoSensor] ?? "FLOOD";
    const mensaje = `Sensor #${datos.idSensor} (${datos.tipoSensor}): `
      + `${datos.valor} ${datos.unidad} — umbral ${datos.estadoLectura.toLowerCase()} superado`;
    const cliente = await db.obtenerCliente();
    let idAlerta: number | null = null;

    try {
      await cliente.query("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED");
      const existentes = await cliente.query<{ id_alert: number }>(
        `SELECT id_alert FROM alert
         WHERE id_sensor = $1 AND status IN ('ACTIVE', 'ACKNOWLEDGED')
           AND created_at > NOW() - INTERVAL '6 hours' -- una alerta olvidada sin resolver no debe silenciar al sensor para siempre
         LIMIT 1 FOR UPDATE`,
        [datos.idSensor],
      );
      if (existentes.rows.length) {
        await cliente.query("COMMIT");
        return;
      }

      const creada = await cliente.query<{ id_alert: number }>(
        `INSERT INTO alert (id_sensor, level, alert_type, message, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING id_alert`,
        [datos.idSensor, nivel, tipo, mensaje],
      );
      idAlerta = creada.rows[0].id_alert;
      await bitacora.registrarEventoEnTransaccion(cliente, {
        accion: "ALERT_CREATED",
        nombreEntidad: "alert",
        idEntidad: String(idAlerta),
        idUsuario: null,
        direccionIp: "127.0.0.1",
        valoresNuevos: { idSensor: datos.idSensor, nivel, tipo, mensaje, esSimulada: datos.esSimulada },
      });
      await cliente.query("COMMIT");
    } catch (error) {
      await cliente.query("ROLLBACK");
      console.error("[ALERTAS] No se pudo crear y auditar la alerta:", error);
      return;
    } finally {
      cliente.release();
    }

    if (idAlerta !== null) {
      await eventBus.emitir(EVENTOS.ALERTA_CREADA, {
        idAlerta,
        idSensor: datos.idSensor,
        nivel,
        tipo,
        mensaje,
        creadaEn: new Date(),
      });
    }
  }
}

export const alertHandler = new AlertHandler();
