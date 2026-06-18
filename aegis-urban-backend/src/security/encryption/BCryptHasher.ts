import bcrypt from "bcrypt";

/**
 * BCryptHasher — Hash IRREVERSIBLE para contraseñas.
 *
 * Factor de costo 12: cada verificación tarda ~250ms,
 * lo que hace inviables los ataques de fuerza bruta masivos.
 * NUNCA usar para datos que necesiten descifrarse (usar AESCipher para eso).
 */
export class BCryptHasher {
  private static readonly COST_FACTOR = 12;

  /** Hashea una contraseña. Retorna el hash almacenable en BD. */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCryptHasher.COST_FACTOR);
  }

  /** Verifica si una contraseña en texto plano coincide con su hash. */
  static async compare(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
