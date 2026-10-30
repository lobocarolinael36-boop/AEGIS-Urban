import { db } from "../config/database";
import type { PoolClient } from "pg";
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
 *  - Advisory lock transaccional + READ COMMITTED → serializa las escrituras de la
 *    cadena DVV sin provocar fallos de serialización bajo telemetría concurrente.
 *  - REVOKE UPDATE/DELETE en SQL previene que ningún usuario (ni aegis_app_user)
 *    pueda alterar filas ya escritas. La integridad DVH/DVV detecta cualquier
 *    manipulación hecha con superusuario o restore manual.
 */
export class BitacoraService {
  /**
   * registrarEvento() — Registra un evento en la bitácora con DVH + DVV calculados.
   *
   * Se puede usar de forma independiente o insertar dentro de una transacción
   * de dominio mediante registrarEventoEnTransaccion para confirmar ambas cosas juntas.
   */
  async registrarEvento(entrada: EntradaEvento): Promise<bigint> {
    const cliente = await db.obtenerCliente();

    try {
      await cliente.query("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED");
      const siguienteId = await this.registrarEventoEnTransaccion(cliente, entrada);
      await cliente.query("COMMIT");
      return siguienteId;
    } catch (err) {
      await cliente.query("ROLLBACK");
      throw err;
    } finally {
      cliente.release();
    }
  }

  /** Inserta una entrada DVH/DVV en la transacción que ya abrió el llamador. */
  async registrarEventoEnTransaccion(cliente: PoolClient, entrada: EntradaEvento): Promise<bigint> {
    // Todas las rutas de auditoría comparten este lock. En READ COMMITTED, la
    // lectura siguiente ve el último DVV confirmado tras esperar a otro escritor.
    await cliente.query("SELECT pg_advisory_xact_lock(20261029, 1)");
    const ultimaFila = await cliente.query<{ dvv: string; id_log: string }>(`
      SELECT id_log, dvv FROM audit_log ORDER BY id_log DESC LIMIT 1 FOR UPDATE
    `);
    const dvvAnterior = ultimaFila.rows[0]?.dvv ?? null;
    const resultadoSecuencia = await cliente.query<{ nextval: string }>(
      "SELECT nextval('audit_log_id_log_seq') AS nextval"
    );
    const siguienteId = BigInt(resultadoSecuencia.rows[0].nextval);
    const creadoEn = new Date();
    const datosFila: Omit<FilaBitacora, "dvh" | "dvv"> = {
      id_log: siguienteId,
      action: entrada.accion,
      entity_name: entrada.nombreEntidad,
      entity_id: entrada.idEntidad,
      id_user: entrada.idUsuario,
      ip_address: entrada.direccionIp,
      old_values: entrada.valoresAnteriores ? JSON.stringify(entrada.valoresAnteriores) : null,
      new_values: entrada.valoresNuevos ? JSON.stringify(entrada.valoresNuevos) : null,
      created_at: creadoEn,
    };
    const dvh = ChecksumCalculator.calcularDVH(datosFila);
    const dvv = ChecksumCalculator.calcularDVVEncadenado(dvvAnterior, dvh);

    await cliente.query(`
      INSERT INTO audit_log
        (id_log, action, entity_name, entity_id, id_user,
         ip_address, old_values, new_values, dvh, dvv, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [siguienteId, datosFila.action, datosFila.entity_name, datosFila.entity_id,
      datosFila.id_user, datosFila.ip_address, datosFila.old_values, datosFila.new_values,
      dvh, dvv, creadoEn]);

    await cliente.query(`
      INSERT INTO audit_log_control (table_name, last_dvv, total_rows)
      VALUES ('audit_log', $1, 1)
      ON CONFLICT (table_name) DO UPDATE
        SET last_dvv = EXCLUDED.last_dvv,
            total_rows = audit_log_control.total_rows + 1
    `, [dvv]);
    return siguienteId;
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
