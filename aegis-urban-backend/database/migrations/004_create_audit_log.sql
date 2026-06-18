-- ============================================================
-- Migración 004: Bitácora Inmutable con DVH + DVV
-- ============================================================
-- REGLA DE ORO: Esta tabla NUNCA recibe UPDATE ni DELETE.
-- El usuario de aplicación (aegis_app_user) no tiene esos permisos.
-- ============================================================

-- ── Secuencia explícita para poder llamar nextval() desde TypeScript
CREATE SEQUENCE IF NOT EXISTS audit_log_id_log_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS audit_log (
    id_log       BIGINT       DEFAULT nextval('audit_log_id_log_seq') PRIMARY KEY,
    action       VARCHAR(80)  NOT NULL,     -- 'LOGIN', 'SENSOR_CREATE', 'ALERT_ACK', ...
    entity_name  VARCHAR(100) NOT NULL,     -- tabla afectada
    entity_id    VARCHAR(255) NOT NULL,     -- PK del registro afectado (como string)
    id_user      INTEGER      REFERENCES users(id_user),
    ip_address   VARCHAR(45)  NOT NULL,
    old_values   TEXT,                      -- JSON snapshot antes (NULL en INSERT)
    new_values   TEXT,                      -- JSON snapshot después (NULL en DELETE)
    dvh          CHAR(64)     NOT NULL,     -- SHA-256 de los campos de esta fila
    dvv          CHAR(64)     NOT NULL,     -- SHA-256 encadenado = blockchain mínimo
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índices para consultas de auditoría (sin penalizar inserciones)
CREATE INDEX idx_audit_log_user    ON audit_log (id_user);
CREATE INDEX idx_audit_log_action  ON audit_log (action);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);

-- ★ REVOCAMOS UPDATE y DELETE al usuario de la aplicación
-- El superusuario de Postgres mantiene sus permisos intactos.
REVOKE UPDATE, DELETE ON audit_log FROM aegis_app_user;

-- ── Tabla de control (snapshot del estado de integridad)
CREATE TABLE IF NOT EXISTS audit_log_control (
    id_control    SERIAL       PRIMARY KEY,
    table_name    VARCHAR(100) NOT NULL UNIQUE DEFAULT 'audit_log',
    total_rows    BIGINT       NOT NULL DEFAULT 0,
    last_dvv      CHAR(64),
    last_verified TIMESTAMPTZ,
    verified_by   VARCHAR(100)
);

INSERT INTO audit_log_control (table_name, total_rows)
VALUES ('audit_log', 0)
ON CONFLICT (table_name) DO NOTHING;
