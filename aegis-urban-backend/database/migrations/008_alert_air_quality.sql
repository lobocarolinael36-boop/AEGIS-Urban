-- Alinea los tipos de alerta con los tipos de sensor disponibles en el sistema.
ALTER TABLE alert
  DROP CONSTRAINT IF EXISTS alert_alert_type_check;

ALTER TABLE alert
  ADD CONSTRAINT alert_alert_type_check
  CHECK (alert_type IN ('FLOOD', 'FIRE', 'WIND', 'AIR_QUALITY', 'POWER_OUT'));
