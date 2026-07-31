# Design: Oficina System Connector (oficina-system-connector)

## Arquitetura Técnica

```text
Agente IA (Edge Function ai-chat)
  |
  ├── Tools LOCAIS (banco Supabase — fonte primária)
  │     consulta_resumo_os          → patio_os
  │     consulta_saldo_contas       → transactions
  │     consulta_conciliacao_periodo→ reconciliations
  │     consulta_contas_em_aberto   → receivables
  │
  └── Tools EXTERNAS (bot.tork.services — fonte secundária)
        consulta_os_detalhe_completo   → GET /api/os/detalhe/:id?loja=<slug>
        consulta_contas_pagar_oficina  → GET /api/contas-pagar?loja=<slug>&...
        consulta_contas_receber_oficina→ GET /api/contas-receber?loja=<slug>&...
        consulta_agenda_oficina        → GET /api/agenda?loja=<slug>&...
        consulta_config_oficina        → GET /api/config/<recurso>?loja=<slug>

Bot (VPS Docker — bot.tork.services)
  |
  ├── server.ts (Express + auth middleware)
  │     GET /api/contas-pagar
  │     GET /api/contas-receber
  │     GET /api/agenda
  │     GET /api/config/status-os
  │     GET /api/config/formas-pagamento
  │
  ├── scrapers/oficina.ts
  │     fetchContasPagar(page, filtros) → navega wfContaBuscaPagar.aspx
  │     fetchContasReceber(page, filtros)→ navega wfContaBuscaReceber.aspx
  │     fetchAgenda(page, filtros)       → navega wfAgendaCalendario.aspx
  │     fetchConfigStatusOS(page)        → navega wfStatusOrdemDeServico.aspx
  │     fetchConfigFormasPagamento(page) → navega wfFormaDePagamento.aspx
  │
  └── config/empresas.json
        store_id (ConciliaMec) → { empresa_slug, nome_display, id_empresa_oi }
```

## Interfaces TypeScript

```typescript
// bot/src/config/empresas.ts
export interface EmpresaConfig {
  empresa_slug: string;   // ex: "mp_jabaquara"
  nome_display: string;   // ex: "MP Jabaquara"
  id_empresa_oi: string;  // ID interno do Oficina para trocar empresa
}
export type EmpresaMap = Record<string, EmpresaConfig>; // chave = store_id

// bot/src/scrapers/oficina.ts — novos tipos
export interface ContaPagar {
  id_interno: string;
  fornecedor: string;
  plano_contas: string;
  valor_original: number;
  valor_em_aberto: number;
  vencimento: string; // YYYY-MM-DD
  status: string;
}

export interface AgendaItem {
  os_number?: string;
  descricao: string;
  data: string;
  hora: string;
  responsavel?: string;
  placa?: string;
  status: string;
}

export interface StatusOS {
  id: string;
  descricao: string;
  cor?: string;
}

export interface FormaPagamento {
  id: string;
  descricao: string;
  ativo: boolean;
}

// bot/src/scrapers/oficina.ts — helper de empresa
export interface FiltrosFinanceiro {
  lojaSlug?: string;
  vencimentoInicio?: string;
  vencimentoFim?: string;
  status?: string;
}

export interface FiltrosAgenda {
  lojaSlug?: string;
  dataInicio: string;
  dataFim: string;
}
```

## Componentes / Hooks / Funções

### Bot (`bot/src/`)

| Arquivo | Função | Responsabilidade |
|---|---|---|
| `config/empresas.json` | — | Mapa store_id → empresa OI |
| `config/empresas.ts` | `resolveEmpresa(lojaSlug)` | Retorna `EmpresaConfig` pelo slug ou store_id |
| `scrapers/oficina.ts` | `ensureCompany(page, idEmpresaOI)` | Muda empresa ativa no Oficina via Playwright |
| `scrapers/oficina.ts` | `fetchContasPagar(page, filtros)` | Navega `wfContaBuscaPagar.aspx`, aplica filtros, lê grid |
| `scrapers/oficina.ts` | `fetchContasReceber(page, filtros)` | Navega `wfContaBuscaReceber.aspx`, aplica filtros, lê grid |
| `scrapers/oficina.ts` | `fetchAgenda(page, filtros)` | Navega `wfAgendaCalendario.aspx`, lê slots |
| `scrapers/oficina.ts` | `fetchConfigStatusOS(page)` | Navega `wfStatusOrdemDeServico.aspx`, lê lista |
| `scrapers/oficina.ts` | `fetchConfigFormasPagamento(page)` | Navega `wfFormaDePagamento.aspx`, lê lista |
| `server.ts` | `GET /api/contas-pagar` | Endpoint público do conector |
| `server.ts` | `GET /api/contas-receber` | Endpoint público do conector |
| `server.ts` | `GET /api/agenda` | Endpoint público do conector |
| `server.ts` | `GET /api/config/status-os` | Endpoint público do conector |
| `server.ts` | `GET /api/config/formas-pagamento` | Endpoint público do conector |

