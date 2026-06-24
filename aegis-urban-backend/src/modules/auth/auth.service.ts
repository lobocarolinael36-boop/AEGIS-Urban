import { db } from "../../config/database";
import { BCryptHasher } from "../../security/encryption/BCryptHasher";
import { GestorJwt } from "./jwt.utils";
import { UnauthorizedError, NotFoundError } from "../../shared/errors/AppError";
import { eventBus, EVENTOS } from "../../core/events/EventBus";

interface FilaUsuario {
  id_user:       number;
  username:      string;
  email:         string;
  password_hash: string;
  id_family:     number;
  family_name:   string;
  is_active:     boolean;
}

export interface ResultadoLogin {
  token:   string;
  usuario: {
    id:         number;
    username:   string;
    email:      string;
    idFamilia:  number;
    familia:    string;
  };
}

export class AuthService {

  async iniciarSesion(
    username:     string,
    contrasena:   string,
    direccionIp:  string,
    agenteUsuario: string
  ): Promise<ResultadoLogin> {
    // 1. Buscar usuario con su familia
    const resultado = await db.consultar<FilaUsuario>(`
      SELECT u.id_user, u.username, u.email, u.password_hash,
             u.id_family, f.name AS family_name, u.is_active
      FROM   users u
      LEFT JOIN family f ON f.id_family = u.id_family
      WHERE  u.username = $1
    `, [username]);

    if (resultado.rows.length === 0) {
      throw new UnauthorizedError("Credenciales incorrectas");
    }

    const usuario = resultado.rows[0];

    if (!usuario.is_active) {
      throw new UnauthorizedError("Usuario inactivo. Contactá al administrador.");
    }

    // 2. Verificar contraseña con BCrypt
    const contrasenaCorrecta = await BCryptHasher.verificarContrasena(contrasena, usuario.password_hash);
    if (!contrasenaCorrecta) {
      throw new UnauthorizedError("Credenciales incorrectas");
    }

    // 3. Generar JWT
    const token = GestorJwt.firmar({
      sub:       usuario.id_user,
      usuario:   usuario.username,
      idFamilia: usuario.id_family,
      familia:   usuario.family_name,
    });

    // 4. Registrar token en BD para permitir revocación
    const hashToken = GestorJwt.hashear(token);
    const expiraEn  = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await GestorJwt.registrar(hashToken, usuario.id_user, direccionIp, agenteUsuario, expiraEn);

    // 5. Actualizar última conexión
    await db.consultar(
      "UPDATE users SET last_login = NOW() WHERE id_user = $1",
      [usuario.id_user]
    );

    // 6. Emite evento para BitacoraHandler
    void eventBus.emitir(EVENTOS.SESION_INICIADA, {
      evento:    EVENTOS.SESION_INICIADA,
      idUsuario: usuario.id_user,
      username:  usuario.username,
      ip:        direccionIp,
    });

    return {
      token,
      usuario: {
        id:        usuario.id_user,
        username:  usuario.username,
        email:     usuario.email,
        idFamilia: usuario.id_family,
        familia:   usuario.family_name,
      },
    };
  }

  async cerrarSesion(token: string): Promise<void> {
    const hashToken = GestorJwt.hashear(token);
    await GestorJwt.revocar(hashToken);
  }

  async obtenerUsuarioPorId(id: number) {
    const resultado = await db.consultar<FilaUsuario>(`
      SELECT u.id_user, u.username, u.email, u.id_family, f.name AS family_name
      FROM   users u
      LEFT JOIN family f ON f.id_family = u.id_family
      WHERE  u.id_user = $1 AND u.is_active = TRUE
    `, [id]);

    if (resultado.rows.length === 0) throw new NotFoundError("Usuario no encontrado");
    return resultado.rows[0];
  }
}
