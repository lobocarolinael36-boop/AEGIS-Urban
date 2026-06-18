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
// Razón: socket.io en Sprint 3 necesita adjuntarse al httpServer,
// no directamente al objeto Express. Lo hacemos desde el inicio
// para no tener que refactorizar cuando llegue ese sprint.
const httpServer = createServer(app);

// ══════════════════════════════════════════════════════════════
// MIDDLEWARES GLOBALES
// ══════════════════════════════════════════════════════════════

// Seguridad: configura headers HTTP de protección (X-Frame, CSP, etc.)
app.use(helmet());

// CORS: solo acepta requests del frontend
app.use(cors({
  origin:      env.FRONTEND_URL,
  credentials: true,
  methods:     ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
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
  const dbOk    = await db.healthCheck();
  const dbStats = db.getStats();

  res.status(dbOk ? 200 : 503).json({
    status:      dbOk ? "ok" : "degraded",
    service:     "AEGIS Urban API",
    version:     "1.0.0",
    environment: env.NODE_ENV,
    timestamp:   new Date().toISOString(),
    database: {
      status:  dbOk ? "connected" : "disconnected",
      ...dbStats,
    },
  });
});

// ══════════════════════════════════════════════════════════════
// RUTAS DE MÓDULOS (se irán agregando por sprint)
// ══════════════════════════════════════════════════════════════
// Sprint 2: import authRouter from './modules/auth/auth.controller';
//           app.use('/api/auth', authRouter);


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

httpServer.listen(env.PORT, () => {
  console.log(`\n✅ AEGIS Urban API corriendo en http://localhost:${env.PORT}`);
  console.log(`📡 Health: http://localhost:${env.PORT}/api/health`);
  console.log(`🌍 Entorno: ${env.NODE_ENV}\n`);
});

// ── Shutdown graceful (importante para Docker y CI)
const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Cerrando servidor...`);
  httpServer.close(async () => {
    await db.close();
    console.log("Servidor cerrado correctamente.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

export { app, httpServer };
