import { IPermissionComponent } from "./IPermissionComponent";

/**
 * FamilyComposite — Nodo compuesto del Composite.
 *
 * Representa un rol/familia que puede contener:
 * - PatentLeaf (permisos atómicos)
 * - Otras FamilyComposite (sub-roles o jerarquías)
 *
 * hasPermission() evalúa con OR lógico sobre todos los hijos.
 * Si ALGÚN hijo tiene el permiso, la familia lo tiene.
 * La recursión se encarga de profundizar en sub-familias automáticamente.
 */
export class FamilyComposite implements IPermissionComponent {
  private children: IPermissionComponent[] = [];

  constructor(private readonly familyName: string) {}

  getCode(): string { return this.familyName; }

  add(component: IPermissionComponent): this {
    this.children.push(component);
    return this;
  }

  remove(code: string): void {
    this.children = this.children.filter(c => c.getCode() !== code);
  }

  /**
   * Evaluación recursiva de permisos.
   * Recorre todos los hijos con Array.some() — cortocircuita en el primer true.
   */
  hasPermission(resource: string, method: string): boolean {
    return this.children.some(child => child.hasPermission(resource, method));
  }

  /** Lista los códigos directos de los hijos (para debugging / UI). */
  getChildCodes(): string[] {
    return this.children.map(c => c.getCode());
  }
}
