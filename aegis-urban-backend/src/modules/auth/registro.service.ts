import { z } from "zod";
import { db } from "../../config/database";
import { LEGAL } from "../../config/legal";
import { BCryptHasher } from "../../security/encryption/BCryptHasher";
import { bitacora } from "../../integrity/BitacoraService";
import { AppError, BadRequestError, ConflictError } from "../../shared/errors/AppError";

/** Datos mínimos (principio de minimización, Ley 25.326 art. 4): solo usuario, email y contraseña. */
export const esquemaRegistro = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{4,30}$/, "Usuario: 4 a 30 caracteres (letras, números, _ o .)"),
  email:    z.string().trim().toLowerCase().email("Email inválido").max(255),
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres")
    .regex(/[A-Za-z]/, "La contraseña debe incluir letras")
    .regex(/[0-9]/, "La contraseña debe incluir números")
    .max(128),
  // Consentimientos: los tres primeros son obligatorios para poder registrarse.
  aceptaTerminos:     z.literal(true, { errorMap: () => ({ message: "Tenés que aceptar los Términos y Condiciones" }) }),
  aceptaPrivacidad:   z.literal(true, { errorMap: () => ({ message: "Tenés que aceptar la Política de Privacidad" }) }),
  declaraEdad:        z.literal(true, { errorMap: () => ({ message: `Tenés que declarar que sos mayor de ${LEGAL.EDAD_MINIMA} años o contar con autorización de tu tutor` }) }),
  // La ubicación es opcional y se puede revocar: sin ella la app funciona con ubicación manual.
  aceptaUbicacion:    z.boolean().default(false),
  versionTerminos:    z.string(),
  versionPrivacidad:  z.string(),
});

export type DatosRegistro = z.infer<typeof esquemaRegistro>;

export function validarRegistro(body: unknown): DatosRegistro {
  const r = esquemaRegistro.safeParse(body);
  if (!r.success) throw new BadRequestError(r.error.issues[0]?.message ?? "Datos de registro inválidos");
  if (r.data.versionTerminos !== LEGAL.VERSION_TERMINOS || r.data.versionPrivacidad !== LEGAL.VERSION_PRIVACIDAD) {
    throw new AppError("Los textos legales cambiaron. Recargá la página y volvé a leerlos.", 409);
  }
  return r.data;
}

export class RegistroService {
  /** Crea un CIUDADANO verificado y guarda la evidencia de cada consentimiento, todo en una transacción. */
  async registrar(datos: DatosRegistro, ip: string): Promise<number> {
    const hash = await BCryptHasher.hashear(datos.password);
    const cliente = await db.obtenerCliente();
    try {
      await cliente.query("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED");

      const existe = await cliente.query(
        "SELECT 1 FROM users WHERE username = $1 OR email = $2", [datos.username, datos.email]);
      if (existe.rowCount) throw new ConflictError("El usuario o el email ya están registrados");

      const { rows } = await cliente.query<{ id_user: number }>(
        `INSERT INTO users (username, email, password_hash, id_family, terms_verified_at)
         SELECT $1, $2, $3, f.id_family, NOW() FROM family f WHERE f.name = 'CIUDADANO'
         RETURNING id_user`, [datos.username, datos.email, hash, ]);
      if (!rows[0]) throw new AppError("El rol CIUDADANO no existe: aplicá la migración 012", 500);
      const idUsuario = rows[0].id_user;

      const consentimientos: [string, string, boolean][] = [
        ["TERMS",    LEGAL.VERSION_TERMINOS,   true],
        ["PRIVACY",  LEGAL.VERSION_PRIVACIDAD, true],
        ["AGE",      LEGAL.VERSION_TERMINOS,   true],
        ["LOCATION", LEGAL.VERSION_UBICACION,  datos.aceptaUbicacion],
      ];
      for (const [tipo, version, otorgado] of consentimientos) {
        await cliente.query(
          `INSERT INTO user_consent (id_user, consent_type, version, granted, ip_address)
           VALUES ($1, $2, $3, $4, $5)`, [idUsuario, tipo, version, otorgado, ip]);
      }

      await bitacora.registrarEventoEnTransaccion(cliente, {
        accion: "USER_REGISTERED", nombreEntidad: "users", idEntidad: String(idUsuario),
        idUsuario, direccionIp: ip,
        valoresNuevos: { familia: "CIUDADANO", terminos: LEGAL.VERSION_TERMINOS,
          privacidad: LEGAL.VERSION_PRIVACIDAD, ubicacion: datos.aceptaUbicacion },
      });
      await cliente.query("COMMIT");
      return idUsuario;
    } catch (e) {
      await cliente.query("ROLLBACK");
      throw e;
    } finally {
      cliente.release();
    }
  }

  /** Otorga o revoca el permiso de ubicación; el historial se conserva. */
  async fijarConsentimientoUbicacion(idUsuario: number, acepta: boolean, ip: string): Promise<void> {
    await db.consultar(
      `INSERT INTO user_consent (id_user, consent_type, version, granted, ip_address)
       VALUES ($1, 'LOCATION', $2, $3, $4)`, [idUsuario, LEGAL.VERSION_UBICACION, acepta, ip]);
    await bitacora.registrarEvento({
      accion: acepta ? "LOCATION_CONSENT_GRANTED" : "LOCATION_CONSENT_REVOKED",
      nombreEntidad: "users", idEntidad: String(idUsuario), idUsuario, direccionIp: ip,
    });
  }

  /** Derecho de acceso (art. 14 Ley 25.326): devuelve los datos propios y el historial de consentimientos. */
  async misDatos(idUsuario: number) {
    const [perfil, consentimientos] = await Promise.all([
      db.consultar(`SELECT u.id_user, u.username, u.email, u.created_at, u.last_login, u.terms_verified_at,
                           f.name AS familia
                      FROM users u LEFT JOIN family f ON f.id_family = u.id_family WHERE u.id_user = $1`, [idUsuario]),
      db.consultar(`SELECT consent_type, version, granted, created_at FROM user_consent
                     WHERE id_user = $1 ORDER BY created_at, id_consent`, [idUsuario]),
    ]);
    const ultimaUbicacion = [...consentimientos.rows].reverse().find((c) => c.consent_type === "LOCATION");
    return {
      perfil: perfil.rows[0],
      ubicacionConsentida: ultimaUbicacion?.granted === true,
      consentimientos: consentimientos.rows,
    };
  }

  /** Derecho de supresión (art. 16): desactiva la cuenta y anonimiza los datos personales. */
  async darDeBaja(idUsuario: number, ip: string): Promise<void> {
    await db.consultar(
      `UPDATE users SET is_active = FALSE, username = 'baja-' || id_user, email = 'baja-' || id_user || '@anonimo.invalid',
              password_hash = '!', full_name_enc = NULL, dni_enc = NULL, phone_enc = NULL
        WHERE id_user = $1`, [idUsuario]);
    await db.consultar("DELETE FROM session_token WHERE id_user = $1", [idUsuario]);
    await bitacora.registrarEvento({
      accion: "USER_DELETED_BY_REQUEST", nombreEntidad: "users", idEntidad: String(idUsuario),
      idUsuario, direccionIp: ip,
    });
  }
}

export const registroService = new RegistroService();
