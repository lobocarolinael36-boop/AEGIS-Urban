-- ============================================================
-- AEGIS Urban — Migración 006: Triggers de Telemetría y Auditoría
-- ============================================================

-- ── Índices adicionales para consultas de telemetría ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_sensor_status
  ON sensor(status);

CREATE INDEX IF NOT EXISTS idx_alert_status_level
  ON alert(status, level);

CREATE INDEX IF NOT EXISTS idx_alert_created
  ON alert(created_at DESC);

-- ── Función: actualiza last_ping del sensor al insertar una lectura ───────────
CREATE OR REPLACE FUNCTION fn_actualizar_last_ping()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sensor
  SET last_ping = NEW.recorded_at
  WHERE id_sensor = NEW.id_sensor;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_last_ping ON sensor_reading;
CREATE TRIGGER trg_actualizar_last_ping
  AFTER INSERT ON sensor_reading
  FOR EACH ROW
  EXECUTE FUNCTION fn_actualizar_last_ping();

-- ── Función: cambia status de alerta a RESOLVED cuando se crea el plan ───────
CREATE OR REPLACE FUNCTION fn_alerta_a_resuelta()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE alert
  SET status = 'RESOLVED', updated_at = NOW()
  WHERE id_alert = NEW.id_alert
    AND status   = 'ACTIVE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alerta_a_resuelta ON evacuation_plan;
CREATE TRIGGER trg_alerta_a_resuelta
  AFTER INSERT ON evacuation_plan
  FOR EACH ROW
  EXECUTE FUNCTION fn_alerta_a_resuelta();

-- ── Vista materializada-friendly: resumen de sensores ────────────────────────
CREATE OR REPLACE VIEW v_resumen_sensores AS
SELECT
  s.id_sensor,
  s.serial_code,
  st.code           AS tipo,
  st.unit           AS unidad,
  cn.name           AS nodo,
  s.status,
  s.lat,
  s.lon,
  s.is_simulated,
  lr.value          AS ultimo_valor,
  lr.reading_status AS ultimo_estado,
  lr.recorded_at    AS ultima_lectura
FROM sensor s
JOIN sensor_type st ON st.id_sensor_type = s.id_sensor_type
JOIN city_node   cn ON cn.id_node        = s.id_city_node
LEFT JOIN LATERAL (
  SELECT value, reading_status, recorded_at
  FROM sensor_reading
  WHERE id_sensor = s.id_sensor
  ORDER BY recorded_at DESC
  LIMIT 1
) lr ON TRUE;
