/**
 * IPermissionComponent — Interface del Patrón Composite para Patentes/Familias.
 *
 * Permite tratar una PatentLeaf (permiso individual) y una FamilyComposite
 * (grupo de permisos) de forma idéntica: ambas responden a hasPermission().
 *
 * La magia del Composite es que FamilyComposite.hasPermission() delega
 * recursivamente en sus hijos, sin importar si son hojas o compuestos.
 */
export interface IPermissionComponent {
  getCode(): string;
  hasPermission(resource: string, method: string): boolean;
}
