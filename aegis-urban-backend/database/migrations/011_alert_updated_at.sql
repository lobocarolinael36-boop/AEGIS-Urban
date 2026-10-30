ALTER TABLE alert ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE alert SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE alert ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE alert ALTER COLUMN updated_at SET NOT NULL;
