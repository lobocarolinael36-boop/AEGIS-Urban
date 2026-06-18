/** Clase base para todos los errores de dominio de AEGIS Urban. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError      extends AppError { constructor(m = "Recurso no encontrado")       { super(m, 404); } }
export class UnauthorizedError  extends AppError { constructor(m = "No autenticado")              { super(m, 401); } }
export class ForbiddenError     extends AppError { constructor(m = "Acceso denegado")             { super(m, 403); } }
export class BadRequestError    extends AppError { constructor(m = "Solicitud inválida")          { super(m, 400); } }
export class ConflictError      extends AppError { constructor(m = "Conflicto de datos")          { super(m, 409); } }
export class IntegrityError     extends AppError { constructor(m = "Violación de integridad DVH/DVV") { super(m, 500); } }
