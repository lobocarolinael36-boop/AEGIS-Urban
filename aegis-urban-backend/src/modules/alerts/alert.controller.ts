import { Router, Request, Response } from "express";
import { db } from "../../config/database";
import { requiereAutenticacion } from "../auth/auth.middleware";
import { ContextoEvacuacion } from "../../core/strategies/ContextoEvacuacion";
import { AppError } from "../../shared/errors/AppError";

const router = Router();

// GET /api/alertas — lista alertas activas
router.get("/", requiereAutenticacion, async (_req: Request, res: Response) => {
  const { rows } = await db.consultar(`
    SELECT a.id_alert, a.level, a.alert_type, a.message, a.status,
           a.created_at, a.updated_at,
           s.serial_code, s.lat, s.lon,
           st.code AS sensor_type,
           cn.name AS city_node_name
    FROM alert a
    JOIN sensor      s  ON s.id_sensor      = a.id_sensor
    JOIN sensor_type st ON st.id_sensor_type = s.id_sensor_type
    JOIN city_node   cn ON cn.id_node        = s.id_city_node
    ORDER BY a.created_at DESC
    LIMIT 50
  `);
  res.json({ alertas: rows });
});

// POST /api/alertas/:id/evacuar — inicia plan de evacuación para una alerta
router.post("/:id/evacuar", requiereAutenticacion, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError("ID de alerta inválido", 400);

  const { rows } = await db.consultar<{
    id_alert: number; level: string; alert_type: string; id_sensor: number;
  }>(
    `SELECT id_alert, level, alert_type, id_sensor FROM alert WHERE id_alert = $1`,
    [id]
  );
  if (!rows.length) throw new AppError("Alerta no encontrada", 404);

  const alerta = rows[0];
  const estrategia = ContextoEvacuacion.seleccionarAutomatica(alerta.level, alerta.alert_type);
  const contexto   = new ContextoEvacuacion(estrategia);

  const plan = await contexto.ejecutarEvacuacion(
    { idAlerta: alerta.id_alert, idSensor: alerta.id_sensor, nivel: alerta.level, tipo: alerta.alert_type },
    req.user?.id,
  );

  res.status(201).json({ plan });
});

// PATCH /api/alertas/:id/reconocer — reconoce una alerta
router.patch("/:id/reconocer", requiereAutenticacion, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError("ID de alerta inválido", 400);

  await db.consultar(
    `UPDATE alert SET status = 'ACKNOWLEDGED', acknowledged_by = $1, updated_at = NOW()
     WHERE id_alert = $2 AND status = 'ACTIVE'`,
    [req.user?.id, id]
  );
  res.json({ mensaje: "Alerta reconocida" });
});

export default router;
