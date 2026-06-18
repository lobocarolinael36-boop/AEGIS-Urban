import { IComponentePermiso } from "./IPermissionComponent";

/**
 * FamiliaComposite — Nodo compuesto del Composite.
 *
 * Representa un rol/familia que puede contener:
 * - HojaPatente (permisos atómicos)
 * - Otras FamiliaComposite (sub-roles o jerarquías)
 *
 * tienePermiso() evalúa con OR lógico sobre todos los hijos.
 * Si ALGÚN hijo tiene el permiso, la familia lo tiene.
 * La recursión se encarga de profundizar en sub-familias automáticamente.
 */
export class FamiliaComposite implements IComponentePermiso {
  private hijos: IComponentePermiso[] = [];

  constructor(private readonly nombreFamilia: string) {}

  obtenerCodigo(): string { return this.nombreFamilia; }

  agregar(componente: IComponentePermiso): this {
    this.hijos.push(componente);
    return this;
  }

  eliminar(codigo: string): void {
    this.hijos = this.hijos.filter(h => h.obtenerCodigo() !== codigo);
  }

  /**
   * Evaluación recursiva de permisos.
   * Recorre todos los hijos con Array.some() — cortocircuita en el primer true.
   */
  tienePermiso(recurso: string, metodo: string): boolean {
    return this.hijos.some(hijo => hijo.tienePermiso(recurso, metodo));
  }

  /** Lista los códigos directos de los hijos (para depuración / UI). */
  obtenerCodigosHijos(): string[] {
    return this.hijos.map(h => h.obtenerCodigo());
  }
}
