# Design: Agrupamento de Turnos do Assistente, Passo a Passo Unificado e Persistência Pós-F5 (fix-chat-turn-aggregation-and-persistence)

## Arquitetura Técnica

```
[Raw SDK Messages Array]
  │ (Contém múltiplos objetos de assistente: msg_step1, msg_step2)
  │
  ▼
[aggregateAssistantTurns(messages)]
  │
  ├── 1. Percorre as mensagens em ordem cronológica
  │    ├── Se role === 'user' -> Adiciona turno do usuário
  │    └── Se role === 'assistant' -> Mescla com o turno de assistente atual:
  │           • Acumula textContent (remove duplicidades e concatena deltas)
  │           • Junta todas as ferramentas executadas em steps[]
  │
  ▼
[Renderização de Turnos Únicos em MessageList.tsx]
  │
  ├── Turno do Usuário: Balão à direita
  │
  └── Turno do Assistente Único:
       ├── Avatar Oficina GPT (Apenas 1 por turno!)
       ├── StepAccordion (Passo a passo com ferramentas executadas)
       └── Balão Markdown (Texto final completo)

[Persistência no Supabase em agente.tsx]
  └── onFinish(lastMessage):
       1. Extrai o texto consolidado do último turno do assistente
       2. Executa supabase.from('messages').insert({ conversation_id, role: 'assistant', content })
```

## Algoritmo de Agrupamento de Turnos (`aggregateAssistantTurns`)

```ts
export type AggregatedTurn = {
  id: string;
  role: 'user' | 'assistant';
  textContent: string;
  steps: StepItem[];
  isError?: boolean;
  error?: any;
};

export const aggregateAssistantTurns = (messages: Message[]): AggregatedTurn[] => {
  const turns: AggregatedTurn[] = [];

  messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const text = getMessageContent(msg);
    const steps = extractSteps(msg);

    if (isUser) {
      turns.push({
        id: msg.id,
        role: 'user',
        textContent: text,
        steps: []
      });
    } else {
      const lastTurn = turns[turns.length - 1];
      if (lastTurn && lastTurn.role === 'assistant') {
        // Mesclar com o turno do assistente existente
        if (text && !lastTurn.textContent.includes(text)) {
          lastTurn.textContent = lastTurn.textContent ? `${lastTurn.textContent}\n\n${text}` : text;
        }
        steps.forEach((s) => {
          if (!lastTurn.steps.some((existing) => existing.id === s.id)) {
            lastTurn.steps.push(s);
          }
        });
        if (msg.isError || (msg as any).status === 'error') {
          lastTurn.isError = true;
          lastTurn.error = msg.error || (msg as any).error;
        }
      } else {
        // Criar novo turno de assistente
        turns.push({
          id: msg.id,
          role: 'assistant',
          textContent: text,
          steps: [...steps],
          isError: msg.isError || (msg as any).status === 'error',
          error: msg.error || (msg as any).error
        });
      }
    }
  });

  return turns;
};
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1: Consulta da OS 22551 (Agrupamento e Passo a Passo)**
  - Ação: Enviar "quais os detalhes da OS 22551 no rei do oleo maua?"
  - Resultado esperado:
    1. Aparece apenas UM avatar Oficina GPT.
    2. O acordeão `1 etapa concluída ˅` é exibido logo acima do texto da resposta.
    3. A resposta completa (OS 22551, Aberta, R$ 520,00) aparece abaixo sem duplicidade.

- **Cenário 2: Teste de Persistência pós-F5 (Refresh da Página)**
  - Ação: Enviar pergunta, aguardar resposta, executar `page.reload()`
  - Resultado esperado:
    1. A página recarrega.
    2. A mensagem do assistente é carregada do Supabase e renderizada perfeitamente.
