# Design: Oficina AI v2 (oficina-ai-v2)

## Arquitetura Técnica
O fluxo de dados da IA continuará sendo Vercel AI SDK (React) -> Supabase Edge Function (`ai-chat`).
O que muda é a instrumentação do lado da Edge Function (para injetar telemetria correta das novas rotas de bot) e a simplificação visual no frontend.

## Componentes / Hooks / Funções
1. **`src/components/chat/PromptInput.tsx`**:
   - Ajustar as props `models` e `efforts`.
   - Limpar o `placeholder`.
   - Remover as labels estáticas de modelo que não condizem com a realidade do AI SDK na Edge Function.

2. **`src/components/chat/MessageList.tsx`**:
   - Modificar o bloco condicional `if (isLoading)` no final do arquivo.
   - Substituir as divs que contém "Consultando Oficina Inteligente" por um loader sutil e minimalista (como 3 pontos pulsantes ou um spinner limpo, usando `lucide-react` ou framer-motion simples).
   - Manter a visualização elegante no `details` para quando o `mcpLogs` for retornado finalizado.

3. **`supabase/functions/ai-chat/index.ts`**:
   - Criar um helper `logToolExecution(action, params, result, supabaseClient)` para não poluir cada tool.
   - Refatorar `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`, `consulta_agenda_oficina`, e `consulta_config_oficina` para invocar esse helper de log.
   - Encurtar o system prompt: Fazer com que o Agent deduza as lojas baseado nas descrições de ferramentas, ou extrair a lista de lojas de uma query rápida ao Supabase DB no começo do edge function em vez de colocar no system prompt fixo.

## Fluxo de UI
1. O usuário entra na rota do agente.
2. Vê o input com o placeholder limpo: *"Pergunte ao Oficina GPT..."*
3. O seletor de inteligência exibe opções coerentes: "Flash", "Pro", "Ultra".
4. Ao enviar a mensagem, um loader clean e abstrato é exibido, sem textos simulando ações humanas (nada de "Refletindo", "Analisando").
5. Após o LLM decidir chamar uma tool, a requisição HTTP vai para o VPS. O log do MCP é salvo no Supabase automaticamente.
6. A resposta volta e é renderizada com a badge de ferramenta (já funcional na MessageList) e fica visível no painel Telemetria.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Renderização do Input → O texto coube na tela e o seletor está limpo.
- **Cenário 2:** Request de Contas a Pagar → O bot responde. O painel Telemetria captura a execução da ferramenta `consulta_contas_pagar_oficina`.
