import { Request, Response, NextFunction } from "express";
import { GestorJwt } from "./jwt.utils";
import { UnauthorizedError } from "../../shared/errors/AppError";

/**
 * requiereAutenticacion — Middleware que verifica el JWT en cada request protegido.
 *
 * Extrae el token del header "Authorization: Bearer <token>",
 * lo verifica con GestorJwt y comprueba que no esté revocado.
 * Si todo es válido, adjunta req.user para que los controllers lo usen.
 */
export async function requiereAutenticacion(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cabeceraAuth = req.headers.authorization;
    if (!cabeceraAuth?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Token no proporcionado");
    }

    const token     = cabeceraAuth.slice(7);
    const payload   = GestorJwt.verificar(token);
    const hashToken = GestorJwt.hashear(token);

    if (await GestorJwt.estaRevocado(hashToken)) {
      throw new UnauthorizedError("Sesión cerrada. Iniciá sesión nuevamente.");
    }

    req.user = {
      id:         payload.sub,
      username:   payload.usuario,
      familyId:   payload.idFamilia,
      familyName: payload.familia,
    };

    next();
  } catch (err) {
    next(err);
  }
}
