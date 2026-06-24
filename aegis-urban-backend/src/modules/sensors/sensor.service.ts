import { db } from "../../config/database";
import { SensorFactory } from "../../core/factory/SensorFactory";
import { eventBus, EVENTOS } from "../../core/events/EventBus";
import { SensorType } from "../../shared/types/domain.types";

export interface FilaSensor {
  id_sensor:        number;
  serial_code:      string;
  id_sensor_type:   number;
  sensor_type_code: SensorType;
  sensor_unit:      string;
  id_city_node:     number;
  city_node_name:   string;
  status:           string;
  lat:              number;
  lon:              number;
  is_simulated:     boolean;
  last_value?:      number;
  last_status?:     string;
  last_reading_at?: Date;
}

export class SensorService {
  async listarSensores(): Promise<FilaSensor[]> {
    const { rows } = await db.consultar<FilaSensor>(`
      SELECT
        s.id_sensor,
        s.serial_code,
        s.id_sensor_type,
        st.code          AS sensor_type_code,
        st.unit          AS sensor_unit,
        s.id_city_node,
        cn.name          AS city_node_name,
        s.status,
        s.lat,
        s.lon,
        s.is_simulated,
        lr.value         AS last_value,
        lr.reading_status AS last_status,
        lr.recorded_at   AS last_reading_at
      FROM sensor s
      JOIN sensor_type st ON st.id_sensor_type = s.id_sensor_type
      JOIN city_node   cn ON cn.id_node        = s.id_city_node
      LEFT JOIN LATERAL (
        SELECT value, reading_status, recorded_at
        FROM sensor_reading
        WHERE id_sensor = s.id_sensor
        ORDER BY recorded_at DESC
        LIMIT 1
      ) lr ON TRUE
      ORDER BY s.id_sensor
    `);
    return rows;
  }

  async obtenerUltimas24h(idSensor: number, limite = 100): Promise<unknown[]> {
    const { rows } = await db.consultar(
      `SELECT value, unit, reading_status, recorded_at
       FROM sensor_reading
       WHERE id_sensor = $1
         AND recorded_at >= NOW() - INTERVAL '24 hours'
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [idSensor, limite]
    );
    return rows;
  }

  // Registra una lectura (real o simulada) y dispara el EventBus
  async registrarLectura(
    idSensor: number,
    valor: number,
    esSimulada: boolean,
    tipoSensor: SensorType,
    unidad: string,
    idTipo: number,
  ): Promise<void> {
    const sensor    = SensorFactory.crear(tipoSensor);
    const estado    = sensor.evaluarLectura(valor);

    await db.consultar(
      `INSERT INTO sensor_reading (id_sensor, value, unit, reading_status, is_simulated, recorded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [idSensor, valor, unidad, estado, esSimulada]
    );

    // Actualiza last_ping del sensor
    if (!esSimulada) {
      await db.consultar(
        `UPDATE sensor SET last_ping = NOW() WHERE id_sensor = $1`,
        [idSensor]
      );
    }

    await eventBus.emitir(EVENTOS.LECTURA_NUEVA, {
      idSensor,
      idTipoSensor:  idTipo,
      tipoSensor,
      valor,
      unidad,
      estadoLectura: estado,
      esSimulada,
      registradaEn:  new Date(),
    });
  }
}

export const sensorService = new SensorService();
