# Proposal: Agrupamento de Turnos do Assistente, Passo a Passo Unificado e Persistência Pós-F5 (fix-chat-turn-aggregation-and-persistence)

## Problema Identificado com Evidência Empírica
1. **Duplicação de Balões e Respostas Cortadas:**
   - No Vercel AI SDK 4.x/5.x com `stopWhen: stepCountIs(5)`, cada passo de execução de ferramenta gera um objeto de mensagem separado no array `messages` do `useChat` (ex: `msg1` com a tool call, `msg2` com o texto final).
   - O `MessageList.tsx` atual mapeava cada mensagem individualmente, fazendo a UI exibir DOIS avatares e balões do "Oficina GPT" para a mesma pergunta, cortando o texto e deixando um balão de `...` orfão.
2. **Sumiço da Resposta ao dar Refresh (F5):**
   - O callback `onFinish` em `agente.tsx` só recebia a última mensagem isolada do SDK. Como as partes de texto podiam estar distribuídas entre passos, a variável `textContent` retornava vazia e o `insert` no Supabase `messages` era abortado. Ao dar F5, o banco não tinha a resposta do assistente gravada.
3. **Desconexão do Passo a Passo Expansível:**
   - As ferramentas executadas no passo 1 ficavam isoladas no primeiro balão vazio, enquanto o texto final ficava no segundo balão.

## Solução Proposta
1. **Agrupamento de Turnos de Mensagens (`aggregateAssistantTurns` em `MessageList.tsx`):**
   - Criar uma função de agrupamento defensivo que combina mensagens consecutivas do `role === 'assistant'` pertencentes ao mesmo turno.
   - Consolida todos os `steps` (ferramentas e raciocínio) e junta o `textContent` de todas as etapas em um ÚNICO Turno de Assistente.
   - Garante que a UI renderize exatamente UM avatar "Oficina GPT", contendo o acordeão `StepAccordion` no topo e a resposta final em Markdown abaixo.
2. **Persistência Garantida de Mensagens no Banco Supabase (`agente.tsx`):**
   - Refatorar a gravação no Supabase para extrair todo o texto acumulado no turno do assistente durante o `onFinish` ou transição de `status`.
   - Grava a resposta completa na tabela `messages` do Supabase, garantindo que o histórico permaneça 100% intacto após F5 (refresh).
3. **Validação E2E Automatizada (Playwright + Teste de F5):**
   - Enviar a consulta da OS `22551` no Rei do Óleo Mauá.
   - Validar que existe apenas 1 balão do Oficina GPT com o passo a passo expansível.
   - Simular um F5 (page.reload) e verificar visualmente via screenshot que a resposta do assistente permanece salva no histórico.

## Contratos de Dados
- `AggregatedTurn`: `{ id: string, role: 'user' | 'assistant', textContent: string, steps: StepItem[], isError?: boolean, error?: any }`

## Features Existentes Impactadas
- `src/components/chat/MessageList.tsx`: Implementação do agrupamento de turnos.
- `src/routes/agente.tsx`: Garantia de salvamento da mensagem agrupada no Supabase.

## Risco Principal
Garantir que o agrupamento de mensagens consecutivas não mescle respostas de turnos diferentes por engano.
