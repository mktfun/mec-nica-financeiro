# Proposal: Oficina System Connector (oficina-system-connector)

## Problema

O ConciliaMec Bot hoje expõe apenas 2 endpoints de **leitura sob demanda**: `GET /api/os/:id` e `GET /api/os/detalhe/:id`. Ele é um "bot de OS" operando de forma míope, mesmo que internamente o Playwright já possua os seletores e o Atlas para navegar em Financeiro, Estoque, Agenda e Config do Oficina Inteligente.

**Consequências diretas:**
- O agente IA do webapp não consegue responder perguntas sobre contas a pagar, agenda, estoque ou config sem tentar chamar um endpoint inexistente ou alucinando dados.
- A API não recebe `loja_slug` — o bot assume que há uma única empresa, o que quebra o uso multi-loja do ConciliaMec.
- Não existe um mapa de vínculo `store_id ConciliaMec ↔ empresa_slug Oficina` — o agente IA não sabe em qual empresa entrar para responder "OS da loja Jabaquara".

## Solução Proposta

Expandir o `bot/src/server.ts` e o `bot/src/scrapers/oficina.ts` para:

1. **Adicionar parâmetro `?loja=<slug>` em todos os endpoints de leitura.** O bot usará esse slug para selecionar a empresa correta no Oficina antes de navegar.
2. **Criar arquivo `bot/src/config/empresas.json`** — mapa `store_id → { empresa_slug, nome_display, id_empresa_oi }` que define o vínculo entre lojas do ConciliaMec e o Oficina Inteligente.
3. **Criar scrapers para novos domínios** (Financeiro, Agenda, Config) como funções em `oficina.ts`.
4. **Criar endpoints de leitura para esses domínios** no `server.ts`.
5. **Atualizar o `ai-chat/index.ts` (Edge Function)** para adicionar tools que correspondem a esses novos endpoints.

## Contratos de Dados

### Tabelas Supabase envolvidas (só leitura)
- `stores`: `id`, `name` — fonte para validar e listar `store_id`
- `patio_os`: OS locais
- `reconciliations`: fechamentos
- `receivables`: contas a receber
- `transactions`: movimentações

### Novos endpoints no Bot (source externa / Playwright)
```
GET /api/contas-pagar?loja=<slug>&vencimento_inicio=YYYY-MM-DD&vencimento_fim=YYYY-MM-DD
GET /api/contas-receber?loja=<slug>&vencimento_inicio=YYYY-MM-DD
GET /api/agenda?loja=<slug>&data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
GET /api/config/status-os?loja=<slug>
GET /api/config/formas-pagamento?loja=<slug>
```

### Config de Vínculo de Lojas
```json
// bot/src/config/empresas.json
{
  "st-01": { "empresa_slug": "mp_jabaquara", "nome_display": "MP Jabaquara", "id_empresa_oi": "12" },
  "st-02": { "empresa_slug": "mp_brooklin",  "nome_display": "MP Brooklin",  "id_empresa_oi": "13" }
}
```
*Campos preenchidos na primeira execução; pode ser configurado também no Supabase via `stores.metadata`.*

### Mudança nos endpoints existentes
```
GET /api/os/:id?loja=<slug>          (param opcional — retrocede para busca global se ausente)
GET /api/os/detalhe/:id?loja=<slug>  (idem)
```

## API / Interface

### Bot (Express — `bot/src/server.ts`)
- 5 novos endpoints GET (contas-pagar, contas-receber, agenda, config/status-os, config/formas-pagamento)
- Helper interno `resolveEmpresa(lojaSlug)` que lê `empresas.json` e retorna `id_empresa_oi`
- Helper interno `ensureCompany(page, idEmpresaOI)` que usa Playwright para trocar de empresa no Oficina

### Scrapers (`bot/src/scrapers/oficina.ts`)
- `fetchContasPagar(page, filtros)` → retorna `ContaPagar[]`
- `fetchContasReceber(page, filtros)` → retorna `ContaReceber[]`
- `fetchAgenda(page, filtros)` → retorna `AgendaItem[]`
- `fetchConfigStatusOS(page)` → retorna `StatusOS[]`
- `fetchConfigFormasPagamento(page)` → retorna `FormaPagamento[]`

### Edge Function (`supabase/functions/ai-chat/index.ts`)
- `consulta_contas_pagar_oficina` — chama `/api/contas-pagar?loja=...` no bot
- `consulta_agenda_oficina` — chama `/api/agenda?loja=...` no bot
- `consulta_config_oficina` — chama `/api/config/...` no bot
- Todas as tools existentes ganham parâmetro `loja` opcional

## Features Existentes Impactadas

- `GET /api/os/:id` e `GET /api/os/detalhe/:id` → ganham parâmetro `?loja` opcional (backward compatible)
- `consulta_os_detalhe_completo` (Edge Function tool) → ganha campo `loja` no schema Zod
- `supabaseUploader.ts#getStoreMap()` → pode ser reutilizado para popular `empresas.json`

## Risco Principal

**Seletores do Oficina para novos domínios são desconhecidos.** Temos o Atlas mapeado em memória, mas os seletores exatos de `wfContaBuscaPagar.aspx` (IDs dos inputs de filtro, ID da grid, colunas) precisam ser validados em ambiente real (bot headed ou screenshot). O risco é implementar scrapers com seletores errados que retornam arrays vazios em vez de erros explícitos.

**Mitigação:** Cada nova função de scraper deverá ter um fallback que retorna `{ warning: "Seletor não encontrado", parcial: [] }` em vez de exceção, permitindo que a IA informe ao usuário que o dado não pôde ser extraído em vez de quebrar a função inteira.
