/**
 * IComponentePermiso — Interface del Patrón Composite para Patentes/Familias.
 *
 * Permite tratar una HojaPatente (permiso individual) y una FamiliaComposite
 * (grupo de permisos) de forma idéntica: ambas responden a tienePermiso().
 *
 * La magia del Composite es que FamiliaComposite.tienePermiso() delega
 * recursivamente en sus hijos, sin importar si son hojas o compuestos.
 */
export interface IComponentePermiso {
  obtenerCodigo(): string;
  tienePermiso(recurso: string, metodo: string): boolean;
}
