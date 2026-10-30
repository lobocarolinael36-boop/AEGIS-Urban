import { Router, Request, Response } from "express";
import { sensorService } from "./sensor.service";
import { requiereAutenticacion } from "../auth/auth.middleware";
import { AppError } from "../../shared/errors/AppError";
import { SensorType } from "../../shared/types/domain.types";
import { requierePermiso } from "../../security/access-control/PermissionGuard";

const router = Router();

// GET /api/sensores — lista todos los sensores con su última lectura
router.get("/", requiereAutenticacion, requierePermiso("/api/sensores", "GET"), async (_req: Request, res: Response) => {
  const sensores = await sensorService.listarSensores();
  res.json({ sensores });
});

// GET /api/sensores/:id/lecturas — historial 24h de un sensor
router.get("/:id/lecturas", requiereAutenticacion, requierePermiso("/api/sensores/:id/lecturas", "GET"), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError("ID de sensor inválido", 400);
  const lecturas = await sensorService.obtenerUltimas24h(id);
  res.json({ lecturas });
});

// POST /api/sensores/:id/simular — fuerza una lectura simulada (para pruebas)
router.post("/:id/simular", requiereAutenticacion, requierePermiso("/api/sensores/:id/simular", "POST"), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError("ID de sensor inválido", 400);

  // Obtiene info del sensor
  const { rows } = await (await import("../../config/database")).db.consultar<{
    sensor_type_code: SensorType;
    sensor_unit: string;
    id_sensor_type: number;
    status: string;
    is_simulated: boolean;
  }>(
    `SELECT st.code AS sensor_type_code, st.unit AS sensor_unit, s.id_sensor_type,
            s.status, s.is_simulated
     FROM sensor s JOIN sensor_type st ON st.id_sensor_type = s.id_sensor_type
     WHERE s.id_sensor = $1`,
    [id]
  );

  if (!rows.length) throw new AppError("Sensor no encontrado", 404);
  const { sensor_type_code, sensor_unit, id_sensor_type, status, is_simulated } = rows[0];
  if (status !== "SIMULATED" && !is_simulated) {
    throw new AppError("La simulación manual sólo está habilitada para sensores marcados como simulados", 409);
  }

  const { SensorFactory } = await import("../../core/factory/SensorFactory");
  const sensor = SensorFactory.crear(sensor_type_code);
  const valor  = sensor.generarValorSimulado();

  await sensorService.registrarLectura(id, valor, true, sensor_type_code, sensor_unit, id_sensor_type);

  res.json({ mensaje: "Lectura simulada registrada", valor, tipo: sensor_type_code });
});

export default router;
