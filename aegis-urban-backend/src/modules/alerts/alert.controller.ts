import { Router, Request, Response } from "express";
import { db } from "../../config/database";
import { requiereAutenticacion } from "../auth/auth.middleware";
import { ContextoEvacuacion } from "../../core/strategies/ContextoEvacuacion";
import { AppError } from "../../shared/errors/AppError";
import { bitacora } from "../../integrity/BitacoraService";
import { requierePermiso } from "../../security/access-control/PermissionGuard";

const router = Router();

async function transicionarAlerta(
  id: number,
  idUsuario: number | undefined,
  direccionIp: string,
  accion: "ALERT_ACKNOWLEDGED" | "ALERT_RESOLVED",
): Promise<void> {
  const cliente = await db.obtenerCliente();
  const estadoAnterior = accion === "ALERT_ACKNOWLEDGED" ? "ACTIVE" : "ACKNOWLEDGED";
  const estadoNuevo = accion === "ALERT_ACKNOWLEDGED" ? "ACKNOWLEDGED" : "RESOLVED";
  const columnaActor = accion === "ALERT_ACKNOWLEDGED" ? "acknowledged_by" : "resolved_by";
  const columnaFecha = accion === "ALERT_ACKNOWLEDGED" ? "acknowledged_at" : "resolved_at";

  try {
    await cliente.query("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED");
    const resultado = await cliente.query(
      `UPDATE alert
       SET status = $1, ${columnaActor} = $2, ${columnaFecha} = NOW(), updated_at = NOW()
       WHERE id_alert = $3 AND status = $4`,
      [estadoNuevo, idUsuario ?? null, id, estadoAnterior],
    );
    if (!resultado.rowCount) {
      throw new AppError(
        accion === "ALERT_ACKNOWLEDGED"
          ? "La alerta no existe o ya no está activa"
          : "Reconocé la alerta antes de resolverla",
        409,
      );
    }

    await bitacora.registrarEventoEnTransaccion(cliente, {
      accion,
      nombreEntidad: "alert",
      idEntidad: String(id),
      idUsuario: idUsuario ?? null,
      direccionIp,
      valoresAnteriores: { status: estadoAnterior },
      valoresNuevos: { status: estadoNuevo, idUsuario: idUsuario ?? null },
    });
    await cliente.query("COMMIT");
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

// GET /api/alertas — filtros y paginación ejecutados en PostgreSQL.
router.get("/", requiereAutenticacion, requierePermiso("/api/alertas", "GET"), async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const zonaId = req.query.zonaId === undefined ? null : Number(req.query.zonaId);
  const desde = req.query.desde ? String(req.query.desde) : null;
  const hasta = req.query.hasta ? String(req.query.hasta) : null;
  const estado = req.query.estado ? String(req.query.estado) : null;
  const nivel = req.query.nivel ? String(req.query.nivel) : null;
  const busqueda = req.query.busqueda ? String(req.query.busqueda).trim() : null;
  const fechaValida = (v: string | null) => v === null || (!Number.isNaN(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}/.test(v));
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
      (zonaId !== null && (!Number.isInteger(zonaId) || zonaId < 1)) ||
      !fechaValida(desde) || !fechaValida(hasta) || (desde && hasta && desde > hasta) ||
      (estado && !["ACTIVE", "ACKNOWLEDGED", "RESOLVED"].includes(estado)) ||
      (nivel && !["WARNING", "CRITICAL", "CATASTROPHIC"].includes(nivel))) {
    throw new AppError("Parámetros de filtro inválidos", 400);
  }
  const filtro = `($1::int IS NULL OR s.id_city_node IN (
      WITH RECURSIVE zona AS (SELECT id_node FROM city_node WHERE id_node = $1
        UNION ALL SELECT n.id_node FROM city_node n JOIN zona z ON n.id_parent = z.id_node)
      SELECT id_node FROM zona))
    AND ($2::date IS NULL OR a.created_at >= $2::date)
    AND ($3::date IS NULL OR a.created_at < $3::date + INTERVAL '1 day')
    AND ($4::text IS NULL OR a.status = $4)
    AND ($5::text IS NULL OR a.level = $5)
    AND ($6::text IS NULL OR concat_ws(' ', a.message, s.serial_code, cn.name, a.alert_type) ILIKE '%' || $6 || '%')`;
  const params = [zonaId, desde, hasta, estado, nivel, busqueda];
  const [{ rows }, totalResult] = await Promise.all([
    db.consultar(`SELECT a.id_alert, a.level, a.alert_type, a.message, a.status,
           a.created_at, a.updated_at, s.serial_code, s.lat, s.lon,
           st.code AS sensor_type, s.id_city_node, cn.name AS city_node_name
      FROM alert a JOIN sensor s ON s.id_sensor = a.id_sensor
      JOIN sensor_type st ON st.id_sensor_type = s.id_sensor_type
      JOIN city_node cn ON cn.id_node = s.id_city_node
      WHERE ${filtro} ORDER BY a.created_at DESC, a.id_alert DESC
      LIMIT $7 OFFSET $8`, [...params, pageSize, (page - 1) * pageSize]),
    db.consultar<{ total: string }>(`SELECT COUNT(*) AS total FROM alert a
      JOIN sensor s ON s.id_sensor = a.id_sensor JOIN city_node cn ON cn.id_node = s.id_city_node
      WHERE ${filtro}`, params),
  ]);
  const total = Number(totalResult.rows[0]?.total ?? 0);
  res.json({ alertas: rows, paginacion: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
});

router.get("/zonas", requiereAutenticacion, requierePermiso("/api/alertas", "GET"), async (_req, res) => {
  const { rows } = await db.consultar(`SELECT id_node, name, node_type FROM city_node
    WHERE is_active = TRUE AND node_type <> 'CITY' ORDER BY name`);
  res.json({ zonas: rows });
});

// POST /api/alertas/:id/evacuar — inicia un plan para una alerta reconocida
router.post("/:id/evacuar", requiereAutenticacion, requierePermiso("/api/alertas/:id/evacuar", "POST"), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError("ID de alerta inválido", 400);

  const { rows } = await db.consultar<{
    id_alert: number; level: string; alert_type: string; id_sensor: number; status: string;
  }>(
    `SELECT id_alert, level, alert_type, id_sensor, status FROM alert WHERE id_alert = $1`,
    [id]
  );
  if (!rows.length) throw new AppError("Alerta no encontrada", 404);

  const alerta = rows[0];
  if (alerta.status !== "ACKNOWLEDGED") {
    throw new AppError("Reconocé la alerta antes de iniciar una evacuación", 409);
  }
  const estrategia = ContextoEvacuacion.seleccionarAutomatica(alerta.level, alerta.alert_type);
  const contexto   = new ContextoEvacuacion(estrategia);

  const plan = await contexto.ejecutarEvacuacion(
    { idAlerta: alerta.id_alert, idSensor: alerta.id_sensor, nivel: alerta.level, tipo: alerta.alert_type },
    req.user?.id,
    req.ip || "127.0.0.1",
  );

  res.status(201).json({ plan });
});

// PATCH /api/alertas/:id/reconocer — reconoce una alerta
router.patch("/:id/reconocer", requiereAutenticacion, requierePermiso("/api/alertas/:id/reconocer", "PATCH"), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError("ID de alerta inválido", 400);

  await transicionarAlerta(id, req.user?.id, req.ip || "127.0.0.1", "ALERT_ACKNOWLEDGED");
  res.json({ mensaje: "Alerta reconocida" });
});

// PATCH /api/alertas/:id/resolver — cierre explícito de una alerta reconocida
router.patch("/:id/resolver", requiereAutenticacion, requierePermiso("/api/alertas/:id/resolver", "PATCH"), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError("ID de alerta inválido", 400);

  await transicionarAlerta(id, req.user?.id, req.ip || "127.0.0.1", "ALERT_RESOLVED");
  res.json({ mensaje: "Alerta resuelta" });
});

export default router;
