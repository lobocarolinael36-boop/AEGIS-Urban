import { Request, Response, NextFunction } from "express";
import { JwtUtils } from "./jwt.utils";
import { UnauthorizedError } from "../../shared/errors/AppError";

/**
 * requireAuth — Middleware que verifica el JWT en cada request protegido.
 *
 * Extrae el token del header "Authorization: Bearer <token>",
 * lo verifica con JwtUtils y comprueba que no esté revocado.
 * Si todo es válido, adjunta req.user para que los controllers lo usen.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Token no proporcionado");
    }

    const token     = authHeader.slice(7);
    const payload   = JwtUtils.verify(token);
    const tokenHash = JwtUtils.hash(token);

    if (await JwtUtils.isRevoked(tokenHash)) {
      throw new UnauthorizedError("Sesión cerrada. Iniciá sesión nuevamente.");
    }

    req.user = {
      id:         payload.sub,
      username:   payload.username,
      familyId:   payload.familyId,
      familyName: payload.familyName,
    };

    next();
  } catch (err) {
    next(err);
  }
}
