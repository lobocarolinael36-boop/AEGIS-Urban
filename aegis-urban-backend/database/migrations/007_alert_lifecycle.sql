-- La creación de un plan de evacuación no equivale a resolver la alerta.
-- La resolución debe ser una transición explícita realizada por un operador.
DROP TRIGGER IF EXISTS trg_alerta_a_resuelta ON evacuation_plan;
DROP FUNCTION IF EXISTS fn_alerta_a_resuelta();

ALTER TABLE alert
  ADD COLUMN IF NOT EXISTS resolved_by INTEGER REFERENCES users(id_user);
