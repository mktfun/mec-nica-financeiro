# Proposal: Contabilização de Justificativas no Faturamento, Correção de Contas a Pagar e Split Dual de Entradas/Saídas nos Cards de Filiais (333)

## Problema

1. **Entradas Justificadas Não Contabilizadas no Faturamento do Dia:**
   - O usuário categorizou/justificou uma entrada bancária avulsa no extrato (ex: `PAGTO ITAU SEGUROS ITAU SEGUROS S/A + R$ 11.208,87` com categoria `OUTROS` e opção *"Somar ao Faturamento"*).
   - O hook `useCategorizeOrphan.ts` persistiu em `daily_revenue_adjustments` com `type = 'venda_avulsa'`, porém a RPC PostgreSQL `get_daily_reconciliation_summary` filtrou estritamente `type = 'addition'`, ignorando completamente a receita avulsa no cálculo de `v_faturamento_ajustes` e mantendo o Faturamento do Dia congelado em R$ 19.434,70 (sem somar os R$ 11.208,87).

2. **Card "Contas (Manual)" Exibindo R$ 0,00:**
   - No painel de consolidação (`ResumoDiaPanel.tsx`), o KPI de Contas (Manual) exibe **`R$ 0,00`** em destaque, mesmo com sub-rótulo indicando `Base Planilha: R$ 38.941,41` e `Subtotal Contas: R$ 41.842,65`.
   - Causa raiz: No frontend, a expressão `summary?.contas_manual ?? fallback` avalia `0 ?? fallback = 0` (o valor numérico zero não dispara fallback no operador `??`), enquanto no backend a leitura do snapshot fechado ou draft retornava `0` quando `contas_manual` no JSONB `metadata` era nulo.

3. **Saídas OFX Órfãs e Falta de Auditoria Visível:**
   - Débitos no extrato (ex: `SISPAG FORNECEDORES - R$ 11.850,00` com `CONTA: FORNECEDOR NÃO CADASTRADO`) criam pendência na filial. Ao justificar ou parear a saída com uma despesa, a divergência deve ser abatida e a despesa integrada ao contas da loja.

4. **Necessidade de Diagnóstico Imediato nos Cards das Lojas (Split Entradas x Saídas):**
   - O card atual por filial mistura todas as métricas em uma única linha, dificultando identificar se uma divergência provém de **Entradas (Vendas de Cartão/PIX vs Crédito no OFX)** ou de **Saídas (Pagamentos de Contas/Boletos vs Débito no OFX)**.
   - O usuário requisitou manter o **mesmo tamanho do card**, dividindo a área de dados em sub-blocos proporcionais e compactos (`font-mono` legível) com o split:
     * **Identidade & Pilares da Filial:** Nome, ID, Status (`ENTROU` / `NÃO ENTROU`), Saldo Consolidado, Rede Total, Carros em Pátio (OS).
     * **Sub-bloco 1 (Entradas x Previsto):** Entradas Realizadas (PIX + Rede + Dinheiro) x Previsto Vendas $\to$ Diferença de Entradas.
     * **Sub-bloco 2 (Saídas x Contas):** Saídas do OFX x Contas a Pagar da Loja $\to$ Diferença de Saídas.

---

## Solução Proposta (Foco em Reuso e Correção)

### 1. Backend & RPCs (Reuso de `get_daily_reconciliation_summary` e `daily_revenue_adjustments`)
- **[MODIFY] Migration SQL (`supabase/migrations/20260901000010_fix_revenue_adjustments_contas_and_store_split.sql`):**
  - **Faturamento Ajustes:** Atualizar a query de `daily_revenue_adjustments` para aceitar universalmente todos os tipos positivos:
    ```sql
    SELECT 
        COALESCE(SUM(CASE 
            WHEN type IN ('addition', 'venda_avulsa', 'aporte', 'sucata', 'outros', 'outros_receita') THEN amount 
            WHEN type IN ('deduction', 'estorno') THEN -amount 
            ELSE amount 
        END), 0)
    INTO v_faturamento_ajustes
    FROM daily_revenue_adjustments
    WHERE date = v_target_date;
    ```
  - **Contas a Pagar Robusto:** No Ramal 1 (Snapshot) e Ramal 2 (Draft), garantir que `v_contas_manual` faça fallback para `COALESCE(NULLIF(v_contas_manual, 0), v_contas_base + v_contas_extras, v_snapshot.contas_a_pagar, 0)`.
  - **Split de Métricas por Filial:** Enriquecer o array `stores` da RPC com:
    * `entradas_realizadas` (PIX creditado + Rede liquidada + Dinheiro cofre)
    * `entradas_previsto` (Vendas totais da loja)
    * `diferenca_entradas` (Pendências de entradas não conciliadas)
    * `saidas_ofx` (Débitos bancários da filial)
    * `contas_loja` (Contas a pagar mapeadas para a filial)
    * `diferenca_saidas` (Saídas sem conta correspondente)

