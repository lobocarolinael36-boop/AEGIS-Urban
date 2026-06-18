import { db } from "../config/database";
import { ChecksumCalculator, AuditLogRow, IntegrityResult } from "./ChecksumCalculator";
import { IntegrityError } from "../shared/errors/AppError";

export interface LogEventInput {
  action:       string;
  entityName:   string;
  entityId:     string;
  userId:       number | null;
  ipAddress:    string;
  oldValues?:   Record<string, unknown>;
  newValues?:   Record<string, unknown>;
}

/**
 * BitacoraService — Escritura y verificación del registro inmutable de auditoría.
 *
 * Garantías:
 *  - SERIALIZABLE + FOR UPDATE en la última fila → previene condición de carrera
 *    donde dos INSERTs simultáneos lean el mismo DVV anterior y rompan la cadena.
 *  - REVOKE UPDATE/DELETE en SQL previene que ningún usuario (ni aegis_app_user)
 *    pueda alterar filas ya escritas. La integridad DVH/DVV detecta cualquier
 *    manipulación hecha con superusuario o restore manual.
 */
export class BitacoraService {
  /**
   * logEvent() — Registra un evento en la bitácora con DVH + DVV calculados.
   *
   * Siempre debe llamarse DESPUÉS de que la operación principal se completó
   * con éxito. Si este método falla, lanzar el error hacia arriba —
   * una operación sin registro es peor que una rollback visible.
   */
  async logEvent(input: LogEventInput): Promise<bigint> {
    const client = await db.getClient();

    try {
      await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE");

      // ── 1. Bloquear la última fila para leer su DVV sin condición de carrera
      const lastRow = await client.query<{ dvv: string; id_log: string }>(`
        SELECT id_log, dvv
        FROM   audit_log
        ORDER BY id_log DESC
        LIMIT  1
        FOR UPDATE
      `);

      const previousDVV: string | null =
        lastRow.rows.length > 0 ? lastRow.rows[0].dvv : null;

      // ── 2. Obtener el próximo id_log desde la secuencia
      const seqResult = await client.query<{ nextval: string }>(
        "SELECT nextval('audit_log_id_log_seq') AS nextval"
      );
      const nextId = BigInt(seqResult.rows[0].nextval);

      const createdAt = new Date();

      const rowData: Omit<AuditLogRow, "dvh" | "dvv"> = {
        id_log:      nextId,
        action:      input.action,
        entity_name: input.entityName,
        entity_id:   input.entityId,
        id_user:     input.userId,
        ip_address:  input.ipAddress,
        old_values:  input.oldValues ? JSON.stringify(input.oldValues) : null,
        new_values:  input.newValues ? JSON.stringify(input.newValues) : null,
        created_at:  createdAt,
      };

      // ── 3. Calcular DVH y DVV
      const dvh = ChecksumCalculator.calculateDVH(rowData);
      const dvv = ChecksumCalculator.calculateChainedDVV(previousDVV, dvh);

      // ── 4. Insertar con id_log explícito (ya tomado de la secuencia)
      await client.query(`
        INSERT INTO audit_log
          (id_log, action, entity_name, entity_id, id_user,
           ip_address, old_values, new_values, dvh, dvv, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        nextId,
        rowData.action,
        rowData.entity_name,
        rowData.entity_id,
        rowData.id_user,
        rowData.ip_address,
        rowData.old_values,
        rowData.new_values,
        dvh,
        dvv,
        createdAt,
      ]);

      // ── 5. Actualizar AUDIT_LOG_CONTROL (último DVV conocido, contador)
      await client.query(`
        INSERT INTO audit_log_control (id_control, last_dvv, total_rows, updated_at)
        VALUES (1, $1, 1, NOW())
        ON CONFLICT (id_control) DO UPDATE
          SET last_dvv   = EXCLUDED.last_dvv,
              total_rows = audit_log_control.total_rows + 1,
              updated_at = NOW()
      `, [dvv]);

      await client.query("COMMIT");
      return nextId;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * verifyIntegrity() — Recalcula DVH + DVV de todas las filas y reporta si algo fue alterado.
   *
   * Usa REPEATABLE READ para leer un snapshot consistente sin bloquear escrituras.
   * O(n) — no usar en producción con millones de filas sin paginación.
   */
  async verifyIntegrity(): Promise<IntegrityResult> {
    const client = await db.getClient();

    try {
      await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");

      const result = await client.query<{
        id_log:      string;
        action:      string;
        entity_name: string;
        entity_id:   string;
        id_user:     number | null;
        ip_address:  string;
        old_values:  string | null;
        new_values:  string | null;
        dvh:         string;
        dvv:         string;
        created_at:  string;
      }>(`
        SELECT id_log, action, entity_name, entity_id, id_user,
               ip_address, old_values, new_values, dvh, dvv, created_at
        FROM   audit_log
        ORDER BY id_log ASC
      `);

      await client.query("COMMIT");

      const rows: AuditLogRow[] = result.rows.map(r => ({
        id_log:      BigInt(r.id_log),
        action:      r.action,
        entity_name: r.entity_name,
        entity_id:   r.entity_id,
        id_user:     r.id_user,
        ip_address:  r.ip_address,
        old_values:  r.old_values,
        new_values:  r.new_values,
        dvh:         r.dvh,
        dvv:         r.dvv,
        created_at:  new Date(r.created_at),
      }));

      return ChecksumCalculator.validateTableIntegrity(rows);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new IntegrityError(`Error al verificar integridad de bitácora: ${err}`);
    } finally {
      client.release();
    }
  }
}

export const bitacora = new BitacoraService();
