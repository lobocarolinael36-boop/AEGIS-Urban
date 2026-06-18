import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../../config/env";
import { db } from "../../config/database";
import { UnauthorizedError } from "../../shared/errors/AppError";

export interface PayloadToken {
  sub:        number;     // id_user
  usuario:    string;
  idFamilia:  number;
  familia:    string;
  iat?:       number;
  exp?:       number;
}

export class GestorJwt {
  /** Genera un JWT firmado con los datos del usuario. */
  static firmar(payload: Omit<PayloadToken, "iat" | "exp">): string {
    return jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn as jwt.SignOptions["expiresIn"],
    });
  }

  /** Verifica y decodifica un JWT. Lanza UnauthorizedError si es inválido o expirado. */
  static verificar(token: string): PayloadToken {
    try {
      return jwt.verify(token, env.jwt.secret) as PayloadToken;
    } catch {
      throw new UnauthorizedError("Token inválido o expirado");
    }
  }

  /** SHA-256 del token completo — se almacena en session_token para la blacklist. */
  static hashear(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /** Verifica que el token no esté en la blacklist (revocado). */
  static async estaRevocado(hashToken: string): Promise<boolean> {
    const resultado = await db.consultar<{ is_revoked: boolean }>(
      "SELECT is_revoked FROM session_token WHERE token_hash = $1",
      [hashToken]
    );
    if (resultado.rows.length === 0) return true; // no registrado = inválido
    return resultado.rows[0].is_revoked;
  }

  /** Registra el token en BD al iniciar sesión. */
  static async registrar(
    hashToken:    string,
    idUsuario:    number,
    direccionIp:  string,
    agenteUsuario: string,
    expiraEn:     Date
  ): Promise<void> {
    await db.consultar(
      `INSERT INTO session_token (id_user, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [idUsuario, hashToken, direccionIp, agenteUsuario, expiraEn]
    );
  }

  /** Revoca el token en BD al cerrar sesión. */
  static async revocar(hashToken: string): Promise<void> {
    await db.consultar(
      "UPDATE session_token SET is_revoked = TRUE WHERE token_hash = $1",
      [hashToken]
    );
  }
}
