import { Request, Response, NextFunction } from "express";
import { db } from "../../config/database";
import { FamilyComposite } from "../../core/composite/patent-family/FamilyComposite";
import { PatentLeaf } from "../../core/composite/patent-family/PatentLeaf";
import { ForbiddenError } from "../../shared/errors/AppError";
import { HttpMethod } from "../../shared/types/domain.types";

interface PatentRow {
  code:        string;
  resource:    string;
  http_method: string;
}

interface FamilyRow {
  id_family:        number;
  name:             string;
  id_parent_family: number | null;
}

/**
 * requirePermission(resource, method) — Factory de middleware de autorización.
 *
 * Ejemplo de uso en un controller:
 *   router.post('/alerts', requireAuth, requirePermission('/api/alerts', 'POST'), handler)
 *
 * Carga el árbol FamilyComposite del usuario desde BD y evalúa
 * si tiene el permiso solicitado mediante Composite.hasPermission().
 */
export function requirePermission(resource: string, method: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError("Usuario no autenticado");
      }

      const tree = await buildFamilyTree(req.user.familyId);
      const allowed = tree.hasPermission(resource, method);

      if (!allowed) {
        throw new ForbiddenError(
          `Sin permiso para ${method} ${resource}. Familia: ${req.user.familyName}`
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * buildFamilyTree() — Construye el árbol FamilyComposite desde la BD.
 *
 * Carga la familia del usuario, sus patentes directas, y de forma
 * recursiva las patentes de sus familias padre.
 */
async function buildFamilyTree(familyId: number): Promise<FamilyComposite> {
  // Cargar toda la jerarquía de familias en una sola query CTE recursiva
  const familyResult = await db.query<FamilyRow>(`
    WITH RECURSIVE family_tree AS (
      SELECT id_family, name, id_parent_family
      FROM   family
      WHERE  id_family = $1 AND is_active = TRUE
      UNION ALL
      SELECT f.id_family, f.name, f.id_parent_family
      FROM   family f
      INNER JOIN family_tree ft ON ft.id_parent_family = f.id_family
      WHERE  f.is_active = TRUE
    )
    SELECT * FROM family_tree
  `, [familyId]);

  // Cargar patentes de todas las familias en el árbol
  const familyIds = familyResult.rows.map(r => r.id_family);
  const patentResult = await db.query<PatentRow>(`
    SELECT p.code, p.resource, p.http_method
    FROM   patent p
    INNER JOIN family_patent fp ON fp.id_patent = p.id_patent
    WHERE  fp.id_family = ANY($1) AND p.is_active = TRUE
  `, [familyIds]);

  // Construir el FamilyComposite con todos los PatentLeaf encontrados
  const family = new FamilyComposite(
    familyResult.rows[0]?.name ?? `family_${familyId}`
  );

  for (const patent of patentResult.rows) {
    family.add(new PatentLeaf(patent.code, patent.resource, patent.http_method as HttpMethod));
  }

  return family;
}
