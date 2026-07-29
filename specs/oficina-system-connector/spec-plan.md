# Spec Plan: Oficina System Connector (oficina-system-connector)

## Tasks

### 📦 INFRA — Config de Lojas

- [x] [INFRA] Criar `bot/src/config/empresas.json` com o mapa `store_id → { empresa_slug, nome_display, id_empresa_oi }`. Preencher com os slugs das lojas já cadastradas na tabela `stores` do Supabase. Cada registro deve ter `id_empresa_oi` (o número interno do Oficina para troca de empresa) — buscar esse ID via bot headed se necessário.

- [x] [INFRA] Criar `bot/src/config/empresas.ts` com a função `resolveEmpresa(lojaSlug: string): EmpresaConfig | null` que lê o JSON e retorna a config da loja pelo slug ou store_id.

### 🤖 BOT — Scrapers Novos

- [/] [BOT] Implementar `ensureCompany(page: Page, idEmpresaOI: string): Promise<void>` em `oficina.ts`. Usa o seletor do dropdown de empresa do Oficina (ex: `select[id*="ddlEmpresa"]`) para trocar de empresa antes de navegar para qualquer tela.

- [/] [BOT] Implementar `fetchContasPagar(page: Page, filtros: FiltrosFinanceiro): Promise<ContaPagar[]>` em `oficina.ts`. Navega `wfContaBuscaPagar.aspx`, aplica filtros de vencimento, lê grid `table[id*="grd"]`, retorna array. Em caso de seletor não encontrado: retorna `{ warning: "...", parcial: [] }`.

- [/] [BOT] Implementar `fetchContasReceber(page: Page, filtros: FiltrosFinanceiro): Promise<ContaReceber[]>` em `oficina.ts`. Navega `wfContaBuscaReceber.aspx`, mesma lógica.

- [/] [BOT] Implementar `fetchAgenda(page: Page, filtros: FiltrosAgenda): Promise<AgendaItem[]>` em `oficina.ts`. Navega `wfAgendaCalendario.aspx`, lê eventos do período.

- [/] [BOT] Implementar `fetchConfigStatusOS(page: Page): Promise<StatusOS[]>` e `fetchConfigFormasPagamento(page: Page): Promise<FormaPagamento[]>` em `oficina.ts`.

### 🌐 BOT — Novos Endpoints HTTP

- [ ] [BOT] Criar `GET /api/contas-pagar` em `server.ts`. Valida `loja` (obrigatório — 400 se ausente). Resolve empresa via `resolveEmpresa`, chama `ensureCompany`, chama `fetchContasPagar`. Retorna `{ success: true, data: ContaPagar[] }`.

- [ ] [BOT] Criar `GET /api/contas-receber` em `server.ts`. Mesma estrutura.

- [ ] [BOT] Criar `GET /api/agenda` em `server.ts`. Valida `loja`, `data_inicio`, `data_fim`.

- [ ] [BOT] Criar `GET /api/config/status-os` e `GET /api/config/formas-pagamento` em `server.ts`. `loja` obrigatório.

- [ ] [BOT] Atualizar `GET /api/os/:id` e `GET /api/os/detalhe/:id` para aceitar `?loja=<slug>` e passar o parâmetro para `ensureCompany` antes da busca (backward compatible — não quebra se ausente).

### 🧠 EDGE FUNCTION — Novas Tools

- [ ] [EDGE FUNCTION] Adicionar tool `consulta_contas_pagar_oficina` em `ai-chat/index.ts`. Parâmetros Zod: `loja` (required), `vencimento_inicio` (optional), `vencimento_fim` (optional). Chama `GET /api/contas-pagar` no bot. Retorno com catch JSON legível.

- [ ] [EDGE FUNCTION] Adicionar tool `consulta_contas_receber_oficina`. Mesma estrutura.

- [ ] [EDGE FUNCTION] Adicionar tool `consulta_agenda_oficina`. Parâmetros: `loja`, `data_inicio`, `data_fim`.

- [ ] [EDGE FUNCTION] Adicionar tool `consulta_config_oficina`. Parâmetro: `loja`, `recurso` (enum: `status-os | formas-pagamento`).

- [ ] [EDGE FUNCTION] Atualizar tool `consulta_os_detalhe_completo` para aceitar `loja` opcional no schema Zod e repassá-la na URL: `/api/os/detalhe/:id?loja=...`.

- [ ] [EDGE FUNCTION] Atualizar o `systemPrompt` para:
  - Instruir o agente a extrair `loja` do contexto da pergunta antes de usar tools externas.
  - Se a loja não estiver clara, perguntar ao usuário antes de chamar a ferramenta.
  - Listar os novos domínios disponíveis (Financeiro, Agenda, Config) como fontes secundárias.

### 🚀 DEPLOY

- [ ] [DEPLOY] Commitar todas as alterações do bot e fazer push para GitHub. Na VPS: `git pull && docker compose build && docker compose up -d`.

- [ ] [DEPLOY] Deploy da Edge Function atualizada: `npx supabase functions deploy ai-chat --project-ref cnwzsvowkfymtdiryhqc`.

### 🧪 TEST

- [ ] [TEST] Verificar Cenário 1: `GET /api/contas-pagar?loja=<slug_real>&vencimento_inicio=2026-07-01` retorna array com pelo menos um item.

- [ ] [TEST] Verificar Cenário 2: Agente IA responde "quais contas vencem essa semana na Jabaquara?" usando `consulta_contas_pagar_oficina` com `loja` preenchido.

- [ ] [TEST] Verificar Cenário 3: `GET /api/contas-pagar` sem `loja` retorna 400.

- [ ] [TEST] Verificar Cenário 4: Scraper com seletor quebrado retorna `{ warning: "..." }` sem lançar exceção.

- [ ] [TEST] Verificar Cenário 5: Agente pergunta "para qual loja?" quando a pergunta não menciona loja.
