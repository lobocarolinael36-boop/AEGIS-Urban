import { db } from "../../config/database";
import { BCryptHasher } from "../../security/encryption/BCryptHasher";
import { JwtUtils } from "./jwt.utils";
import { UnauthorizedError, NotFoundError } from "../../shared/errors/AppError";

interface UserRow {
  id_user:       number;
  username:      string;
  email:         string;
  password_hash: string;
  id_family:     number;
  family_name:   string;
  is_active:     boolean;
}

export interface LoginResult {
  token:      string;
  user: {
    id:         number;
    username:   string;
    email:      string;
    familyId:   number;
    familyName: string;
  };
}

export class AuthService {

  async login(
    username: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    // 1. Buscar usuario con su familia
    const result = await db.query<UserRow>(`
      SELECT u.id_user, u.username, u.email, u.password_hash,
             u.id_family, f.name AS family_name, u.is_active
      FROM   users u
      LEFT JOIN family f ON f.id_family = u.id_family
      WHERE  u.username = $1
    `, [username]);

    if (result.rows.length === 0) {
      throw new UnauthorizedError("Credenciales incorrectas");
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new UnauthorizedError("Usuario inactivo. Contactá al administrador.");
    }

    // 2. Verificar contraseña con BCrypt
    const passwordOk = await BCryptHasher.compare(password, user.password_hash);
    if (!passwordOk) {
      throw new UnauthorizedError("Credenciales incorrectas");
    }

    // 3. Generar JWT
    const token = JwtUtils.sign({
      sub:        user.id_user,
      username:   user.username,
      familyId:   user.id_family,
      familyName: user.family_name,
    });

    // 4. Registrar token en BD para permitir revocación
    const tokenHash = JwtUtils.hash(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await JwtUtils.register(tokenHash, user.id_user, ipAddress, userAgent, expiresAt);

    // 5. Actualizar last_login
    await db.query(
      "UPDATE users SET last_login = NOW() WHERE id_user = $1",
      [user.id_user]
    );

    return {
      token,
      user: {
        id:         user.id_user,
        username:   user.username,
        email:      user.email,
        familyId:   user.id_family,
        familyName: user.family_name,
      },
    };
  }

  async logout(token: string): Promise<void> {
    const tokenHash = JwtUtils.hash(token);
    await JwtUtils.revoke(tokenHash);
  }

  async getUserById(id: number) {
    const result = await db.query<UserRow>(`
      SELECT u.id_user, u.username, u.email, u.id_family, f.name AS family_name
      FROM   users u
      LEFT JOIN family f ON f.id_family = u.id_family
      WHERE  u.id_user = $1 AND u.is_active = TRUE
    `, [id]);

    if (result.rows.length === 0) throw new NotFoundError("Usuario no encontrado");
    return result.rows[0];
  }
}
