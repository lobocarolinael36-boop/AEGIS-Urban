-- ============================================================
-- Migración 003: Alertas, Planes de Evacuación y Simulación
-- ============================================================

-- ── ALERT
CREATE TABLE IF NOT EXISTS alert (
    id_alert          SERIAL       PRIMARY KEY,
    id_sensor         INTEGER      NOT NULL REFERENCES sensor(id_sensor),
    level             VARCHAR(20)  NOT NULL CHECK (level IN ('WARNING','CRITICAL','CATASTROPHIC')),
    alert_type        VARCHAR(20)  NOT NULL CHECK (alert_type IN ('FLOOD','FIRE','WIND','POWER_OUT')),
    message           TEXT,
    status            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE','ACKNOWLEDGED','RESOLVED')),
    acknowledged_by   INTEGER      REFERENCES users(id_user),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    acknowledged_at   TIMESTAMPTZ,
    resolved_at       TIMESTAMPTZ
);

CREATE INDEX idx_alert_status   ON alert (status);
CREATE INDEX idx_alert_created  ON alert (created_at DESC);
CREATE INDEX idx_alert_sensor   ON alert (id_sensor);

-- ── EVACUATION_PLAN
CREATE TABLE IF NOT EXISTS evacuation_plan (
    id_plan           SERIAL       PRIMARY KEY,
    id_alert          INTEGER      NOT NULL REFERENCES alert(id_alert),
    strategy_used     VARCHAR(20)  NOT NULL CHECK (strategy_used IN ('SHORTEST','SAFEST','CAPACITY')),
    route_geojson     JSONB,
    estimated_people  INTEGER      DEFAULT 0,
    status            VARCHAR(20)  NOT NULL DEFAULT 'CALCULATED'
                      CHECK (status IN ('CALCULATED','ACTIVE','COMPLETED')),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── SIMULATION_SCENARIO (Mocking Engine)
CREATE TABLE IF NOT EXISTS simulation_scenario (
    id_scenario    SERIAL       PRIMARY KEY,
    name           VARCHAR(200) NOT NULL,
    scenario_type  VARCHAR(20)  NOT NULL CHECK (scenario_type IN ('FLOOD','FIRE','POWER_OUT','COMBINED')),
    config         JSONB        NOT NULL DEFAULT '{}',
    created_by     INTEGER      REFERENCES users(id_user),
    status         VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                   CHECK (status IN ('DRAFT','RUNNING','COMPLETED','ABORTED')),
    started_at     TIMESTAMPTZ,
    ended_at       TIMESTAMPTZ
);

-- ── SIMULATION_EVENT
CREATE TABLE IF NOT EXISTS simulation_event (
    id_event         SERIAL       PRIMARY KEY,
    id_scenario      INTEGER      NOT NULL REFERENCES simulation_scenario(id_scenario) ON DELETE CASCADE,
    id_sensor        INTEGER      NOT NULL REFERENCES sensor(id_sensor),
    simulated_value  DECIMAL(12,4) NOT NULL,
    trigger_type     VARCHAR(10)  NOT NULL CHECK (trigger_type IN ('AUTO','MANUAL')),
    fired_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sim_event_scenario ON simulation_event (id_scenario);