### Edge Function (`supabase/functions/ai-chat/index.ts`)

| Tool | Descrição | Quando usar |
|---|---|---|
| `consulta_contas_pagar_oficina` | Busca contas a pagar no Oficina externo | Dado não existe no Supabase local |
| `consulta_contas_receber_oficina` | Busca contas a receber no Oficina externo | Idem |
| `consulta_agenda_oficina` | Busca agenda do dia/semana | Não existe localmente |
| `consulta_config_oficina` | Busca config de status/formas | Não existe localmente |

Todas as tools externas incluem o parâmetro `loja` (opcional — mapeado a partir do contexto da conversa).

## Padrão de Seletores ASP.NET WebForms

Baseado na memória `domain.md#vps-mcp-aspnet`:

```typescript
// ✅ CORRETO — usar substring matcher para IDs dinâmicos
await page.fill('input[id*="txtVencimentoInicio"]', vencimentoInicio);
await page.click('input[id*="btnBuscar"]');

const [_] = await Promise.all([
  page.waitForResponse(
    res => res.url().includes('wfContaBuscaPagar.aspx') && res.status() === 200,
    { timeout: 30_000 }
  ),
  page.click('input[id*="btnBuscar"]')
]);

await page.waitForSelector('table[id*="grd"]', { timeout: 10_000 });
```

## Infra / Deploy

- **Bot (VPS):** Alterações em `bot/src/`. Deploy via `git push main` → VPS faz `git pull` → `docker compose build` → `docker compose up -d`.
- **Edge Function:** Deploy via `npx supabase functions deploy ai-chat --project-ref cnwzsvowkfymtdiryhqc`.
- **Variáveis de ambiente no Bot:** Nenhuma nova necessária — usa `BOT_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` já existentes.
- **`empresas.json`:** Commitado junto com o código. Pode ser sobrescrito por configuração no Supabase futuramente.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 — Contas a Pagar com Loja:**
  - Estado: Bot rodando, loja `mp_jabaquara` mapeada no `empresas.json`
  - Ação: `GET /api/contas-pagar?loja=mp_jabaquara&vencimento_inicio=2026-07-01`
  - Esperado: JSON com array de `ContaPagar[]`, cada item com fornecedor, valor, vencimento

- **Cenário 2 — Agente IA usa loja a partir do contexto:**
  - Estado: Usuário pergunta "quais contas vencem essa semana na Jabaquara?"
  - Ação: Agente extrai "Jabaquara" → mapeia para `store_id st-01` → passa `loja=mp_jabaquara` para `consulta_contas_pagar_oficina`
  - Esperado: Agente retorna lista formatada de contas a vencer

- **Cenário 3 — Bot sem loja fornecida:**
  - Estado: `GET /api/contas-pagar` sem parâmetro `loja`
  - Esperado: Retorna `400 Bad Request: "Parâmetro loja é obrigatório."` (domínio financeiro requer empresa)

- **Cenário 4 — Seletor não encontrado (seletor inválido no scraper):**
  - Estado: Scraper tenta `table[id*="grd"]` mas a tela mudou
  - Esperado: Retorna `{ warning: "Grid não encontrada na tela", parcial: [] }` — NÃO exceção não tratada

- **Cenário 5 — Agente IA sem loja no contexto:**
  - Estado: Usuário pergunta "quais contas vencem essa semana?" (sem mencionar loja)
  - Esperado: Agente responde pedindo esclarecimento: "Para qual loja deseja consultar?"
