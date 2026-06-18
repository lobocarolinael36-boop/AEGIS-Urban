import crypto from "crypto";

export interface FilaBitacora {
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

export interface ResultadoIntegridad {
  esValida:     boolean;
  filaCorrupta: bigint | null;
  motivo:       string;
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
   * calcularDVH — Hash SHA-256 de los 9 campos críticos de una fila.
   *
   * El separador previene colisiones: "LOG" + "IN" ≠ "LO" + "GIN"
   */
  static calcularDVH(fila: Omit<FilaBitacora, "dvh" | "dvv">): string {
    const payload = [
      fila.id_log.toString(),
      fila.action,
      fila.entity_name,
      fila.entity_id,
      (fila.id_user ?? "").toString(),
      fila.ip_address,
      fila.old_values ?? "",
      fila.new_values ?? "",
      fila.created_at.toISOString(),
    ].join(ChecksumCalculator.SEP);

    return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
  }

  /**
   * calcularDVVEncadenado — DVV encadenado tipo blockchain.
   *
   * @param dvvAnterior  DVV de la fila anterior. NULL solo para la primera fila.
   * @param dvhActual    DVH de la fila actual.
   */
  static calcularDVVEncadenado(dvvAnterior: string | null, dvhActual: string): string {
    if (dvvAnterior === null) return dvhActual;

    const cadena = `${dvvAnterior}${ChecksumCalculator.SEP}${dvhActual}`;
    return crypto.createHash("sha256").update(cadena, "utf8").digest("hex");
  }

  /**
   * validarIntegridad — Recorre TODAS las filas en orden y recalcula DVH + DVV.
   *
   * Ejecutar en transacción READ ONLY REPEATABLE READ para evitar lecturas sucias.
   * Complejidad: O(n)
   */
  static validarIntegridad(filas: FilaBitacora[]): ResultadoIntegridad {
    if (filas.length === 0) {
      return { esValida: true, filaCorrupta: null, motivo: "Tabla vacía — OK" };
    }

    let dvvAnterior: string | null = null;

    for (const fila of filas) {
      // ── Paso 1: verificar DVH de esta fila
      const dvhEsperado = ChecksumCalculator.calcularDVH(fila);
      if (dvhEsperado !== fila.dvh) {
        return {
          esValida:     false,
          filaCorrupta: fila.id_log,
          motivo:       `Fila ${fila.id_log}: DVH inválido. Un campo fue modificado directamente en BD.`,
        };
      }

      // ── Paso 2: verificar DVV encadenado
      const dvvEsperado = ChecksumCalculator.calcularDVVEncadenado(dvvAnterior, dvhEsperado);
      if (dvvEsperado !== fila.dvv) {
        return {
          esValida:     false,
          filaCorrupta: fila.id_log,
          motivo:       `Fila ${fila.id_log}: DVV roto. Se eliminó, insertó o reordenó una fila anterior.`,
        };
      }

      dvvAnterior = dvvEsperado;
    }

    return {
      esValida:     true,
      filaCorrupta: null,
      motivo:       `${filas.length} filas verificadas — integridad confirmada`,
    };
  }
}
