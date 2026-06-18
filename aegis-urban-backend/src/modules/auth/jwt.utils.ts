import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../../config/env";
import { db } from "../../config/database";
import { UnauthorizedError } from "../../shared/errors/AppError";

export interface JwtPayload {
  sub:        number;     // id_user
  username:   string;
  familyId:   number;
  familyName: string;
  iat?:       number;
  exp?:       number;
}

export class JwtUtils {
  /** Genera un JWT firmado con los datos del usuario. */
  static sign(payload: Omit<JwtPayload, "iat" | "exp">): string {
    return jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn as jwt.SignOptions["expiresIn"],
    });
  }

  /** Verifica y decodifica un JWT. Lanza UnauthorizedError si es inválido. */
  static verify(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.jwt.secret) as JwtPayload;
    } catch {
      throw new UnauthorizedError("Token inválido o expirado");
    }
  }

  /** SHA-256 del token completo — se almacena en session_token para la blacklist. */
  static hash(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /** Verifica que el token no esté en la blacklist (revocado). */
  static async isRevoked(tokenHash: string): Promise<boolean> {
    const result = await db.query<{ is_revoked: boolean }>(
      "SELECT is_revoked FROM session_token WHERE token_hash = $1",
      [tokenHash]
    );
    if (result.rows.length === 0) return true; // no registrado = inválido
    return result.rows[0].is_revoked;
  }

  /** Registra el token en BD al login. */
  static async register(
    tokenHash: string,
    userId: number,
    ipAddress: string,
    userAgent: string,
    expiresAt: Date
  ): Promise<void> {
    await db.query(
      `INSERT INTO session_token (id_user, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, ipAddress, userAgent, expiresAt]
    );
  }

  /** Revoca el token en BD al logout. */
  static async revoke(tokenHash: string): Promise<void> {
    await db.query(
      "UPDATE session_token SET is_revoked = TRUE WHERE token_hash = $1",
      [tokenHash]
    );
  }
}
