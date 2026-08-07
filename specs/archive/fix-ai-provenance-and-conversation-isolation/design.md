# Design: Transparência de Origem de Dados, Isolamento Estrito de Conversas e Raciocínio Adaptativo (fix-ai-provenance-and-conversation-isolation)

## Arquitetura Técnica

```
[Pergunta do Usuário: "de onde vc puxou essa informação??"]
       │
       ▼
[Edge Function ai-chat]
       │
       ├── System Prompt com <regra_proibição_alucinação_origem>
       │    └── PROIBIDO: "gerei resposta fictícia"
       │    └── OBRIGATÓRIO: "Informação consultada no banco de dados local ConciliaMec (tabela patio_os)..."
       │
       └── Retorna explicação clara e profissional da proveniência dos dados
```

## Ajustes em `src/routes/agente.tsx` (Isolamento Estrito)

```ts
// 1. Limpeza Imediata na Troca de Conversa
const handleSelectConversation = (id: string) => {
  if (id === activeConversationId) return;
  setMessages([]); // Limpa imediatamente o histórico da UI
  setActiveConversationId(id);
  activeConversationIdRef.current = id;
  loadMessages(id);
};

// 2. Filtro Estrito no Supabase Realtime
useEffect(() => {
  if (!activeConversationId) return;

  const channel = supabase
    .channel(`messages:${activeConversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`,
      },
      (payload) => {
        const newMsg = payload.new;
        if (!newMsg || newMsg.conversation_id !== activeConversationIdRef.current) return;
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMsg.id || (m.role === newMsg.role && m.content === newMsg.content));
          if (exists) return prev;
          return [...prev, { id: newMsg.id, role: newMsg.role, content: newMsg.content }];
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [activeConversationId]);
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1: Pergunta sobre Origem dos Dados**
  - Ação: Perguntar "de onde vc puxou essa informação??" após a OS 22551.
  - Resultado esperado: A IA responde de forma profissional citando o banco de dados local (ConciliaMec / patio_os) sem nunca dizer que criou dados fictícios.

- **Cenário 2: Troca de Conversas Sem Vazamento**
  - Ação: Criar "Nova Conversa" e verificar se as mensagens da conversa anterior sumiram completamente da tela.
