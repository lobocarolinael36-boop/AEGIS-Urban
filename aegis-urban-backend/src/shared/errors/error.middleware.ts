import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";
import { env } from "../../config/env";

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error:   err.message,
      code:    err.name,
    });
    return;
  }

  if ((err as NodeJS.ErrnoException).code === "ECONNREFUSED") {
    res.status(503).json({ error: "Base de datos no disponible", code: "ServiceUnavailable" });
    return;
  }

  // Error inesperado — no exponer detalles en producción
  console.error("[ERROR NO MANEJADO]", err);
  res.status(500).json({
    error: "Error interno del servidor",
    ...(env.NODE_ENV === "development" && { detail: err.message }),
  });
}
