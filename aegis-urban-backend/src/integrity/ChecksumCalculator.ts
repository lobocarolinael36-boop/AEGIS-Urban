import crypto from "crypto";

export interface AuditLogRow {
  id_log:      bigint;
  action:      string;
  entity_name: string;
  entity_id:   string;
  id_user:     number | null;
  ip_address:  string;
  old_values:  string | null;
  new_values:  string | null;
  dvh:         string;
  dvv:         string;
  created_at:  Date;
}

export interface IntegrityResult {
  isValid:      boolean;
  corruptedRow: bigint | null;
  reason:       string;
}

/**
 * ChecksumCalculator — Lógica matemática de DVH y DVV.
 *
 * DVH (Dígito Verificador Horizontal): SHA-256 de los campos de UNA fila.
 *   → Detecta si algún campo fue modificado directamente en la BD.
 *
 * DVV (Dígito Verificador Vertical): Hash encadenado tipo blockchain.
 *   DVV₁ = DVH₁
 *   DVVₙ = SHA256(DVVₙ₋₁ + SEP + DVHₙ)
 *   → Detecta si se eliminó, insertó o reordenó cualquier fila anterior.
 */
export class ChecksumCalculator {
  // Separador ASCII Unit (0x1F) — nunca aparece en texto normal
  private static readonly SEP = "\x1F";

  /**
   * calculateDVH — Hash SHA-256 de los 9 campos críticos de una fila.
   *
   * El separador previene colisiones: "LOG" + "IN" ≠ "LO" + "GIN"
   */
  static calculateDVH(row: Omit<AuditLogRow, "dvh" | "dvv">): string {
    const payload = [
      row.id_log.toString(),
      row.action,
      row.entity_name,
      row.entity_id,
      (row.id_user ?? "").toString(),
      row.ip_address,
      row.old_values ?? "",
      row.new_values ?? "",
      row.created_at.toISOString(),
    ].join(ChecksumCalculator.SEP);

    return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
  }

  /**
   * calculateChainedDVV — DVV encadenado.
   *
   * @param previousDVV  DVV de la fila anterior. NULL solo para la primera fila.
   * @param currentDVH   DVH de la fila actual.
   */
  static calculateChainedDVV(previousDVV: string | null, currentDVH: string): string {
    if (previousDVV === null) return currentDVH;

    const chain = `${previousDVV}${ChecksumCalculator.SEP}${currentDVH}`;
    return crypto.createHash("sha256").update(chain, "utf8").digest("hex");
  }

  /**
   * validateTableIntegrity — Recorre TODAS las filas en orden y recalcula DVH + DVV.
   *
   * Ejecutar en transacción READ ONLY REPEATABLE READ para evitar lecturas sucias.
   * Complejidad: O(n)
   */
  static validateTableIntegrity(rows: AuditLogRow[]): IntegrityResult {
    if (rows.length === 0) {
      return { isValid: true, corruptedRow: null, reason: "Tabla vacía — OK" };
    }

    let previousDVV: string | null = null;

    for (const row of rows) {
      // ── Paso 1: verificar DVH de esta fila
      const expectedDVH = ChecksumCalculator.calculateDVH(row);
      if (expectedDVH !== row.dvh) {
        return {
          isValid:      false,
          corruptedRow: row.id_log,
          reason:       `Fila ${row.id_log}: DVH inválido. Un campo fue modificado directamente en BD.`,
        };
      }

      // ── Paso 2: verificar DVV encadenado
      const expectedDVV = ChecksumCalculator.calculateChainedDVV(previousDVV, expectedDVH);
      if (expectedDVV !== row.dvv) {
        return {
          isValid:      false,
          corruptedRow: row.id_log,
          reason:       `Fila ${row.id_log}: DVV roto. Se eliminó, insertó o reordenó una fila anterior.`,
        };
      }

      previousDVV = expectedDVV;
    }

    return {
      isValid:      true,
      corruptedRow: null,
      reason:       `${rows.length} filas verificadas — integridad confirmada`,
    };
  }
}
