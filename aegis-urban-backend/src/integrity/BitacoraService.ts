import { db } from "../config/database";
import { ChecksumCalculator, FilaBitacora, ResultadoIntegridad } from "./ChecksumCalculator";
import { IntegrityError } from "../shared/errors/AppError";

export interface EntradaEvento {
  accion:              string;
  nombreEntidad:       string;
  idEntidad:           string;
  idUsuario:           number | null;
  direccionIp:         string;
  valoresAnteriores?:  Record<string, unknown>;
  valoresNuevos?:      Record<string, unknown>;
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
   * registrarEvento() — Registra un evento en la bitácora con DVH + DVV calculados.
   *
   * Siempre debe llamarse DESPUÉS de que la operación principal se completó
   * con éxito. Si este método falla, lanzar el error hacia arriba —
   * una operación sin registro es peor que un rollback visible.
   */
  async registrarEvento(entrada: EntradaEvento): Promise<bigint> {
    const cliente = await db.obtenerCliente();

    try {
      await cliente.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE");

      // ── 1. Bloquear la última fila para leer su DVV sin condición de carrera
      const ultimaFila = await cliente.query<{ dvv: string; id_log: string }>(`
        SELECT id_log, dvv
        FROM   audit_log
        ORDER BY id_log DESC
        LIMIT  1
        FOR UPDATE
      `);

      const dvvAnterior: string | null =
        ultimaFila.rows.length > 0 ? ultimaFila.rows[0].dvv : null;

      // ── 2. Obtener el próximo id_log desde la secuencia
      const resultadoSecuencia = await cliente.query<{ nextval: string }>(
        "SELECT nextval('audit_log_id_log_seq') AS nextval"
      );
      const siguienteId = BigInt(resultadoSecuencia.rows[0].nextval);

      const creadoEn = new Date();

      const datosFila: Omit<FilaBitacora, "dvh" | "dvv"> = {
        id_log:      siguienteId,
        action:      entrada.accion,
        entity_name: entrada.nombreEntidad,
        entity_id:   entrada.idEntidad,
        id_user:     entrada.idUsuario,
        ip_address:  entrada.direccionIp,
        old_values:  entrada.valoresAnteriores ? JSON.stringify(entrada.valoresAnteriores) : null,
        new_values:  entrada.valoresNuevos     ? JSON.stringify(entrada.valoresNuevos)     : null,
        created_at:  creadoEn,
      };

      // ── 3. Calcular DVH y DVV
      const dvh = ChecksumCalculator.calcularDVH(datosFila);
      const dvv = ChecksumCalculator.calcularDVVEncadenado(dvvAnterior, dvh);

      // ── 4. Insertar con id_log explícito (ya tomado de la secuencia)
      await cliente.query(`
        INSERT INTO audit_log
          (id_log, action, entity_name, entity_id, id_user,
           ip_address, old_values, new_values, dvh, dvv, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        siguienteId,
        datosFila.action,
        datosFila.entity_name,
        datosFila.entity_id,
        datosFila.id_user,
        datosFila.ip_address,
        datosFila.old_values,
        datosFila.new_values,
        dvh,
        dvv,
        creadoEn,
      ]);

      // ── 5. Actualizar AUDIT_LOG_CONTROL (último DVV conocido, contador)
      await cliente.query(`
        INSERT INTO audit_log_control (id_control, last_dvv, total_rows, updated_at)
        VALUES (1, $1, 1, NOW())
        ON CONFLICT (id_control) DO UPDATE
          SET last_dvv   = EXCLUDED.last_dvv,
              total_rows = audit_log_control.total_rows + 1,
              updated_at = NOW()
      `, [dvv]);

      await cliente.query("COMMIT");
      return siguienteId;
    } catch (err) {
      await cliente.query("ROLLBACK");
      throw err;
    } finally {
      cliente.release();
    }
  }

  /**
   * verificarIntegridad() — Recalcula DVH + DVV de todas las filas y reporta si algo fue alterado.
   *
   * Usa REPEATABLE READ para leer un snapshot consistente sin bloquear escrituras.
   * O(n) — no usar en producción con millones de filas sin paginación.
   */
  async verificarIntegridad(): Promise<ResultadoIntegridad> {
    const cliente = await db.obtenerCliente();

    try {
      await cliente.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");

      const resultado = await cliente.query<{
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

      await cliente.query("COMMIT");

      const filas: FilaBitacora[] = resultado.rows.map(f => ({
        id_log:      BigInt(f.id_log),
        action:      f.action,
        entity_name: f.entity_name,
        entity_id:   f.entity_id,
        id_user:     f.id_user,
        ip_address:  f.ip_address,
        old_values:  f.old_values,
        new_values:  f.new_values,
        dvh:         f.dvh,
        dvv:         f.dvv,
        created_at:  new Date(f.created_at),
      }));

      return ChecksumCalculator.validarIntegridad(filas);
    } catch (err) {
      await cliente.query("ROLLBACK");
      throw new IntegrityError(`Error al verificar integridad de bitácora: ${err}`);
    } finally {
      cliente.release();
    }
  }
}

export const bitacora = new BitacoraService();
