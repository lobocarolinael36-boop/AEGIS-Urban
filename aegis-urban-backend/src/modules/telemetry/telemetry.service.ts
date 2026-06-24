import { db } from "../../config/database";
import { SensorFactory } from "../../core/factory/SensorFactory";
import { SensorType } from "../../shared/types/domain.types";

export interface EstadisticasDashboard {
  sensoresActivos:   number;
  sensoresTotal:     number;
  alertasActivas:    number;
  alertasCriticas:   number;
  lecturas24h:       number;
  ultimaActualizacion: string;
}

export interface EntradaAudit {
  id_log:       string;
  action:       string;
  entity_name:  string;
  entity_id:    string;
  ip_address:   string;
  created_at:   string;
}

export class TelemetryService {
  async obtenerEstadisticas(): Promise<EstadisticasDashboard> {
    const [{ rows: sensores }, { rows: alertas }, { rows: lecturas }] = await Promise.all([
      db.consultar<{ activos: string; total: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'SIMULATED')) AS activos,
          COUNT(*) AS total
        FROM sensor
      `),
      db.consultar<{ activas: string; criticas: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'ACTIVE')                             AS activas,
          COUNT(*) FILTER (WHERE status = 'ACTIVE' AND level IN ('CRITICAL','CATASTROPHIC')) AS criticas
        FROM alert
      `),
      db.consultar<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM sensor_reading
        WHERE recorded_at >= NOW() - INTERVAL '24 hours'
      `),
    ]);

    return {
      sensoresActivos:     parseInt(sensores[0]?.activos  ?? "0"),
      sensoresTotal:       parseInt(sensores[0]?.total    ?? "0"),
      alertasActivas:      parseInt(alertas[0]?.activas   ?? "0"),
      alertasCriticas:     parseInt(alertas[0]?.criticas  ?? "0"),
      lecturas24h:         parseInt(lecturas[0]?.total    ?? "0"),
      ultimaActualizacion: new Date().toISOString(),
    };
  }

  async actividadReciente(limite = 10): Promise<EntradaAudit[]> {
    const { rows } = await db.consultar<EntradaAudit>(`
      SELECT id_log::text, action, entity_name, entity_id, ip_address,
             to_char(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM HH24:MI') AS created_at
      FROM audit_log
      ORDER BY id_log DESC
      LIMIT $1
    `, [limite]);
    return rows;
  }

  // Motor de simulación: genera lecturas para sensores marcados como SIMULATED
  async ejecutarCicloSimulacion(): Promise<void> {
    const { rows } = await db.consultar<{
      id_sensor: number;
      id_sensor_type: number;
      sensor_type_code: SensorType;
      sensor_unit: string;
    }>(`
      SELECT s.id_sensor, s.id_sensor_type,
             st.code AS sensor_type_code, st.unit AS sensor_unit
      FROM sensor s
      JOIN sensor_type st ON st.id_sensor_type = s.id_sensor_type
      WHERE s.status = 'SIMULATED'
    `);

    for (const sensor of rows) {
      try {
        const impl  = SensorFactory.crear(sensor.sensor_type_code);
        const valor = impl.generarValorSimulado();

        const { sensorService } = await import("../sensors/sensor.service");
        await sensorService.registrarLectura(
          sensor.id_sensor,
          valor,
          true,
          sensor.sensor_type_code,
          sensor.sensor_unit,
          sensor.id_sensor_type,
        );
      } catch { /* un sensor fallido no detiene el ciclo */ }
    }
  }
}

export const telemetryService = new TelemetryService();
