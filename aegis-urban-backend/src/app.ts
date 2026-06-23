import "./config/env";            // Validar variables de entorno primero
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { env } from "./config/env";
import { db } from "./config/database";
import { errorMiddleware } from "./shared/errors/error.middleware";

const app: Application = express();

// ── Creamos el servidor HTTP separado del app de Express.
// Razón: socket.io en Sprint 3 necesita adjuntarse al servidorHttp,
// no directamente al objeto Express. Lo hacemos desde el inicio
// para no tener que refactorizar cuando llegue ese sprint.
const servidorHttp = createServer(app);

// ══════════════════════════════════════════════════════════════
// MIDDLEWARES GLOBALES
// ══════════════════════════════════════════════════════════════

// Seguridad: configura headers HTTP de protección (X-Frame, CSP, etc.)
app.use(helmet());

// CORS: solo acepta requests del frontend
app.use(cors({
  origin:         env.FRONTEND_URL,
  credentials:    true,
  methods:        ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Parsing de body JSON y URL-encoded
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging de requests HTTP
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// ══════════════════════════════════════════════════════════════
// RUTAS BASE
// ══════════════════════════════════════════════════════════════

// GET /api/health — Verifica que el servidor y la BD estén activos
app.get("/api/health", async (_req: Request, res: Response) => {
  const bdOk    = await db.verificarConexion();
  const estadsBd = db.obtenerEstadisticas();

  res.status(bdOk ? 200 : 503).json({
    estado:      bdOk ? "ok" : "degradado",
    servicio:    "AEGIS Urban API",
    version:     "1.0.0",
    entorno:     env.NODE_ENV,
    timestamp:   new Date().toISOString(),
    baseDatos: {
      estado:    bdOk ? "conectada" : "desconectada",
      ...estadsBd,
    },
  });
});

// ══════════════════════════════════════════════════════════════
// RUTAS DE MÓDULOS (se irán agregando por sprint)
// ══════════════════════════════════════════════════════════════
import rutaAuth from "./modules/auth/auth.controller";
app.use("/api/auth", rutaAuth);


// ══════════════════════════════════════════════════════════════
// MANEJO DE ERRORES
// ══════════════════════════════════════════════════════════════

// 404 para rutas no registradas
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});

// Handler global de errores (debe ser el último middleware)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorMiddleware(err, req, res, next);
});

// ══════════════════════════════════════════════════════════════
// ARRANQUE DEL SERVIDOR
// ══════════════════════════════════════════════════════════════

servidorHttp.listen(env.PORT, () => {
  console.log(`\n✅ AEGIS Urban API corriendo en http://localhost:${env.PORT}`);
  console.log(`📡 Health: http://localhost:${env.PORT}/api/health`);
  console.log(`🌍 Entorno: ${env.NODE_ENV}\n`);
});

// ── Apagado graceful (importante para Docker y CI)
const apagarServidor = async (senal: string) => {
  console.log(`\n[${senal}] Cerrando servidor...`);
  servidorHttp.close(async () => {
    await db.cerrar();
    console.log("Servidor cerrado correctamente.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => apagarServidor("SIGTERM"));
process.on("SIGINT",  () => apagarServidor("SIGINT"));

export { app, servidorHttp };
