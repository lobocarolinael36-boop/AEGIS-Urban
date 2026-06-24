-- ============================================================
-- Seed 001: Datos iniciales de AEGIS Urban
-- ============================================================

-- ── Tipos de sensor (los usa SensorFactory para instanciar clases)
INSERT INTO sensor_type (code, class_name, unit, alert_threshold, critical_threshold) VALUES
    ('FLOOD',       'FloodSensor',      'mm',  150.0, 300.0),
    ('FIRE',        'FireSensor',       '°C',  60.0,  120.0),
    ('WIND',        'WindSensor',       'km/h',80.0,  150.0),
    ('AIR_QUALITY', 'AirQualitySensor', 'AQI', 100.0, 200.0)
ON CONFLICT (code) DO NOTHING;

-- ── Familias (estructura Composite)
INSERT INTO family (name, description, id_parent_family) VALUES
    ('ADMIN_SISTEMA',      'Acceso total al sistema',                          NULL),
    ('OPERADOR_CRISIS',    'Gestión operativa de emergencias',                 NULL),
    ('AUDITOR',            'Consulta y verificación de bitácora',              NULL),
    ('TRANSITO',           'Visualización de mapa y telemetría',               2),
    ('DEFENSA_CIVIL',      'Gestión completa de alertas y evacuación',         2)
ON CONFLICT (name) DO NOTHING;

-- ── Patentes (permisos atómicos)
INSERT INTO patent (code, description, resource, http_method) VALUES
    ('AUTH_LOGIN',             'Iniciar sesión',                   '/api/auth/login',                   'POST'),
    ('AUTH_LOGOUT',            'Cerrar sesión',                    '/api/auth/logout',                  'POST'),
    ('MAP_VIEW',               'Ver mapa de ciudad',               '/api/city/map',                     'GET'),
    ('SENSOR_VIEW',            'Ver sensores',                     '/api/sensors',                      'GET'),
    ('SENSOR_CREATE',          'Crear sensor',                     '/api/sensors',                      'POST'),
    ('SENSOR_EDIT',            'Editar sensor',                    '/api/sensors/:id',                  'PUT'),
    ('SENSOR_DELETE',          'Eliminar sensor',                  '/api/sensors/:id',                  'DELETE'),
    ('TELEMETRY_VIEW',         'Ver telemetría',                   '/api/telemetry',                    'GET'),
    ('TELEMETRY_EXPORT',       'Exportar telemetría',              '/api/telemetry/export',             'GET'),
    ('ALERT_VIEW',             'Ver alertas',                      '/api/alerts',                       'GET'),
    ('ALERT_ACKNOWLEDGE',      'Confirmar alerta',                 '/api/alerts/:id/ack',               'PUT'),
    ('ALERT_RESOLVE',          'Resolver alerta',                  '/api/alerts/:id/resolve',           'PUT'),
    ('EVACUATION_VIEW',        'Ver planes evacuación',            '/api/evacuation',                   'GET'),
    ('EVACUATION_CREATE',      'Crear plan evacuación',            '/api/evacuation',                   'POST'),
    ('EVACUATION_ACTIVATE',    'Activar plan evacuación',          '/api/evacuation/:id/activate',      'PUT'),
    ('EVACUATION_STRATEGY',    'Cambiar estrategia',               '/api/evacuation/strategy',          'PUT'),
    ('SIMULATION_VIEW',        'Ver simulaciones',                 '/api/simulation',                   'GET'),
    ('SIMULATION_RUN',         'Iniciar simulación',               '/api/simulation/start',             'POST'),
    ('SIMULATION_STOP',        'Detener simulación',               '/api/simulation/:id/stop',          'DELETE'),
    ('AUDIT_VIEW_ALL',         'Ver toda la bitácora',             '/api/audit',                        'GET'),
    ('AUDIT_VERIFY',           'Verificar integridad DVH/DVV',     '/api/audit/verify',                 'POST'),
    ('AUDIT_EXPORT',           'Exportar reporte auditoría',       '/api/audit/export',                 'GET'),
    ('USER_VIEW',              'Ver usuarios',                     '/api/users',                        'GET'),
    ('USER_CREATE',            'Crear usuario',                    '/api/users',                        'POST'),
    ('USER_EDIT',              'Editar usuario',                   '/api/users/:id',                    'PUT'),
    ('USER_DELETE',            'Eliminar usuario',                 '/api/users/:id',                    'DELETE'),
    ('USER_PERMISSIONS',       'Gestionar permisos',               '/api/users/:id/family',             'PUT'),
    ('CITY_VIEW',              'Ver nodos ciudad',                 '/api/city',                         'GET'),
    ('CITY_MANAGE',            'Gestionar ciudad',                 '/api/city',                         'POST')
ON CONFLICT (code) DO NOTHING;

-- ── Usuario administrador por defecto
-- Contraseña: Admin2026! — cambiar INMEDIATAMENTE en producción
-- Hash BCrypt (factor 12) de "Admin2026!"
INSERT INTO users (username, email, password_hash, id_family, is_active)
VALUES (
    'admin',
    'admin@aegis.urban',
    '$2b$12$Vn75kDEHjtny3vbw4Ff50uNl/yxovS5gm3khy6kosx3UDLwV05s6.',
    1,
    TRUE
) ON CONFLICT (username) DO NOTHING;

-- ── Ciudad raíz (Nodo Composite)
INSERT INTO city_node (name, node_type, id_parent, centroid_lat, centroid_lon)
VALUES ('Ciudad AEGIS', 'CITY', NULL, -34.6037, -58.3816)
ON CONFLICT DO NOTHING;
