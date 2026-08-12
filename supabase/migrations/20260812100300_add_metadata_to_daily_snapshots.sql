-- Add metadata JSONB column to daily_snapshots to store extra accounting data

ALTER TABLE daily_snapshots
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
