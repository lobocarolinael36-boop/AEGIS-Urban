import "./config/env";
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { env } from "./config/env";
import { db } from "./config/database";
import { errorMiddleware } from "./shared/errors/error.middleware";
import { inicializarWebSocket } from "./modules/websocket/SocketServer";
import { alertHandler } from "./core/events/handlers/AlertHandler";
import { bitacoraHandler } from "./core/events/handlers/BitacoraHandler";
import { telemetryService } from "./modules/telemetry/telemetry.service";

// ── Rutas
import rutaAuth       from "./modules/auth/auth.controller";
import rutaSensores   from "./modules/sensors/sensor.controller";
import rutaTelemetry  from "./modules/telemetry/telemetry.controller";
import rutaAlertas    from "./modules/alerts/alert.controller";
import rutaAdmin      from "./modules/admin/admin.controller";

const app: Application = express();
const servidorHttp = createServer(app);

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:         env.FRONTEND_URL,
  credentials:    true,
  methods:        ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", async (_req: Request, res: Response) => {
  const bdOk     = await db.verificarConexion();
  const estadsBd = db.obtenerEstadisticas();
  res.status(bdOk ? 200 : 503).json({
    estado:    bdOk ? "ok" : "degradado",
    servicio:  "AEGIS Urban API",
    version:   "1.0.0",
    entorno:   env.NODE_ENV,
    timestamp: new Date().toISOString(),
    baseDatos: { estado: bdOk ? "conectada" : "desconectada", ...estadsBd },
  });
});

// ── Rutas de módulos ──────────────────────────────────────────────────────────
app.use("/api/auth",      rutaAuth);
app.use("/api/sensores",  rutaSensores);
app.use("/api/telemetry", rutaTelemetry);
app.use("/api/alertas",   rutaAlertas);
app.use("/api/admin",     rutaAdmin);

// ── Manejo de errores ─────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorMiddleware(err, req, res, next);
});

// ── Inicialización al arrancar ────────────────────────────────────────────────
servidorHttp.listen(env.PORT, async () => {
  console.log(`\n✅ AEGIS Urban API corriendo en http://localhost:${env.PORT}`);
  console.log(`📡 Health: http://localhost:${env.PORT}/api/health`);
  console.log(`🌍 Entorno: ${env.NODE_ENV}\n`);

  // Inicializa WebSocket
  inicializarWebSocket(servidorHttp);

  // Inicializa handlers del EventBus
  alertHandler.iniciar();
  bitacoraHandler.iniciar();

  // Motor de simulación: cada 15 segundos genera lecturas para sensores SIMULATED
  setInterval(async () => {
    try { await telemetryService.ejecutarCicloSimulacion(); } catch { /* silent */ }
  }, 15_000);

  console.log("⚡ Motor de simulación activo (15s/ciclo)");
});

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
