import { Router, Request, Response } from "express";
import { telemetryService } from "./telemetry.service";
import { requiereAutenticacion } from "../auth/auth.middleware";

const router = Router();

// GET /api/telemetry/estadisticas — datos para el dashboard
router.get("/estadisticas", requiereAutenticacion, async (_req: Request, res: Response) => {
  const stats = await telemetryService.obtenerEstadisticas();
  res.json(stats);
});

// GET /api/telemetry/actividad — últimas N entradas del audit log
router.get("/actividad", requiereAutenticacion, async (req: Request, res: Response) => {
  const limite = Math.min(parseInt(req.query.limite as string) || 10, 50);
  const actividad = await telemetryService.actividadReciente(limite);
  res.json({ actividad });
});

export default router;
