-- ============================================================
-- AEGIS Urban — Seed Sprint 3: Ciudad, Distritos y Sensores
-- ============================================================

-- ── Nodos de Ciudad (Composite geográfico) ────────────────────────────────────
-- Primero la raíz (puede que ya exista del seed 001)
INSERT INTO city_node (id_node, name, node_type, id_parent, centroid_lat, centroid_lon)
VALUES (1, 'Ciudad AEGIS', 'CITY', NULL, -34.6037, -58.3816)
ON CONFLICT (id_node) DO NOTHING;

-- Distritos (nivel 2) — usan el id_node=1 de la raíz como padre
INSERT INTO city_node (name, node_type, id_parent, centroid_lat, centroid_lon) VALUES
  ('San Telmo',   'DISTRICT', 1, -34.6213, -58.3731),
  ('Palermo',     'DISTRICT', 1, -34.5795, -58.4257),
  ('Recoleta',    'DISTRICT', 1, -34.5874, -58.3960),
  ('La Boca',     'DISTRICT', 1, -34.6345, -58.3636),
  ('Belgrano',    'DISTRICT', 1, -34.5566, -58.4513)
ON CONFLICT DO NOTHING;

-- ── Sensores simulados ────────────────────────────────────────────────────────
INSERT INTO sensor (serial_code, id_sensor_type, id_city_node, status, lat, lon, is_simulated)
SELECT
  s.serial_code,
  st.id_sensor_type,
  cn.id_node,
  'SIMULATED',
  s.lat,
  s.lon,
  TRUE
FROM (VALUES
  -- San Telmo
  ('AEG-ST-FL-001', 'FLOOD',       'San Telmo',  -34.6218, -58.3745),
  ('AEG-ST-FI-001', 'FIRE',        'San Telmo',  -34.6200, -58.3720),
  -- Palermo
  ('AEG-PA-FL-001', 'FLOOD',       'Palermo',    -34.5801, -58.4270),
  ('AEG-PA-WI-001', 'WIND',        'Palermo',    -34.5780, -58.4240),
  ('AEG-PA-AQ-001', 'AIR_QUALITY', 'Palermo',    -34.5810, -58.4290),
  -- Recoleta
  ('AEG-RE-FI-001', 'FIRE',        'Recoleta',   -34.5880, -58.3975),
  ('AEG-RE-AQ-001', 'AIR_QUALITY', 'Recoleta',   -34.5860, -58.3940),
  -- La Boca
  ('AEG-LB-FL-001', 'FLOOD',       'La Boca',    -34.6350, -58.3640),
  ('AEG-LB-FI-001', 'FIRE',        'La Boca',    -34.6330, -58.3625),
  -- Belgrano
  ('AEG-BE-WI-001', 'WIND',        'Belgrano',   -34.5570, -58.4520),
  ('AEG-BE-AQ-001', 'AIR_QUALITY', 'Belgrano',   -34.5550, -58.4500),
  ('AEG-BE-FL-001', 'FLOOD',       'Belgrano',   -34.5590, -58.4535)
) AS s(serial_code, tipo, nodo, lat, lon)
JOIN sensor_type st ON st.code = s.tipo
JOIN city_node   cn ON cn.name = s.nodo
ON CONFLICT (serial_code) DO NOTHING;
