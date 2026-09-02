# Proposal: Transparência de Entradas OFX, Empilhamento Visual de Saldos e Governança Contábil na RPC (334)

## Problema

1. **Valores Espremidos e Truncados no Bloco Esquerdo do Card:**
   - Nos cards de filial (`StoreCardModulo1.tsx`), os três pilares fundamentais (`SALDO TOTAL`, `REDE TOTAL`, `PÁTIO (OS)`) estavam dispostos em uma grade horizontal de 3 colunas (`grid grid-cols-3`) dentro de uma coluna estreita.
   - Isso provocava truncamento com reticências (`R$ 29.37...`, `R$ 4.710,...`, `R$ 13.37...`), impedindo a leitura imediata dos saldos consolidados e dos valores do pátio e maquininha.
   - O usuário solicitou que estes valores fiquem **empilhados verticalmente** em linhas claras (`SALDO TOTAL`, `REDE TOTAL` com badge de compensação ao lado, `PÁTIO (OS)` com status de em aberto).

2. **Falta de Transparência e Ambiguidade nas Entradas:**
   - O usuário não conseguia discernir o que era efetivamente o crédito que caiu no extrato bancário (OFX) versus o que era o faturamento previsto registrado pela filial (POS Rede + PIX OS + Dinheiro em cofre).
   - No caso da filial Planalto (`st-06`), a RPC calculava tanto Realizado quanto Previsto como `R$ 2.060,05`, mas exibia uma `Dif. Entradas: +R$ 1.812,00`. Isso ocorria porque a RPC usava `rede_liquido` para compor o Realizado, em vez do somatório real de créditos do extrato OFX (`R$ 3.872,05`), gerando a falsa impressão de que a conta não fechava.

3. **Exigência de 100% dos Cálculos no Backend / PostgreSQL (Zero Math no Client):**
   - O usuário determinou categoricamente que nenhuma tela faça cálculos contábeis ou arbitrários no frontend. Toda agregação, decomposição de entradas/saídas e apuração de divergências deve ser retornada 100% pronta e auditada pela RPC `get_daily_reconciliation_summary`.

---

## Solução Proposta (Foco em Reuso e Correção)

