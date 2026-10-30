ALTER TABLE simulation_scenario DROP CONSTRAINT IF EXISTS simulation_scenario_scenario_type_check;
ALTER TABLE simulation_scenario ADD CONSTRAINT simulation_scenario_scenario_type_check
  CHECK (scenario_type IN ('FLOOD','FIRE','WIND','AIR_QUALITY','POWER_OUT','COMBINED'));

CREATE INDEX IF NOT EXISTS idx_scenario_status ON simulation_scenario(status);

INSERT INTO patent (code, description, resource, http_method) VALUES
  ('SIMULATION_SCENARIOS_VIEW', 'Consultar escenarios configurados', '/api/simulation', 'GET'),
  ('SIMULATION_SCENARIOS_CREATE', 'Crear y ejecutar escenarios', '/api/simulation/start', 'POST'),
  ('SIMULATION_SCENARIOS_STOP', 'Detener un escenario', '/api/simulation/:id/stop', 'DELETE')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description,
  resource = EXCLUDED.resource, http_method = EXCLUDED.http_method;

INSERT INTO family_patent (id_family, id_patent)
SELECT f.id_family, p.id_patent FROM family f CROSS JOIN patent p
WHERE f.name IN ('DEFENSA_CIVIL', 'ADMIN_SISTEMA')
  AND p.code IN ('SIMULATION_SCENARIOS_VIEW', 'SIMULATION_SCENARIOS_CREATE', 'SIMULATION_SCENARIOS_STOP')
ON CONFLICT DO NOTHING;
