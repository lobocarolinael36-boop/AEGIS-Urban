import bcrypt from "bcrypt";

/**
 * BCryptHasher — Hash IRREVERSIBLE para contraseñas.
 *
 * Factor de costo 12: cada verificación tarda ~250ms,
 * lo que hace inviables los ataques de fuerza bruta masivos.
 * NUNCA usar para datos que necesiten descifrarse (usar AESCipher para eso).
 */
export class BCryptHasher {
  private static readonly FACTOR_COSTO = 12;

  /** Hashea una contraseña. Retorna el hash almacenable en BD. */
  static async hashear(contrasena: string): Promise<string> {
    return bcrypt.hash(contrasena, BCryptHasher.FACTOR_COSTO);
  }

  /** Verifica si una contraseña en texto plano coincide con su hash. */
  static async verificarContrasena(contrasenaPlana: string, hash: string): Promise<boolean> {
    return bcrypt.compare(contrasenaPlana, hash);
  }
}
