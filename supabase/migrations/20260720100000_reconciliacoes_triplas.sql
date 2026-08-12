CREATE TABLE IF NOT EXISTS reconciliacoes_triplas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    os_id UUID REFERENCES patio_os(id) ON DELETE SET NULL,
    rede_id UUID REFERENCES receivables(id) ON DELETE SET NULL,
    ofx_id UUID,
    tipo_match TEXT NOT NULL CHECK (tipo_match IN ('EXATO', 'IA', 'MANUAL')),
    score INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reconciliacoes_triplas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage reconciliations for their stores" ON reconciliacoes_triplas;

CREATE POLICY "Users can manage reconciliations for their stores"
ON reconciliacoes_triplas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_reconciliacoes_triplas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_reconciliacoes_triplas_updated_at') THEN
        CREATE TRIGGER trg_update_reconciliacoes_triplas_updated_at
        BEFORE UPDATE ON reconciliacoes_triplas
        FOR EACH ROW
        EXECUTE FUNCTION update_reconciliacoes_triplas_updated_at();
    END IF;
END
$$;
