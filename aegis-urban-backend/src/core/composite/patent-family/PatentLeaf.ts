import { IPermissionComponent } from "./IPermissionComponent";
import { HttpMethod } from "../../../shared/types/domain.types";

/**
 * PatentLeaf — Hoja del Composite.
 *
 * Representa un permiso atómico e indivisible.
 * No tiene hijos. hasPermission() compara directamente
 * el recurso y método HTTP solicitado con los suyos.
 */
export class PatentLeaf implements IPermissionComponent {
  constructor(
    private readonly code:       string,
    private readonly resource:   string,
    private readonly httpMethod: HttpMethod
  ) {}

  getCode(): string { return this.code; }

  hasPermission(resource: string, method: string): boolean {
    // Comparación exacta. La normalización a mayúsculas previene errores de capitalización.
    return (
      this.resource   === resource &&
      this.httpMethod === method.toUpperCase()
    );
  }
}
