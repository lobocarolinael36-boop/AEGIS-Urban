import { Router, Request, Response } from "express";
import { db } from "../../config/database";
import { requiereAutenticacion } from "../auth/auth.middleware";
import { requierePermiso } from "../../security/access-control/PermissionGuard";
import { AppError } from "../../shared/errors/AppError";
import { SensorFactory } from "../../core/factory/SensorFactory";
import { SensorType } from "../../shared/types/domain.types";
import { sensorService } from "../sensors/sensor.service";

const router = Router();
type Intensidad = "NORMAL" | "WARNING" | "CRITICAL";
interface ConfigEscenario { sensorIds: number[]; intensidad: Intensidad; intervaloSegundos: number; duracionMinutos: number }
interface SensorEscenario { id_sensor: number; id_sensor_type: number; sensor_type_code: SensorType; sensor_unit: string }
const timers = new Map<number, NodeJS.Timeout>();

export async function detenerEscenariosActivos(): Promise<void> {
  for (const [id, timer] of timers) {
    const scenarioTimer = timer as NodeJS.Timeout & { stopTimeout?: NodeJS.Timeout };
    clearInterval(timer);
    if (scenarioTimer.stopTimeout) clearTimeout(scenarioTimer.stopTimeout);
    await db.consultar(`UPDATE simulation_scenario SET status = 'ABORTED', ended_at = NOW()
      WHERE id_scenario = $1 AND status = 'RUNNING'`, [id]);
  }
  timers.clear();
}

function validarConfig(body: any): ConfigEscenario {
  const sensorIds: number[] = Array.isArray(body.sensorIds)
    ? [...new Set<number>((body.sensorIds as unknown[]).map(Number))] : [];
  const intensidad = body.intensidad as Intensidad;
  const intervaloSegundos = Number(body.intervaloSegundos ?? 15);
  const duracionMinutos = Number(body.duracionMinutos ?? 5);
  if (!sensorIds.length || sensorIds.some((id: number) => !Number.isInteger(id) || id < 1) ||
      !["NORMAL", "WARNING", "CRITICAL"].includes(intensidad) ||
      !Number.isInteger(intervaloSegundos) || intervaloSegundos < 5 || intervaloSegundos > 300 ||
      !Number.isInteger(duracionMinutos) || duracionMinutos < 1 || duracionMinutos > 240) {
    throw new AppError("Configuración inválida: seleccioná sensores simulados, intensidad y duración de 1 a 240 minutos", 400);
  }
  return { sensorIds, intensidad, intervaloSegundos, duracionMinutos };
}

async function generarCiclo(id: number, config: ConfigEscenario) {
  const { rows } = await db.consultar<SensorEscenario>(`SELECT s.id_sensor, s.id_sensor_type,
    st.code AS sensor_type_code, st.unit AS sensor_unit FROM sensor s
    JOIN sensor_type st ON st.id_sensor_type = s.id_sensor_type
    WHERE s.id_sensor = ANY($1::int[]) AND (s.status = 'SIMULATED' OR s.is_simulated = TRUE)`, [config.sensorIds]);
  for (const s of rows) {
    const impl = SensorFactory.crear(s.sensor_type_code);
    let valor = impl.generarValorSimulado();
    if (config.intensidad !== "NORMAL") {
      const umbral = impl.obtenerUmbralAlerta();
      valor = config.intensidad === "WARNING" ? umbral * 1.1 : impl.obtenerUmbralCritico() * 1.1;
    }
    await sensorService.registrarLectura(s.id_sensor, valor, true, s.sensor_type_code, s.sensor_unit, s.id_sensor_type);
    await db.consultar(`INSERT INTO simulation_event (id_scenario, id_sensor, simulated_value, trigger_type)
      VALUES ($1, $2, $3, 'AUTO')`, [id, s.id_sensor, valor]);
  }
}

