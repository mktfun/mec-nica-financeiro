ALTER TABLE patio_os ADD COLUMN IF NOT EXISTS history_log JSONB DEFAULT '[]'::jsonb;
