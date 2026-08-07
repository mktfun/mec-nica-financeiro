-- 1. Fix transactions RLS for UPDATE
DROP POLICY IF EXISTS "Enable update access for all users" ON public.transactions;
CREATE POLICY "Enable update access for all users" ON public.transactions FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 2. Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    target_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(store_id, month, year)
);

-- Enable RLS on goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Goals policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.goals;
CREATE POLICY "Enable read access for all users" ON public.goals FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.goals;
CREATE POLICY "Enable insert access for all users" ON public.goals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update access for all users" ON public.goals;
CREATE POLICY "Enable update access for all users" ON public.goals FOR UPDATE USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.goals;
CREATE POLICY "Enable delete access for all users" ON public.goals FOR DELETE USING (auth.uid() IS NOT NULL);
