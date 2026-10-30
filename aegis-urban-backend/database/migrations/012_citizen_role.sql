-- Rol CIUDADANO + registro con consentimientos legales (Ley 25.326 de Protección de Datos Personales).
-- Los endpoints /api/publico/* no requieren login; el rol CIUDADANO es para cuentas registradas,
-- que no ven nada de gestión.
INSERT INTO family (name, description, id_parent_family) VALUES
    ('CIUDADANO', 'Vista pública de solo lectura: clima, avisos y zonas de riesgo', NULL)
ON CONFLICT (name) DO NOTHING;

-- Perfil verificado = el usuario aceptó términos y privacidad al registrarse.
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_verified_at TIMESTAMPTZ;

-- Evidencia de cada consentimiento (qué, cuándo, versión del texto, desde qué IP).
-- Se agrega una fila por cada cambio: nunca se pisa el historial.
CREATE TABLE IF NOT EXISTS user_consent (
    id_consent    SERIAL       PRIMARY KEY,
    id_user       INTEGER      NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
    consent_type  VARCHAR(20)  NOT NULL CHECK (consent_type IN ('TERMS','PRIVACY','AGE','LOCATION')),
    version       VARCHAR(20)  NOT NULL,
    granted       BOOLEAN      NOT NULL,
    ip_address    VARCHAR(64),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_consent_user ON user_consent (id_user, consent_type, created_at DESC);

INSERT INTO patent (code, description, resource, http_method) VALUES
    ('CITIZEN_DATA_VIEW',        'Ver y exportar los propios datos',            '/api/auth/mis-datos',               'GET'),
    ('CITIZEN_DATA_DELETE',      'Solicitar la baja y supresión de la cuenta',  '/api/auth/mis-datos',               'DELETE'),
    ('CITIZEN_LOCATION_CONSENT', 'Otorgar o revocar el consentimiento de ubicación', '/api/auth/consentimiento-ubicacion', 'PUT')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description,
    resource = EXCLUDED.resource, http_method = EXCLUDED.http_method;

INSERT INTO family_patent (id_family, id_patent)
SELECT f.id_family, p.id_patent
FROM family f
CROSS JOIN patent p
WHERE f.name = 'CIUDADANO'
  AND p.code IN ('AUTH_ME', 'AUTH_LOGOUT', 'CITIZEN_DATA_VIEW', 'CITIZEN_DATA_DELETE', 'CITIZEN_LOCATION_CONSENT')
ON CONFLICT DO NOTHING;

-- ADMIN_SISTEMA conserva acceso completo.
INSERT INTO family_patent (id_family, id_patent)
SELECT f.id_family, p.id_patent
FROM family f
CROSS JOIN patent p
WHERE f.name = 'ADMIN_SISTEMA'
  AND p.code IN ('CITIZEN_DATA_VIEW', 'CITIZEN_DATA_DELETE', 'CITIZEN_LOCATION_CONSENT')
ON CONFLICT DO NOTHING;
