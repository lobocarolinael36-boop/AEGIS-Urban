import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { requireAuth } from "./auth.middleware";
import { BadRequestError } from "../../shared/errors/AppError";

const router      = Router();
const authService = new AuthService();

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      throw new BadRequestError("username y password son requeridos");
    }

    const ipAddress = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace("::ffff:", "");
    const userAgent = req.headers["user-agent"] ?? "unknown";

    const result = await authService.login(username, password, ipAddress, userAgent);

    res.status(200).json({
      message: "Sesión iniciada correctamente",
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout  (requiere JWT válido)
router.post("/logout", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization!.slice(7);
    await authService.logout(token);
    res.status(200).json({ message: "Sesión cerrada correctamente" });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  (retorna datos del usuario autenticado)
router.get("/me", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getUserById(req.user!.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
