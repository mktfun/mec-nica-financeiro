-- Migração: AI Chat e MCP Logs
-- Cria as tabelas para suportar o Agente de IA integrado ao MCP.

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.mcp_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    params JSONB,
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Conversations
CREATE POLICY "Users can manage their own conversations" 
ON public.conversations 
FOR ALL USING (auth.uid() = user_id);

-- Policies: Messages
CREATE POLICY "Users can manage their own messages" 
ON public.messages 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
);

-- Policies: MCP Logs
CREATE POLICY "Users can manage their own MCP logs" 
ON public.mcp_logs 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = mcp_logs.conversation_id AND c.user_id = auth.uid()
    )
);
