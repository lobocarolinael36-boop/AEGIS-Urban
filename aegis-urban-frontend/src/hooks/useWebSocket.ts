import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

export interface LecturaTelemetria {
  idSensor:      number;
  tipoSensor:    string;
  valor:         number;
  unidad:        string;
  estadoLectura: "OK" | "WARNING" | "CRITICAL";
  esSimulada:    boolean;
  registradaEn:  string;
}

export interface AlertaNueva {
  idAlerta: number;
  idSensor: number;
  nivel:    string;
  tipo:     string;
  mensaje:  string;
  creadaEn: string;
}

interface EstadoWS {
  conectado:       boolean;
  ultimaLectura:   LecturaTelemetria | null;
  ultimaAlerta:    AlertaNueva | null;
}

export function useWebSocket() {
  const token            = useAuthStore((s) => s.token);
  const socketRef        = useRef<Socket | null>(null);
  const [estado, setEstado] = useState<EstadoWS>({
    conectado:     false,
    ultimaLectura: null,
    ultimaAlerta:  null,
  });

  useEffect(() => {
    if (!token) return;

    const socket = io("/", {
      auth:       { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect",    () => setEstado(e => ({ ...e, conectado: true })));
    socket.on("disconnect", () => setEstado(e => ({ ...e, conectado: false })));

    socket.on("telemetria:nueva", (datos: LecturaTelemetria) => {
      setEstado(e => ({ ...e, ultimaLectura: datos }));
    });

    socket.on("alerta:nueva", (datos: AlertaNueva) => {
      setEstado(e => ({ ...e, ultimaAlerta: datos }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return { ...estado, socket: socketRef.current };
}
