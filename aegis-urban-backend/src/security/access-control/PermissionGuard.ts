import { Request, Response, NextFunction } from "express";
import { db } from "../../config/database";
import { FamiliaComposite } from "../../core/composite/patent-family/FamilyComposite";
import { HojaPatente } from "../../core/composite/patent-family/PatentLeaf";
import { ForbiddenError } from "../../shared/errors/AppError";
import { HttpMethod } from "../../shared/types/domain.types";

interface FilaPatente {
  codigo:      string;
  recurso:     string;
  metodoHttp:  string;
}

interface FilaFamilia {
  id_family:        number;
  name:             string;
  id_parent_family: number | null;
}

/**
 * requierePermiso(recurso, metodo) — Factory de middleware de autorización.
 *
 * Ejemplo de uso en un controller:
 *   router.post('/alertas', requiereAutenticacion, requierePermiso('/api/alertas', 'POST'), handler)
 *
 * Carga el árbol FamiliaComposite del usuario desde BD y evalúa
 * si tiene el permiso solicitado mediante Composite.tienePermiso().
 */
export function requierePermiso(recurso: string, metodo: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError("Usuario no autenticado");
      }

      const arbol    = await construirArbolFamilias(req.user.familyId);
      const permitido = arbol.tienePermiso(recurso, metodo);

      if (!permitido) {
        throw new ForbiddenError(
          `Sin permiso para ${metodo} ${recurso}. Familia: ${req.user.familyName}`
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * construirArbolFamilias() — Construye el árbol FamiliaComposite desde la BD.
 *
 * Carga la familia del usuario, sus patentes directas, y de forma
 * recursiva las patentes de sus familias padre.
 */
async function construirArbolFamilias(idFamilia: number): Promise<FamiliaComposite> {
  // Cargar toda la jerarquía de familias en una sola query CTE recursiva
  const resultadoFamilias = await db.consultar<FilaFamilia>(`
    WITH RECURSIVE arbol_familiar AS (
      SELECT id_family, name, id_parent_family
      FROM   family
      WHERE  id_family = $1 AND is_active = TRUE
      UNION ALL
      SELECT f.id_family, f.name, f.id_parent_family
      FROM   family f
      INNER JOIN arbol_familiar af ON af.id_parent_family = f.id_family
      WHERE  f.is_active = TRUE
    )
    SELECT * FROM arbol_familiar
  `, [idFamilia]);

  // Cargar patentes de todas las familias en el árbol
  const idsFamilias    = resultadoFamilias.rows.map(f => f.id_family);
  const resultadoPatentes = await db.consultar<FilaPatente>(`
    SELECT p.code AS codigo, p.resource AS recurso, p.http_method AS "metodoHttp"
    FROM   patent p
    INNER JOIN family_patent fp ON fp.id_patent = p.id_patent
    WHERE  fp.id_family = ANY($1) AND p.is_active = TRUE
  `, [idsFamilias]);

  // Construir el FamiliaComposite con todos los HojaPatente encontrados
  const familia = new FamiliaComposite(
    resultadoFamilias.rows[0]?.name ?? `familia_${idFamilia}`
  );

  for (const patente of resultadoPatentes.rows) {
    familia.agregar(new HojaPatente(patente.codigo, patente.recurso, patente.metodoHttp as HttpMethod));
  }

  return familia;
}
