import { Router, Request, Response } from "express";
import { db } from "../../config/database";
import { requiereAutenticacion } from "../auth/auth.middleware";
import { bitacora } from "../../integrity/BitacoraService";

const router = Router();

// GET /api/admin/usuarios — lista usuarios con info de familia
router.get("/usuarios", requiereAutenticacion, async (_req: Request, res: Response) => {
  const { rows } = await db.consultar(`
    SELECT u.id_user, u.username, u.email, u.is_active,
           u.created_at, u.last_login,
           f.name AS family_name
    FROM   users u
    LEFT JOIN family f ON f.id_family = u.id_family
    ORDER  BY u.id_user
  `);
  res.json({ usuarios: rows });
});

// GET /api/admin/familias — lista familias
router.get("/familias", requiereAutenticacion, async (_req: Request, res: Response) => {
  const { rows } = await db.consultar(`
    SELECT f.id_family, f.name, f.description, f.is_active, f.created_at,
           COUNT(u.id_user)::int AS total_usuarios
    FROM   family f
    LEFT JOIN users u ON u.id_family = f.id_family
    GROUP  BY f.id_family, f.name, f.description, f.is_active, f.created_at
    ORDER  BY f.id_family
  `);
  res.json({ familias: rows });
});

// GET /api/admin/integridad — verifica DVH/DVV de la bitácora
router.get("/integridad", requiereAutenticacion, async (_req: Request, res: Response) => {
  const { rows: countRows } = await db.consultar<{ total: string }>(
    "SELECT COUNT(*) AS total FROM audit_log"
  );
  const totalFilas = parseInt(countRows[0].total, 10);

  const resultado = await bitacora.verificarIntegridad();
  res.json({
    integridad: {
      esValida:    resultado.esValida,
      filaCorrupta: resultado.filaCorrupta !== null ? resultado.filaCorrupta.toString() : null,
      motivo:      resultado.motivo,
      totalFilas,
    },
  });
});

// GET /api/admin/bitacora — últimas entradas del audit log
router.get("/bitacora", requiereAutenticacion, async (req: Request, res: Response) => {
  const limite = Math.min(parseInt(String(req.query.limite ?? "20")), 100);
  const { rows } = await db.consultar(`
    SELECT id_log, action, entity_name, entity_id,
           id_user, ip_address, created_at
    FROM   audit_log
    ORDER  BY id_log DESC
    LIMIT  $1
  `, [limite]);
  res.json({ entradas: rows });
});

export default router;
