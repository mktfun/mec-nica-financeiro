# Design: Oficina Inteligente System Connector (oi-system-connector)

## Arquitetura Técnica
Edge Function (`ai-chat/index.ts`) → Bot VPS (`bot/src/server.ts`) → Playwright (`oficina.ts`) → ASP.NET.

1. **System Prompt Routing Layer (Edge Function):**
   - O `systemPrompt` exigirá explicitamente a identificaçÁo do domínio (OS, Financeiro, Estoque, Agenda) antes do acionamento de qualquer tool.
   
2. **Tool de ConsolidaçÁo de OS:**
   - A tool será nomeada `consulta_os_detalhe_completo` para substituir fluxos genéricos.
   
3. **Múltiplos Placeholders de Tools (Edge Function):**
   - O objeto `mcpTools` será ampliado para conter declarações de domínio cruzado. Como o bot (backend real) ainda precisa ser construído em `/vibe-apply` futuros para alguns deles, as tools retornarÁo: `"Funcionalidade em desenvolvimento no MCP"`, exceto a de OS detalhe que implementaremos nesta especificaçÁo.

## Componentes / Hooks / Funções

1. **Supabase Edge Function: `supabase/functions/ai-chat/index.ts`**
   - **Mudar `systemPrompt`**: Adicionar catálogo explícito de módulos do Oficina Inteligente e instruçÁo de routing.
   - **Atualizar `mcpTools`**:
     - Substituir/modificar tools relacionadas à OS vaga.
     - Adicionar `consulta_os_detalhe_completo(osNumber)`.
     - Adicionar placeholders como `consulta_fluxo_caixa`, `consulta_estoque_baixo`, `consulta_agenda_dia`.

2. **Bot Node.js: `bot/src/server.ts`**
   - Adicionar o novo endpoint `GET /api/os/:id/detalhes` (ou apenas injetar na ferramenta MCP proxy via POST `/api/sync/os-detail`).

3. **Bot Scraper: `bot/src/scrapers/oficina.ts`**
   - Criar `fetchOSDetails(page, osNumber)`.
   - Lógica Playwright:
     - Usar `fetchOSByNumber(page, osNumber)` para entrar na tela de listagem de OS.
     - Clicar na OS correspondente (ícone de ediçÁo ou link).
     - Extrair abas: Header (veículo, responsável), Tabela de Serviços (descriçÁo, qtd, valor) e Tabela de Pagamentos.

## Fluxo de UI
Sem mudanças visuais para o cliente WebApp além das respostas textuais mais robustas exibidas na MessageList.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Usuário envia "Me detalhe a OS 1763" → IA seleciona `consulta_os_detalhe_completo(1763)` em vez de busca genérica → Retorna relatório completo com pagamentos e serviços.
- **Cenário 2:** Usuário envia "Quais contas vencem hoje?" → IA seleciona a tool do domínio financeiro (`consulta_contas_pagar_exposicao`) sem assumir que é sobre OS.
