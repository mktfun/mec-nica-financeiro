# Proposal: Passo a Passo Expansível, Tratamento de Erros Limpo e Prevenção de Respostas Vazias (fix-chat-steps-and-error-ui)

## Problema
1. **Caixas de Mensagem Vazias no Chat:** Quando o assistente realiza chamadas de ferramentas (MCP / RAG) antes de responder com texto, a mensagem da UI renderiza um balão escuro vazio (`<div className="...">`) sem conteúdo enquanto aguarda a resposta final.
2. **Ausência de Linha do Tempo / Passo a Passo Expansível:** O usuário não consegue visualizar a sequência de raciocínio e execução das ferramentas (ex: "Verificando banco local...", "Consultando Ordem de Serviço...", "Processando dados..."), exatamente como no ChatGPT / Perplexity.
3. **Formatos de Erro Brutos e Poluídos:** Em caso de exceção na Edge Function ou timeout, a mensagem de erro pode exibir payloads JSON grandes ou tags HTML de erro 400/500, poluindo o log e dificultando o diagnóstico do usuário.
4. **Duplicação / Lentidão de Respostas:** Falta de otimização no agrupamento de partes de mensagem do AI SDK 4.x/5.x.

## Solução Proposta
1. **Componente de Passo a Passo Expansível (`StepAccordion` em `MessageList.tsx`):**
   - Extrai todas as etapas (`tool-invocation`, `reasoning`, `toolInvocations`, `mcpLogs`) da mensagem.
   - Renderiza um acordeão expansível minimalista no topo da mensagem do assistente:
     - Estado recolhido: `✓ X etapas concluídas ˅` ou `⚡ Executando etapa X/Y... ˅`
     - Estado expandido: Lista elegante com ícone de estado (carregando/sucesso/erro), nome amigável da ferramenta (ex: "Consultando Ordem de Serviço #22551"), e os parâmetros/resultados formatados.
2. **Prevenção de Balões Vazios:**
   - No `MessageList.tsx`, só renderiza o balão de texto em markdown do assistente se `textContent.trim().length > 0`.
   - Se o assistente estiver apenas executando ferramentas ou pensando, exibe apenas a animação do `StepAccordion` e o loader fluido sem balão de texto vazio.
3. **Tratamento e Formatação Limpa de Erros (`agente.tsx` & `MessageList.tsx`):**
   - Sanitizador de erros: extrai apenas o trecho essencial da mensagem de erro (removendo tags HTML, extraindo o campo `error` de JSONs e limitando o tamanho).
   - Exibe um card de erro compacto com estilo Dark UI Zinc-950 com borda vermelha sutil (`bg-red-950/20 border-red-800/40 text-red-300`), facilitando auditorias e diagnósticos sem Poluição visual.
4. **Validação E2E Automatizada com Playwright:**
   - Testar o fluxo completo em `http://localhost:8080/agente` enviando a consulta da OS `22551` no Rei do Óleo Mauá.
   - Validar via Playwright e screenshot que o passo a passo expansível é exibido, que a resposta do assistente não é duplicada nem fica em branco, e que o código está 100% funcional.

## Contratos de Dados
- `StepItem`: `{ id: string, title: string, status: 'pending' | 'running' | 'completed' | 'error', details?: any }`
- Interface de Mensagem com `parts` e `toolInvocations` do SDK v4/v5

## Features Existentes Impactadas
- `src/components/chat/MessageList.tsx`: Refatoração da renderização de mensagens do assistente e ferramentas.
- `src/routes/agente.tsx`: Formatação defensiva no `onError` do `useChat`.

## Risco Principal
Garantir que a extração de `parts` do SDK v4 não omita o texto da resposta final após a conclusão dos passos de ferramentas.
