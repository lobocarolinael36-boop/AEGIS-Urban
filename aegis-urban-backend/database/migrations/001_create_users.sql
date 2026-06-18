-- ============================================================
-- Migración 001: Usuarios, Sesiones, Patentes y Familias
-- Ejecutado automáticamente por Docker al primer arranque.
-- ============================================================

-- ── Extensión para UUIDs (por si se necesita en el futuro)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Configurar zona horaria de la sesión
SET timezone = 'America/Argentina/Buenos_Aires';

-- ── Tabla FAMILY (Composite — jerarquía de roles)
CREATE TABLE IF NOT EXISTS family (
    id_family        SERIAL       PRIMARY KEY,
    name             VARCHAR(100) NOT NULL UNIQUE,
    description      TEXT,
    id_parent_family INTEGER      REFERENCES family(id_family) ON DELETE SET NULL,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN family.id_parent_family IS
    'NULL = familia raíz. Permite jerarquía Composite recursiva.';

-- ── Tabla PATENT (permisos atómicos)
CREATE TABLE IF NOT EXISTS patent (
    id_patent    SERIAL       PRIMARY KEY,
    code         VARCHAR(100) NOT NULL UNIQUE,
    description  TEXT,
    resource     VARCHAR(255) NOT NULL,
    http_method  VARCHAR(10)  NOT NULL CHECK (http_method IN ('GET','POST','PUT','DELETE','PATCH')),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Tabla de unión FAMILY_PATENT
CREATE TABLE IF NOT EXISTS family_patent (
    id_family  INTEGER NOT NULL REFERENCES family(id_family) ON DELETE CASCADE,
    id_patent  INTEGER NOT NULL REFERENCES patent(id_patent) ON DELETE CASCADE,
    PRIMARY KEY (id_family, id_patent)
);

-- ── Tabla USERS
CREATE TABLE IF NOT EXISTS users (
    id_user        SERIAL       PRIMARY KEY,
    username       VARCHAR(80)  NOT NULL UNIQUE,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,          -- BCrypt irreversible
    full_name_enc  VARCHAR(512),                   -- AES-256-CBC reversible
    dni_enc        VARCHAR(512),                   -- AES-256-CBC reversible
    phone_enc      VARCHAR(512),                   -- AES-256-CBC reversible
    id_family      INTEGER      REFERENCES family(id_family) ON DELETE SET NULL,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login     TIMESTAMPTZ
);

CREATE INDEX idx_users_email    ON users (email);
CREATE INDEX idx_users_family   ON users (id_family);
CREATE INDEX idx_users_username ON users (username);

-- ── Tabla SESSION_TOKEN (tokens JWT activos/revocados)
CREATE TABLE IF NOT EXISTS session_token (
    id_token    SERIAL       PRIMARY KEY,
    id_user     INTEGER      NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
    token_hash  CHAR(64)     NOT NULL UNIQUE,   -- SHA-256 del JWT
    ip_address  VARCHAR(45)  NOT NULL,
    user_agent  TEXT,
    is_revoked  BOOLEAN      NOT NULL DEFAULT FALSE,
    issued_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_token_user    ON session_token (id_user);
CREATE INDEX idx_token_hash    ON session_token (token_hash);
CREATE INDEX idx_token_expires ON session_token (expires_at);