### 2. Frontend & Hooks (Reuso de `StoreCardModulo1.tsx`, `useCategorizeOrphan.ts` e `ResumoDiaPanel.tsx`)
- **[MODIFY] `src/hooks/useCategorizeOrphan.ts`:**
  - Padronizar o campo `type: 'addition'` ao salvar justificativas com `impactsRevenue: true` em `daily_revenue_adjustments`.
  - Ao categorizar saídas com opção de conta, permitir vincular a `daily_manual_bills`.
- **[MODIFY] `src/hooks/useBackendConciliacao.ts`:**
  - Estender a interface `StoreReconciliationSummary` e `StoreCardData` com os campos do split de Entradas e Saídas.
- **[MODIFY] `src/components/conciliacao/ResumoDiaPanel.tsx`:**
  - Corrigir a leitura de `contasManualValor`:
    ```tsx
    const contasManualValor = isEditing 
      ? (contasInput + (summary?.contas_extras || 0)) 
      : ((summary?.contas_manual && summary.contas_manual > 0) 
          ? summary.contas_manual 
          : ((summary?.contas_base ?? currentSnapshot?.contas_a_pagar ?? 0) + (summary?.contas_extras || 0)));
    ```
- **[MODIFY] `src/components/conciliacao/StoreCardModulo1.tsx`:**
  - Redesenhar o interior do card preservando rigorosamente as dimensões externas e tokens Zinc-950:
    - **Lado Esquerdo:** Identidade, Badge de Status, Saldo Total, Rede Líquido (`ENTROU` / `NÃO ENTROU`) e Carros em Pátio (OS).
    - **Lado Direito (Split 2 Linhas):**
      * **Linha Superior (Entradas):** `[PIX + Rede + Dinheiro]` vs `[Previsto OFX]` $\to$ `[Dif. Entradas]`.
      * **Linha Inferior (Saídas):** `[Saídas OFX]` vs `[Contas da Loja]` $\to$ `[Dif. Saídas]`.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Encontradas:**
  - `get_daily_reconciliation_summary`: Já agrega lojas e snapshots, será atualizada via `CREATE OR REPLACE FUNCTION` com a soma correta de `daily_revenue_adjustments` e o split de saídas/entradas por loja.
  - `daily_revenue_adjustments`: Já armazena os ajustes de receita por transação, será reutilizada sem alteração de schema.
  - `daily_manual_bills`: Já armazena as contas a pagar granulares por loja.
- **Componentes / Hooks Existentes Encontrados:**
  - `StoreCardModulo1.tsx`: Estrutura de card consolidado com hover e links; será refinado internamente.
  - `ResumoDiaPanel.tsx`: Componente de cockpit macro; corrigida a regra de coalescência de contas a pagar.
  - `useCategorizeOrphan.ts`: Hook de justificativa de órfãos; ajustado o tipo de payload para compatibilidade total com a RPC.

---

## Contratos de Dados & SQL (Supabase)

```sql
-- Migration: 20260901000010_fix_revenue_adjustments_contas_and_store_split.sql

-- 1. Compatibilidade universal de tipos em daily_revenue_adjustments
SELECT 
    COALESCE(SUM(CASE 
        WHEN type IN ('addition', 'venda_avulsa', 'aporte', 'sucata', 'outros', 'outros_receita') THEN amount 
        WHEN type IN ('deduction', 'estorno') THEN -amount 
        ELSE amount 
    END), 0)
INTO v_faturamento_ajustes
FROM daily_revenue_adjustments
WHERE date = v_target_date;

-- 2. Correção de Contas Manual no Snapshot e Draft
v_contas_manual := COALESCE(
    NULLIF((v_snapshot.metadata->>'contas_manual')::numeric, 0),
    NULLIF(v_contas_base + v_contas_extras, 0),
    v_snapshot.contas_a_pagar,
    0
);
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
  // Novos campos do split
  entradasRealizadas?: number | null;
  entradasPrevisto?: number | null;
  diferencaEntradas?: number | null;
  saidasOfx?: number | null;
  contasLoja?: number | null;
  diferencaSaidas?: number | null;
  statusCompensacao: 'entrou' | 'parcial' | 'nao_entrou' | 'a_compensar' | 'sem_movimento';
  naoEntrouValor: number | null;
  status: 'approved' | 'divergence' | 'conciliado' | 'pending';
  isMissingData: boolean;
}
```

---

## Risco Principal e Mitigação

- **Risco 1:** Alterar a fórmula de `daily_revenue_adjustments` impactar retroativamente dias fechados.
  - *Mitigação:* Snapshots fechados com `is_closed = true` utilizam leitura imutável do JSONB `metadata` (Ramal 1), sem recálculo dinâmico.
- **Risco 2:** Quebra de densidade visual nos cards de lojas em telas menores.
  - *Mitigação:* Utilizar `text-xs` / `text-[11px]`, `font-mono` nítida e layout flex/grid balanceado em 2 linhas horizontais dentro do mesmo container `p-4 sm:p-5 rounded-2xl`.
