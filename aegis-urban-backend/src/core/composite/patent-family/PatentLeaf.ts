import { IComponentePermiso } from "./IPermissionComponent";
import { HttpMethod } from "../../../shared/types/domain.types";

/**
 * HojaPatente — Hoja del Composite.
 *
 * Representa un permiso atómico e indivisible.
 * No tiene hijos. tienePermiso() compara directamente
 * el recurso y método HTTP solicitado con los suyos.
 */
export class HojaPatente implements IComponentePermiso {
  constructor(
    private readonly codigo:     string,
    private readonly recurso:    string,
    private readonly metodoHttp: HttpMethod
  ) {}

  obtenerCodigo(): string { return this.codigo; }

  tienePermiso(recurso: string, metodo: string): boolean {
    // Comparación exacta. toUpperCase() previene errores de capitalización.
    return (
      this.recurso    === recurso &&
      this.metodoHttp === metodo.toUpperCase()
    );
  }
}
