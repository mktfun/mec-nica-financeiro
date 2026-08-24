# Proposal: Correção do Fechamento por Filial e Contrato de Dados por Loja (279)

## Problema
No painel de Conciliação Diária (`/conciliacao`), a seção "Fechamento por Filial" está exibindo todos os valores zerados (`R$ 0,00`) para todas as 10 lojas monitoradas:
1. A RPC `get_daily_reconciliation_summary` retornava a chave `stores_detail` no JSONB de saída, enquanto o frontend TypeScript (`useBackendConciliacao.ts` e `conciliacao.index.tsx`) consome a propriedade `stores`.
2. As propriedades internas de cada loja agregada estavam com nomenclaturas divergentes (`bank_balance` vs `saldo_banco`, `rede_ofx` vs `maquininha`, `pix_os_ofx` vs `pix`, `patio_os` vs `na_loja_os`, `cartoes_a_compensar` vs `nao_entrou_valor`).
3. O header consolidado do dia ("Apurado Sistema" e "Entradas OFX") depende da soma de `previsto_ofx` e `faturamento_ofx` de cada loja.

## Solução Proposta
1. **[BACKEND] Atualizar a RPC `get_daily_reconciliation_summary`:**
   - Retornar a propriedade `stores` no JSONB final com o array completo e ordenado das 10 lojas ativas.
   - Fornecer tanto as chaves canônicas do frontend (`saldo_banco`, `saldo_banco_ofx`, `maquininha`, `pix`, `na_loja_os`, `previsto_ofx`, `diferenca`, `nao_entrou_valor`, `status_compensacao`, `status`) quanto os aliases estendidos para retrocompatibilidade.
   - Garantir que `saldo_banco` reflita o saldo real da conta corrente Itaú de cada loja vindo de `reconciliations.bank_total` no dia selecionado.
   - Garantir que `na_loja_os` reflita a soma exata dos saldos em aberto da loja em `patio_os`.
2. **[FRONTEND] Robustez no Hook `useBackendConciliacao.ts` e na Rota `conciliacao.index.tsx`:**
   - Adicionar fallback para ler tanto `summary.stores` quanto `summary.stores_detail`.
   - Normalizar a tipagem `StoreReconciliationSummary` para mapear transparentemente todos os campos.

## Contratos de Dados
- **RPC:** `get_daily_reconciliation_summary(p_date date)`
- **Campos do objeto de cada loja em `stores`:**
  - `store_id`: UUID/text identificador da loja (`st-01` a `st-09`, `3a3dd7ce...`)
  - `store_name`: Nome formatado da loja
  - `saldo_banco`: Saldo consolidado da conta bancária (ex: Mauá R$ 5.059,26, Jorge Beretta R$ 25.711,31, etc.)
  - `saldo_banco_ofx`: Saldo direto do extrato bancário
  - `maquininha`: Total recebido via cartões Rede no OFX
  - `pix`: Total recebido via PIX associado a OSs no OFX
  - `na_loja_os`: Total do pátio pendente na respectiva loja
  - `previsto_ofx`: Total de entradas brutas no OFX da loja
  - `diferenca`: Entradas OFX não conciliadas/não justificadas
  - `status_compensacao`: `'entrou' | 'parcial' | 'nao_entrou' | 'sem_movimento'`
  - `nao_entrou_valor`: Vendas em maquininha a compensar (se houver)
  - `status`: `'approved' | 'divergence'`

## Features Existentes Impactadas
- `/conciliacao` (Painel consolidado e lista de lojas por filial)
- `/conciliacao/:lojaId` (Detalhes da conciliação por filial)
- `useDailyReconciliationSummary` (Hook central de conciliação)

## Risco Principal
- Incompatibilidade de nomes de atributos entre o payload retornado pela RPC e os componentes React.
- **Mitigação:** Suportar ambos os nomes no backend (duplo mapeamento) e tipagem segura no frontend.
