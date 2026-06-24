import { Server as HttpServer } from "http";
import { Server as IoServer, Socket } from "socket.io";
import { env } from "../../config/env";
import { eventBus, EVENTOS } from "../../core/events/EventBus";

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

  io.on("connection", (socket: Socket) => {
    console.log(`[WS] Cliente conectado: ${socket.id}`);

    socket.on("suscribir:nodo", (idNodo: number) => {
      socket.join(`nodo:${idNodo}`);
    });

    socket.on("disconnect", () => {
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

export function obtenerIo(): IoServer | null {
  return io;
}
