-- Permisos para las rutas que realmente expone la API actual.
-- El seed anterior apuntaba a prefijos/rutas que no existen en este backend.
INSERT INTO patent (code, description, resource, http_method) VALUES
  ('AUTH_ME',             'Consultar el propio perfil',       '/api/auth/me',                         'GET'),
  ('DASHBOARD_VIEW',      'Consultar indicadores del panel',   '/api/telemetry/estadisticas',          'GET'),
  ('DASHBOARD_ACTIVITY',  'Consultar actividad operativa',     '/api/telemetry/actividad',             'GET'),
  ('SENSOR_HISTORY',      'Consultar historial de un sensor',  '/api/sensores/:id/lecturas',           'GET'),
  ('SENSOR_SIMULATE',     'Ejecutar lectura simulada',         '/api/sensores/:id/simular',            'POST'),
  ('ALERT_ACKNOWLEDGE',   'Reconocer alerta',                  '/api/alertas/:id/reconocer',           'PATCH'),
  ('ALERT_RESOLVE',       'Resolver alerta reconocida',        '/api/alertas/:id/resolver',            'PATCH'),
  ('EVACUATION_CREATE',   'Iniciar evacuación de una alerta',  '/api/alertas/:id/evacuar',             'POST'),
  ('ADMIN_USERS_VIEW',    'Consultar usuarios',                '/api/admin/usuarios',                  'GET'),
  ('ADMIN_FAMILIES_VIEW', 'Consultar familias',                '/api/admin/familias',                  'GET'),
  ('AUDIT_VIEW',          'Consultar bitácora',                '/api/admin/bitacora',                 'GET'),
  ('AUDIT_VERIFY',        'Verificar integridad de bitácora',  '/api/admin/integridad',               'GET')
ON CONFLICT (code) DO UPDATE
  SET description = EXCLUDED.description,
      resource = EXCLUDED.resource,
      http_method = EXCLUDED.http_method;

-- Repara permisos anteriores con paths y métodos que no coinciden con Express.
UPDATE patent SET resource = '/api/auth/logout', http_method = 'POST' WHERE code = 'AUTH_LOGOUT';
UPDATE patent SET resource = '/api/sensores', http_method = 'GET' WHERE code = 'MAP_VIEW';
UPDATE patent SET resource = '/api/sensores', http_method = 'GET' WHERE code = 'SENSOR_VIEW';
UPDATE patent SET resource = '/api/alertas', http_method = 'GET' WHERE code = 'ALERT_VIEW';
UPDATE patent SET resource = '/api/alertas/:id/reconocer', http_method = 'PATCH' WHERE code = 'ALERT_ACKNOWLEDGE';
UPDATE patent SET resource = '/api/alertas/:id/resolver', http_method = 'PATCH' WHERE code = 'ALERT_RESOLVE';
UPDATE patent SET resource = '/api/alertas/:id/evacuar', http_method = 'POST' WHERE code = 'EVACUATION_CREATE';
UPDATE patent SET resource = '/api/sensores/:id/simular', http_method = 'POST' WHERE code = 'SIMULATION_RUN';

-- Los permisos básicos se heredan por la jerarquía OPERADOR_CRISIS → TRANSITO/DEFENSA_CIVIL.
INSERT INTO family_patent (id_family, id_patent)
SELECT f.id_family, p.id_patent
FROM family f
CROSS JOIN patent p
WHERE f.name = 'OPERADOR_CRISIS'
  AND p.code IN ('AUTH_ME', 'AUTH_LOGOUT', 'DASHBOARD_VIEW', 'DASHBOARD_ACTIVITY',
                 'MAP_VIEW', 'SENSOR_VIEW', 'SENSOR_HISTORY', 'ALERT_VIEW')
ON CONFLICT DO NOTHING;

-- Defensa Civil puede ejecutar acciones de respuesta y ejercicios simulados.
INSERT INTO family_patent (id_family, id_patent)
SELECT f.id_family, p.id_patent
FROM family f
CROSS JOIN patent p
WHERE f.name = 'DEFENSA_CIVIL'
  AND p.code IN ('ALERT_ACKNOWLEDGE', 'ALERT_RESOLVE', 'EVACUATION_CREATE', 'SENSOR_SIMULATE')
ON CONFLICT DO NOTHING;

-- Auditoría: lectura de operación, bitácora e integridad, sin permisos de cambio.
INSERT INTO family_patent (id_family, id_patent)
SELECT f.id_family, p.id_patent
FROM family f
CROSS JOIN patent p
WHERE f.name = 'AUDITOR'
  AND p.code IN ('AUTH_ME', 'AUTH_LOGOUT', 'DASHBOARD_VIEW', 'DASHBOARD_ACTIVITY',
                 'MAP_VIEW', 'SENSOR_VIEW', 'SENSOR_HISTORY', 'ALERT_VIEW', 'AUDIT_VIEW', 'AUDIT_VERIFY')
ON CONFLICT DO NOTHING;

-- Administración de sistema conserva acceso completo a los endpoints existentes.
INSERT INTO family_patent (id_family, id_patent)
SELECT f.id_family, p.id_patent
FROM family f
CROSS JOIN patent p
WHERE f.name = 'ADMIN_SISTEMA'
ON CONFLICT DO NOTHING;
