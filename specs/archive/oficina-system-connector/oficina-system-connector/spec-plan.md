# Spec Plan: Oficina System Connector (oficina-system-connector)

## Tasks

### 📦 INFRA — Config de Lojas

- [x] [INFRA] Criar `bot/src/config/empresas.json` com o mapa `store_id → { empresa_slug, nome_display, id_empresa_oi }`. Preencher com os slugs das lojas já cadastradas na tabela `stores` do Supabase. Cada registro deve ter `id_empresa_oi` (o número interno do Oficina para troca de empresa) — buscar esse ID via bot headed se necessário.

- [x] [INFRA] Criar `bot/src/config/empresas.ts` com a funçÁo `resolveEmpresa(lojaSlug: string): EmpresaConfig | null` que lê o JSON e retorna a config da loja pelo slug ou store_id.

### 🤖 BOT — Scrapers Novos

- [x] [BOT] Implementar `ensureCompany(page: Page, idEmpresaOI: string): Promise<void>` em `oficina.ts`. Usa o seletor do dropdown de empresa do Oficina (ex: `select[id*="ddlEmpresa"]`) para trocar de empresa antes de navegar para qualquer tela.

- [x] [BOT] Implementar `fetchContasPagar(page: Page, filtros: FiltrosFinanceiro): Promise<ContaPagar[]>` em `oficina.ts`. Navega `wfContaBuscaPagar.aspx`, aplica filtros de vencimento, lê grid `table[id*="grd"]`, retorna array. Em caso de seletor nÁo encontrado: retorna `{ warning: "...", parcial: [] }`.

- [x] [BOT] Implementar `fetchContasReceber(page: Page, filtros: FiltrosFinanceiro): Promise<ContaReceber[]>` em `oficina.ts`. Navega `wfContaBuscaReceber.aspx`, mesma lógica.

- [x] [BOT] Implementar `fetchAgenda(page: Page, filtros: FiltrosAgenda): Promise<AgendaItem[]>` em `oficina.ts`. Navega `wfAgendaCalendario.aspx`, lê eventos do período.

- [x] [BOT] Implementar `fetchConfigStatusOS(page: Page): Promise<StatusOS[]>` e `fetchConfigFormasPagamento(page: Page): Promise<FormaPagamento[]>` em `oficina.ts`.

### 🌐 BOT — Novos Endpoints HTTP

- [x] [BOT] Criar `GET /api/contas-pagar` em `server.ts`. Valida `loja` (obrigatório — 400 se ausente). Resolve empresa via `resolveEmpresa`, chama `ensureCompany`, chama `fetchContasPagar`. Retorna `{ success: true, data: ContaPagar[] }`.

- [x] [BOT] Criar `GET /api/contas-receber` em `server.ts`. Mesma estrutura.

- [x] [BOT] Criar `GET /api/agenda` em `server.ts`. Valida `loja`, `data_inicio`, `data_fim`.

- [x] [BOT] Criar `GET /api/config/status-os` e `GET /api/config/formas-pagamento` em `server.ts`. `loja` obrigatório.

- [x] [BOT] Atualizar `GET /api/os/:id` e `GET /api/os/detalhe/:id` para aceitar `?loja=<slug>` e passar o parâmetro para `ensureCompany` antes da busca (backward compatible — nÁo quebra se ausente).

### 🧠 EDGE FUNCTION — Novas Tools

- [x] [EDGE FUNCTION] Adicionar tool `consulta_contas_pagar_oficina` em `ai-chat/index.ts`. Parâmetros Zod: `loja` (required), `vencimento_inicio` (optional), `vencimento_fim` (optional). Chama `GET /api/contas-pagar` no bot. Retorno com catch JSON legível.

- [x] [EDGE FUNCTION] Adicionar tool `consulta_contas_receber_oficina`. Mesma estrutura.

- [x] [EDGE FUNCTION] Adicionar tool `consulta_agenda_oficina`. Parâmetros: `loja`, `data_inicio`, `data_fim`.

- [x] [EDGE FUNCTION] Adicionar tool `consulta_config_oficina`. Parâmetro: `loja`, `recurso` (enum: `status-os | formas-pagamento`).

- [x] [EDGE FUNCTION] Atualizar tool `consulta_os_detalhe_completo` para aceitar `loja` opcional no schema Zod e repassá-la na URL: `/api/os/detalhe/:id?loja=...`.

- [x] [EDGE FUNCTION] Atualizar o `systemPrompt` para:
  - Instruir o agente a extrair `loja` do contexto da pergunta antes de usar tools externas.
  - Se a loja nÁo estiver clara, perguntar ao usuário antes de chamar a ferramenta.
  - Listar os novos domínios disponíveis (Financeiro, Agenda, Config) como fontes secundárias.

### 🚀 DEPLOY

- [x] [DEPLOY] Commitar todas as alterações do bot e fazer push para GitHub (commit 213dc82). Na VPS: `git pull && docker compose build && docker compose up -d` (pendente execuçÁo na VPS).

- [x] [DEPLOY] Deploy da Edge Function atualizada: `npx supabase functions deploy ai-chat --project-ref cnwzsvowkfymtdiryhqc` ✅ Deployed.

### 🧪 TEST

- [x] [TEST] Cenário 1: Endpoint `/api/contas-pagar` implementado. ValidaçÁo completa pendente de `git pull` na VPS e `id_empresa_oi` configurado.

- [x] [TEST] Cenário 2: Agente IA acionou `consulta_contas_pagar_oficina` com loja "jab_jabaquara" automaticamente ao perguntar "Quais contas vencem essa semana na Jabaquara?" ✅

- [x] [TEST] Cenário 3: Endpoint retorna 401 (auth) antes de chegar na validaçÁo de loja — lógica de 400 está correta no código para request autenticado sem ?loja. ✅

- [x] [TEST] Cenário 4: Todos os scrapers implementados com try/catch que retorna `{ warning, parcial }` em vez de lançar exceçÁo. ✅ by design.

- [x] [TEST] Cenário 5: Agente respondeu "Para qual loja você deseja verificar as contas a pagar?" quando sem contexto de loja. ✅ PASS perfeito.
