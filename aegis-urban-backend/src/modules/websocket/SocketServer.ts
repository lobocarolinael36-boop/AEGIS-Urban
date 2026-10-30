import { Server as HttpServer } from "http";
import { Server as IoServer, Socket } from "socket.io";
import { env } from "../../config/env";
import { eventBus, EVENTOS } from "../../core/events/EventBus";
import { GestorJwt } from "../auth/jwt.utils";
import { db } from "../../config/database";
import { familiaTienePermiso } from "../../security/access-control/PermissionGuard";

let io: IoServer | null = null;

export function inicializarWebSocket(servidorHttp: HttpServer): IoServer {
  io = new IoServer(servidorHttp, {
    cors: {
      origin:      env.FRONTEND_URL,
      methods:     ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) return next(new Error("Autenticación requerida"));

    try {
      const payload = GestorJwt.verificar(token);
      const hashToken = GestorJwt.hashear(token);
      if (await GestorJwt.estaRevocado(hashToken)) return next(new Error("Sesión inválida"));

      const usuario = await db.consultar<{ activo: boolean }>(`
        SELECT u.is_active AND f.is_active AS activo
        FROM users u JOIN family f ON f.id_family = u.id_family
        WHERE u.id_user = $1 AND u.id_family = $2
      `, [payload.sub, payload.idFamilia]);
      if (!usuario.rows[0]?.activo) return next(new Error("Cuenta inactiva"));

      const puedeVerSensores = await familiaTienePermiso(payload.idFamilia, "/api/sensores", "GET");
      const puedeVerAlertas = await familiaTienePermiso(payload.idFamilia, "/api/alertas", "GET");
      if (!puedeVerSensores || !puedeVerAlertas) return next(new Error("Sin permisos para el canal operativo"));

      socket.data.tokenHash = hashToken;
      socket.data.usuario = { id: payload.sub, familia: payload.familia };
      socket.data.expiraEn = payload.exp;
      next();
    } catch {
      next(new Error("Token inválido o no autorizado"));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[WS] Cliente autorizado conectado: ${socket.id}`);

    const tiempoHastaExpirar = socket.data.expiraEn
      ? Math.max(0, socket.data.expiraEn * 1000 - Date.now())
      : null;
    const temporizador = tiempoHastaExpirar === null ? null : setTimeout(() => socket.disconnect(true), tiempoHastaExpirar);

    socket.on("suscribir:nodo", (idNodo: number) => {
      if (Number.isInteger(idNodo) && idNodo > 0) socket.join(`nodo:${idNodo}`);
    });

    socket.on("disconnect", () => {
      if (temporizador) clearTimeout(temporizador);
      console.log(`[WS] Cliente desconectado: ${socket.id}`);
    });
  });

  // Reenvía eventos del EventBus a todos los clientes WebSocket conectados
  eventBus.suscribir(EVENTOS.LECTURA_NUEVA, (datos) => {
    io?.emit("telemetria:nueva", datos);
  });

  eventBus.suscribir(EVENTOS.ALERTA_CREADA, (datos) => {
    io?.emit("alerta:nueva", datos);
  });

  eventBus.suscribir(EVENTOS.EVACUACION_INICIADA, (datos) => {
    io?.emit("evacuacion:iniciada", datos);
  });

  console.log("[WS] Socket.io inicializado");
  return io;
}

export function desconectarSesion(token: string): void {
  if (!io) return;
  const hashToken = GestorJwt.hashear(token);
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.tokenHash === hashToken) socket.disconnect(true);
  }
}

export function obtenerIo(): IoServer | null {
  return io;
}
