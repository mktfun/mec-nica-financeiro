-- Tabelas de IAS (Claritas e Graphify)

-- 1. claritas_prompts
CREATE TABLE public.claritas_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_role text NOT NULL,
  content text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. claritas_policies
CREATE TABLE public.claritas_policies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name text NOT NULL,
  rule_definition text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. agent_reflections
CREATE TABLE public.agent_reflections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  tool_used text,
  outcome_success boolean NOT NULL,
  reflection_notes text NOT NULL,
  policy_evaluations jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.claritas_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claritas_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_reflections ENABLE ROW LEVEL SECURITY;

-- Policies claritas_prompts
CREATE POLICY "Leitura autenticada para claritas_prompts" ON public.claritas_prompts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policies claritas_policies
CREATE POLICY "Leitura autenticada para claritas_policies" ON public.claritas_policies
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policies agent_reflections
-- Leituras permitidas para os donos da conversação
CREATE POLICY "Leitura agent_reflections pelo usuario" ON public.agent_reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = agent_reflections.conversation_id AND c.user_id = auth.uid()
    )
  );

-- Criação do Bucket de Storage knowledge_graph
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge_graph', 'knowledge_graph', false) ON CONFLICT DO NOTHING;

-- Policies para o bucket (Somente leitura para authenticated, full access para service_role)
CREATE POLICY "Leitura bucket knowledge_graph" ON storage.objects
  FOR SELECT USING (bucket_id = 'knowledge_graph' AND auth.role() = 'authenticated');

