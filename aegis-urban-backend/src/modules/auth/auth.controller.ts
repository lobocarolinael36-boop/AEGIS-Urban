import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { requiereAutenticacion } from "./auth.middleware";
import { BadRequestError } from "../../shared/errors/AppError";
import { requierePermiso } from "../../security/access-control/PermissionGuard";
import { desconectarSesion } from "../websocket/SocketServer";
import { registroService, validarRegistro } from "./registro.service";
import { LEGAL } from "../../config/legal";

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
router.post("/logout", requiereAutenticacion, requierePermiso("/api/auth/logout", "POST"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization!.slice(7);
    await servicioAuth.cerrarSesion(token);
    desconectarSesion(token);
    res.status(200).json({ message: "Sesión cerrada correctamente" });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  (retorna datos del usuario autenticado)
router.get("/me", requiereAutenticacion, requierePermiso("/api/auth/me", "GET"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuario = await servicioAuth.obtenerUsuarioPorId(req.user!.id);
    res.status(200).json({ usuario });
  } catch (err) {
    next(err);
  }
});

const ipDe = (req: Request) => (req.ip ?? req.socket.remoteAddress ?? "unknown").replace("::ffff:", "");

// GET /api/auth/legal — versiones vigentes de los textos legales
router.get("/legal", (_req: Request, res: Response) => {
  res.json({ terminos: LEGAL.VERSION_TERMINOS, privacidad: LEGAL.VERSION_PRIVACIDAD, ubicacion: LEGAL.VERSION_UBICACION, edadMinima: LEGAL.EDAD_MINIMA });
});

// POST /api/auth/registro — alta de ciudadano. Exige aceptar términos, privacidad y declarar la edad.
router.post("/registro", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const datos = validarRegistro(req.body);
    const ip = ipDe(req);
    await registroService.registrar(datos, ip);
    const sesion = await servicioAuth.iniciarSesion(datos.username, datos.password, ip, req.headers["user-agent"] ?? "unknown");
    res.status(201).json({
      message: "Cuenta creada y perfil verificado",
      token: sesion.token,
      user: { id: sesion.usuario.id, username: sesion.usuario.username, familyId: sesion.usuario.idFamilia, familyName: sesion.usuario.familia },
      ubicacionConsentida: datos.aceptaUbicacion,
    });
  } catch (err) { next(err); }
});

// PUT /api/auth/consentimiento-ubicacion — otorgar o revocar el permiso de ubicación
router.put("/consentimiento-ubicacion", requiereAutenticacion, requierePermiso("/api/auth/consentimiento-ubicacion", "PUT"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (typeof req.body?.acepta !== "boolean") throw new BadRequestError("'acepta' debe ser true o false");
    await registroService.fijarConsentimientoUbicacion(req.user!.id, req.body.acepta, ipDe(req));
    res.json({ ubicacionConsentida: req.body.acepta });
  } catch (err) { next(err); }
});

// GET /api/auth/mis-datos — derecho de acceso (Ley 25.326, art. 14)
router.get("/mis-datos", requiereAutenticacion, requierePermiso("/api/auth/mis-datos", "GET"), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await registroService.misDatos(req.user!.id)); } catch (err) { next(err); }
});

// DELETE /api/auth/mis-datos — derecho de supresión (Ley 25.326, art. 16)
router.delete("/mis-datos", requiereAutenticacion, requierePermiso("/api/auth/mis-datos", "DELETE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await registroService.darDeBaja(req.user!.id, ipDe(req));
    res.json({ message: "Tu cuenta fue dada de baja y tus datos personales anonimizados" });
  } catch (err) { next(err); }
});

export default router;