1. **Reestruturação Visual Empilhada ([`StoreCardModulo1.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/StoreCardModulo1.tsx)):**
   - **Bloco Esquerdo (Vertical Stack):**
     * **SALDO TOTAL:** Exibido em linha inteira com fonte `font-mono text-sm sm:text-base font-bold`, sem truncamento (`R$ 8.146,36`).
     * **REDE TOTAL:** Exibido em linha inteira (`R$ 1.419,93`) acompanhado do badge semântico de compensação (`ENTROU` / `A COMPENSAR +R$` / `SEM MOVIMENTO`).
     * **PÁTIO (OS):** Exibido em linha inteira (`R$ 949,98`) com indicador claro (`Em Aberto` / `Zerado`).
   - **Bloco Direito (Split Dual de Diagnóstico):**
     * **Linha 1 — ENTRADAS:** Rótulo claro `ENTRADAS (OFX Crédito vs Previsto Vendas)`.
       - *OFX Entradas:* Somatório real de créditos bancários do dia (`ofx_entradas_total`).
       - *Previsto Vendas:* Vendas apuradas na filial (`previsto_vendas_total` = Rede POS + PIX OS + Cofre).
       - *Dif. Entradas:* Créditos excedentes / órfãos no banco (`dif_entradas`).
     * **Linha 2 — SAÍDAS:** Rótulo claro `SAÍDAS (OFX Débito vs Despesas Filial)`.
       - *Saídas OFX:* Débito real que saiu da conta (`ofx_saidas_total`).
       - *Contas a Pagar:* Despesas atribuídas à filial (`contas_loja_total`).
       - *Dif. Saídas:* Débitos órfãos no extrato sem conta correspondente (`dif_saidas`).

2. **Aperfeiçoamento Contábil na RPC PostgreSQL ([`get_daily_reconciliation_summary`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260901000010_fix_revenue_adjustments_contas_and_store_split.sql)):**
   - **Cômputo Real do OFX Entradas:** `ofx_entradas_total` passa a refletir estritamente a soma de todos os créditos do extrato (`type = 'in'`).
   - **Cômputo Real do Previsto Vendas:** `previsto_vendas_total = rede_liquido + pix_total + dinheiro_loja`.
   - **Cálculo de Diferenças:** `dif_entradas = entradas_orfas`, `dif_saidas = saidas_orfas`, `diferenca_total = entradas_orfas - saidas_orfas`.
   - **Garantia de Zero Math no Frontend:** O frontend consome estritamente as propriedades pré-calculadas retornadas pela RPC.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **RPCs / Tabelas Existentes Encontradas:**
  - Reuso integral da RPC `get_daily_reconciliation_summary` e `calculate_daily_conciliation` em `supabase/migrations/`.
  - Reuso das tabelas `ofx_transactions`, `pos_transactions`, `daily_manual_bills`, `patio_os`, `store_cash_vault` e `reconciliations`. Nenhuma tabela nova será criada.
- **Componentes / Hooks Existentes Encontrados:**
  - `src/components/conciliacao/StoreCardModulo1.tsx` `[MODIFY]`: Adaptação do layout para empilhamento vertical e rótulos semânticos.
  - `src/components/conciliacao/ConciliacaoLojasView.tsx` `[MODIFY]`: Passagem direta das propriedades pré-calculadas.
  - `src/hooks/useBackendConciliacao.ts` `[MODIFY]`: Tipagem consolidada com aliases bidirecionais.

---

## Contratos de Dados & SQL (Supabase)

```sql
-- Contrato retornado no array 'stores' / 'stores_detail' de get_daily_reconciliation_summary:
jsonb_build_object(
    'store_id', s.id,
    'store_name', s.name,
    'saldo_banco_ofx', COALESCE(r.bank_total, 0),
    'saldo_banco', (COALESCE(r.bank_total, 0) + COALESCE(v.vault_total, 0) + GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(oe.ofx_maquininhas, 0))),
    'rede_total', COALESCE(rd.rede_liquido, 0),
    'maquininha', COALESCE(rd.rede_liquido, 0),
    'pix_total', COALESCE(oe.pix_total, 0),
    'na_loja_os', COALESCE(p.patio_total, r.historical_na_loja, 0),
    'dinheiro_loja', COALESCE(v.vault_total, 0),
    'status_compensacao', ...,
    'nao_entrou_valor', GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(oe.ofx_maquininhas, 0)),
    
    -- Entradas
    'ofx_entradas_total', COALESCE(oe.ofx_entradas_total, 0),
    'entradas_realizadas', COALESCE(oe.ofx_entradas_total, 0),
    'previsto_vendas_total', (COALESCE(rd.rede_liquido, 0) + COALESCE(oe.pix_total, 0) + COALESCE(v.vault_total, 0)),
    'entradas_previsto', (COALESCE(rd.rede_liquido, 0) + COALESCE(oe.pix_total, 0) + COALESCE(v.vault_total, 0)),
    'dif_entradas', COALESCE(oe.entradas_orfas, 0),
    'diferenca_entradas', COALESCE(oe.entradas_orfas, 0),
    
    -- Saídas
    'ofx_saidas_total', COALESCE(sofx.ofx_saidas_total, 0),
    'saidas_ofx', COALESCE(sofx.ofx_saidas_total, 0),
    'contas_loja_total', COALESCE(bst.contas_loja_total, 0),
    'contas_loja', COALESCE(bst.contas_loja_total, 0),
    'dif_saidas', COALESCE(sofx.saidas_orfas, 0),
    'diferenca_saidas', COALESCE(sofx.saidas_orfas, 0),
    
    -- Diferença e Status
    'diferenca_total', (COALESCE(oe.entradas_orfas, 0) - COALESCE(sofx.saidas_orfas, 0)),
    'diferenca', (COALESCE(oe.entradas_orfas, 0) - COALESCE(sofx.saidas_orfas, 0)),
    'status', CASE WHEN ABS(COALESCE(oe.entradas_orfas, 0) - COALESCE(sofx.saidas_orfas, 0)) <= 0.05 THEN 'approved' ELSE 'divergent' END
)
```

---

## API & Componentes (Frontend)

```typescript
export interface StoreCardData {
  storeId: string;
  storeName: string;
  avatarUrl?: string;
  saldoBanco: number | null;
  maquininha: number | null;
  pix: number | null;
  naLojaOs: number | null;
  previsto: number | null;
  diferenca: number | null;
  entradasRealizadas: number | null;
  entradasPrevisto: number | null;
  diferencaEntradas: number | null;
  saidasOfx: number | null;
  contasLoja: number | null;
  diferencaSaidas: number | null;
  dinheiroLoja: number | null;
  statusCompensacao: 'entrou' | 'parcial' | 'nao_entrou' | 'a_compensar' | 'sem_movimento';
  naoEntrouValor: number | null;
  status: 'approved' | 'divergent' | 'conciliado' | 'pending';
  isMissingData: boolean;
}
```

---

## Risco Principal e Mitigação

- **Risco Principal:** Inconsistência entre os totais consolidados no cockpit do dia (`ResumoDiaPanel.tsx`) e a soma dos cards de filiais.
- **Mitigação:** Ambos os componentes utilizam o mesmo retorno de `useDailyReconciliationSummary`, assegurando que `summary.stores` compartilhe o mesmo snapshot ou draft dinâmico calculado pelo PostgreSQL.