router.get("/scenarios", requiereAutenticacion, requierePermiso("/api/simulation", "GET"), async (_req, res) => {
  const { rows } = await db.consultar(`SELECT id_scenario, name, scenario_type, config, status, started_at, ended_at
    FROM simulation_scenario ORDER BY id_scenario DESC LIMIT 100`);
  res.json({ escenarios: rows });
});

router.post("/scenarios", requiereAutenticacion, requierePermiso("/api/simulation/start", "POST"), async (req: Request, res: Response) => {
  const config = validarConfig(req.body);
  const sensores = (await db.consultar<{ code: SensorType; id_sensor: number }>(`SELECT s.id_sensor, st.code FROM sensor s
    JOIN sensor_type st ON st.id_sensor_type = s.id_sensor_type
    WHERE s.id_sensor = ANY($1::int[]) AND (s.status = 'SIMULATED' OR s.is_simulated = TRUE)`, [config.sensorIds])).rows;
  const tipos = [...new Set(sensores.map(r => r.code))];
  if (sensores.length !== config.sensorIds.length) throw new AppError("Todos los sensores deben existir y estar habilitados para simulación", 409);
  const tipo = tipos.length > 1 ? "COMBINED" : tipos[0];
  const { rows } = await db.consultar(`INSERT INTO simulation_scenario(name, scenario_type, config, created_by)
    VALUES ($1, $2, $3::jsonb, $4) RETURNING id_scenario, name, scenario_type, config, status`,
    [String(req.body.name ?? "Escenario configurable").trim().slice(0, 200) || "Escenario configurable", tipo, JSON.stringify(config), req.user?.id ?? null]);
  res.status(201).json({ escenario: rows[0] });
});

router.post("/scenarios/:id/iniciar", requiereAutenticacion, requierePermiso("/api/simulation/start", "POST"), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError("ID de escenario inválido", 400);
  const { rows } = await db.consultar<{ config: ConfigEscenario; status: string }>(`UPDATE simulation_scenario
    SET status = 'RUNNING', started_at = NOW(), ended_at = NULL WHERE id_scenario = $1 AND status = 'DRAFT'
    RETURNING config, status`, [id]);
  if (!rows[0]) throw new AppError("El escenario no existe o ya fue iniciado", 409);
  const config = rows[0].config;
  type ScenarioTimer = NodeJS.Timeout & { stopTimeout?: NodeJS.Timeout };
  const detener = () => { const timer = timers.get(id) as ScenarioTimer | undefined; if (timer) { clearInterval(timer); if (timer.stopTimeout) clearTimeout(timer.stopTimeout); } timers.delete(id); };
  const finalizar = async () => { detener(); await db.consultar(`UPDATE simulation_scenario SET status = 'COMPLETED', ended_at = NOW() WHERE id_scenario = $1 AND status = 'RUNNING'`, [id]); };
  const endTimer = setTimeout(() => { void finalizar(); }, config.duracionMinutos * 60_000);
  const interval = setInterval(() => { void generarCiclo(id, config).catch(() => undefined); }, config.intervaloSegundos * 1000);
  timers.set(id, Object.assign(interval, { stopTimeout: endTimer }));
  void generarCiclo(id, config).catch(() => undefined);
  res.json({ id_scenario: id, status: "RUNNING", duracionMinutos: config.duracionMinutos });
});

router.delete("/scenarios/:id", requiereAutenticacion, requierePermiso("/api/simulation/:id/stop", "DELETE"), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const timer = timers.get(id) as (NodeJS.Timeout & { stopTimeout?: NodeJS.Timeout }) | undefined;
  if (timer) { clearInterval(timer); if (timer.stopTimeout) clearTimeout(timer.stopTimeout); timers.delete(id); }
  const { rowCount } = await db.consultar(`UPDATE simulation_scenario SET status = 'ABORTED', ended_at = NOW()
    WHERE id_scenario = $1 AND status = 'RUNNING'`, [id]);
  if (!rowCount) throw new AppError("El escenario no está en ejecución", 409);
  res.json({ id_scenario: id, status: "ABORTED" });
});

export default router;
