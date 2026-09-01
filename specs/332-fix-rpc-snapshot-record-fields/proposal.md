# Proposal: Correção de Acesso a Campos de Snapshot na RPC (332)

## Problema
Ao carregar a tela de conciliação no frontend (`http://localhost:8080/`), a chamada à RPC `get_daily_reconciliation_summary` falha com o erro PostgreSQL:
`code: '42703', message: 'record "v_snapshot" has no field "caixa_anterior"'`.

**Causa Raiz:**
Na migration `20260901000008_fix_nulls_and_revert_diferenca.sql`, no Ramal 1 (leitura de snapshot fechado `is_closed = true`), foram acessados diretamente como atributos do record `v_snapshot` campos que não são colunas físicas da tabela `daily_snapshots`, mas sim chaves armazenadas dentro da coluna JSONB `v_snapshot.metadata`:
1. `v_snapshot.caixa_anterior` (não existe como coluna física)
2. `v_snapshot.fluxo_caixa` (não existe como coluna física)
3. `v_snapshot.faturamento_anterior` (não existe como coluna física)
4. `v_snapshot.faturamento_periodo` (não existe como coluna física)
5. `v_snapshot.valor_disponivel` (não existe como coluna física)

Isso impede a abertura e visualização de qualquer data que já possua snapshot fechado ou histórico selado.

## Solução Proposta (Foco em Reuso e Correção)
Vamos alterar a função existente `get_daily_reconciliation_summary` via `CREATE OR REPLACE FUNCTION` em nova migration (`20260901000009_fix_snapshot_record_fields.sql`) [MODIFY].
- Ajustar todas as extrações de campos de `v_snapshot` para lerem de `v_snapshot.metadata->>'chave'` quando o campo não for coluna física da tabela `daily_snapshots`.
- Garantir que no Ramal 2 (dia aberto / dinâmico) as verificações `IF v_snapshot_found` protejam acessos seguros.
- Nenhuma alteração de contrato TypeScript é necessária no Frontend, pois o formato de retorno da RPC permanece 100% idêntico.

## Investigação e Análise de Reuso
- **Tabelas / RPCs Existentes:** `daily_snapshots`, `get_daily_reconciliation_summary`. Reutilização total sem criação de novas tabelas ou tipos.
- **Componentes / Hooks Existentes:** `src/hooks/useBackendConciliacao.ts` (`useDailyReconciliationSummary`) já está preparado para receber a estrutura canônica.

## Contratos de Dados & SQL (Supabase)
- Correção de `get_daily_reconciliation_summary`:
  - `v_caixa_anterior := COALESCE((v_snapshot.metadata->>'caixa_anterior')::numeric, 0);`
  - `v_fluxo_caixa := COALESCE((v_snapshot.metadata->>'fluxo_caixa')::numeric, 0);`
  - `v_faturamento_anterior := COALESCE((v_snapshot.metadata->>'faturamento_anterior')::numeric, 0);`
  - `v_faturamento_periodo := COALESCE((v_snapshot.metadata->>'faturamento_periodo')::numeric, 0);`
  - `v_valor_disp_contas := COALESCE((v_snapshot.metadata->>'valor_disp_contas')::numeric, (v_snapshot.metadata->>'valor_disponivel')::numeric, 0);`

## Risco Principal e Mitigação
- **Risco:** Outras funções ou RPCs acessarem colunas inexistentes de `daily_snapshots`.
- **Mitigação:** Varredura completa de todas as ocorrências de `daily_snapshots` nas migrations para assegurar que apenas colunas físicas (`caixa_atual`, `saldo_bancario`, `faturamento`, `dinheiro_mp`, `a_receber_manual`, `total_patio`, `contas_a_pagar`, `juros_rede`, `saldo_negativo_itau`, `metadata`, `is_closed`) sejam acessadas via `.coluna`.
