/**
 * Versiones vigentes de los textos legales. Si se modifica el contenido de los
 * términos o la política de privacidad, hay que subir la versión (también en
 * aegis-urban-frontend/src/legal/textos.ts): el registro rechaza versiones viejas
 * y cada consentimiento guardado queda asociado a la versión que el usuario leyó.
 */
export const LEGAL = {
  VERSION_TERMINOS:   "2026-10-30.2",
  VERSION_PRIVACIDAD: "2026-10-30.2",
  VERSION_UBICACION:  "2026-10-30.2",
  EDAD_MINIMA:        18,
} as const;
