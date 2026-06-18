-- ============================================================
-- Migración 002: Ciudad (Composite), Tipos de Sensor y Sensores
-- ============================================================

-- ── CITY_NODE (Composite geográfico: Ciudad > Distrito > Zona > Bloque)
CREATE TABLE IF NOT EXISTS city_node (
    id_node           SERIAL        PRIMARY KEY,
    name              VARCHAR(200)  NOT NULL,
    node_type         VARCHAR(20)   NOT NULL CHECK (node_type IN ('CITY','DISTRICT','ZONE','BLOCK')),
    id_parent         INTEGER       REFERENCES city_node(id_node) ON DELETE CASCADE,
    centroid_lat      DECIMAL(10,7),
    centroid_lon      DECIMAL(10,7),
    boundary_geojson  JSONB,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE
);

COMMENT ON COLUMN city_node.id_parent IS 'NULL = nodo raíz Ciudad. Composite recursivo.';
CREATE INDEX idx_city_node_parent ON city_node (id_parent);
CREATE INDEX idx_city_node_type   ON city_node (node_type);

-- ── SENSOR_TYPE (define qué clase instancia la Factory)
CREATE TABLE IF NOT EXISTS sensor_type (
    id_sensor_type      SERIAL       PRIMARY KEY,
    code                VARCHAR(50)  NOT NULL UNIQUE,
    class_name          VARCHAR(100) NOT NULL,    -- 'FloodSensor', 'FireSensor', etc.
    unit                VARCHAR(20)  NOT NULL,    -- 'mm', '°C', 'km/h', 'AQI'
    alert_threshold     DECIMAL(10,2),
    critical_threshold  DECIMAL(10,2)
);

-- ── SENSOR
CREATE TABLE IF NOT EXISTS sensor (
    id_sensor       SERIAL       PRIMARY KEY,
    serial_code     VARCHAR(100) NOT NULL UNIQUE,
    id_sensor_type  INTEGER      NOT NULL REFERENCES sensor_type(id_sensor_type),
    id_city_node    INTEGER      NOT NULL REFERENCES city_node(id_node),
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','INACTIVE','FAULT','SIMULATED')),
    lat             DECIMAL(10,7),
    lon             DECIMAL(10,7),
    is_simulated    BOOLEAN      NOT NULL DEFAULT FALSE,
    installed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_ping       TIMESTAMPTZ
);

CREATE INDEX idx_sensor_type ON sensor (id_sensor_type);
CREATE INDEX idx_sensor_node ON sensor (id_city_node);
CREATE INDEX idx_sensor_status ON sensor (status);

-- ══════════════════════════════════════════════════════════════
-- SENSOR_READING — Tabla PARTICIONADA por RANGE de fecha
--
-- Particionamiento: cada partición cubre un trimestre.
-- Ventaja: las queries de telemetría reciente solo leen 1 partición
-- en lugar de millones de filas de toda la tabla histórica.
-- El optimizador de PostgreSQL usa "Partition Pruning" automáticamente.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sensor_reading (
    id_reading      BIGINT       GENERATED ALWAYS AS IDENTITY,
    id_sensor       INTEGER      NOT NULL REFERENCES sensor(id_sensor),
    value           DECIMAL(12,4) NOT NULL,
    unit            VARCHAR(20),
    reading_status  VARCHAR(20)  NOT NULL DEFAULT 'OK'
                    CHECK (reading_status IN ('OK','WARNING','CRITICAL')),
    is_simulated    BOOLEAN      NOT NULL DEFAULT FALSE,
    recorded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    -- ★ recorded_at es la PARTITION KEY
) PARTITION BY RANGE (recorded_at);

-- Particiones iniciales (2026)
CREATE TABLE sensor_reading_2026_q2
    PARTITION OF sensor_reading
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE TABLE sensor_reading_2026_q3
    PARTITION OF sensor_reading
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE TABLE sensor_reading_2026_q4
    PARTITION OF sensor_reading
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- Índice en cada partición (PostgreSQL lo crea automáticamente con CONCURRENTLY no disponible aquí)
CREATE INDEX idx_sr_sensor_date_q2 ON sensor_reading_2026_q2 (id_sensor, recorded_at DESC);
CREATE INDEX idx_sr_sensor_date_q3 ON sensor_reading_2026_q3 (id_sensor, recorded_at DESC);
CREATE INDEX idx_sr_sensor_date_q4 ON sensor_reading_2026_q4 (id_sensor, recorded_at DESC);
