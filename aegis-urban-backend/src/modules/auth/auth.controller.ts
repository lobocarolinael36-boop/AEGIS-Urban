import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { requiereAutenticacion } from "./auth.middleware";
import { BadRequestError } from "../../shared/errors/AppError";

const router       = Router();
const servicioAuth = new AuthService();

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      throw new BadRequestError("username y password son requeridos");
    }

    const direccionIp  = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace("::ffff:", "");
    const agenteUsuario = req.headers["user-agent"] ?? "unknown";

    const resultado = await servicioAuth.iniciarSesion(username, password, direccionIp, agenteUsuario);

    res.status(200).json({
      message: "Sesión iniciada correctamente",
      token:   resultado.token,
      user: {
        id:         resultado.usuario.id,
        username:   resultado.usuario.username,
        familyId:   resultado.usuario.idFamilia,
        familyName: resultado.usuario.familia,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout  (requiere JWT válido)
router.post("/logout", requiereAutenticacion, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization!.slice(7);
    await servicioAuth.cerrarSesion(token);
    res.status(200).json({ message: "Sesión cerrada correctamente" });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  (retorna datos del usuario autenticado)
router.get("/me", requiereAutenticacion, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuario = await servicioAuth.obtenerUsuarioPorId(req.user!.id);
    res.status(200).json({ usuario });
  } catch (err) {
    next(err);
  }
});

export default router;
