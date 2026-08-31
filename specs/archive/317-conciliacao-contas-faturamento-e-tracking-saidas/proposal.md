# Proposal: Conciliação de Contas, Faturamento com Aportes e Tracking de Saídas (Contas x Débitos OFX) (317)

## Problema

1. **Aportes e Ajustes no Faturamento do Dia Não Contabilizados:**
   Quando o operador cadastra um aporte ou receita avulsa no extrato bancário (ex: R$ 5.000,00 de aporte ou outros faturamentos mapeados em `ofx_transactions` / `daily_revenue_adjustments`), o Card de "Faturamento do Dia" na tela de conciliação permanece estático exibindo apenas a base OI (R$ 55.420,95) ou o `faturamento_periodo` sem integrar os aportes da filial no cálculo dinâmico da RPC.

2. **Inconsistência Aritmética Visível no Card de Contas e Subtotal a Cobrir:**
   No card "Contas (Manual)", o valor principal exibido era de **R$ 46.394,05** com Juros Rede de **R$ 3.932,35**, mas a barra inferior exibia **R$ 55.326,40** (uma aparente soma impossível de $46.394 + 3.932 = 55.326$). Isso ocorria porque despesas manuais extras (ex: 2 retiradas totalizando R$ 5.000,00 em `daily_manual_bills`) eram somadas internamente no subtotal, mas o card principal renderizava o valor base desatualizado e em modo de edição sofria dupla adição de `contas_extras`.

3. **Falta de Traqueamento de Saídas (Contas a Pagar x Débitos do Extrato Bancário):**
   O sistema concilia com rigor as entradas e maquininhas, mas não fornecia um motor estruturado para bater as contas da planilha (`BuscaContasAPagar.xls` / `daily_manual_bills`) contra os débitos reais que saíram do banco (`ofx_transactions WHERE type='out'`). Além disso, contas ou saídas sem vínculo precisam de justificativa rápida e de um seletor transparente: **"Contabilizar no Fechamento"** (flag `contabilizar_no_subtotal BOOLEAN DEFAULT true`) para decidir se o item compõe ou não o subtotal de contas a cobrir do dia.

---

## Solução Proposta (Foco em Reuso e Correção)

1. **Unificação Canônica de Ajustes de Faturamento na RPC e Frontend [EXTEND / MODIFY]:**
   - Atualizar a RPC `get_daily_reconciliation_summary` para somar em `faturamento_ajustes`:
     - Tabela `daily_revenue_adjustments`
     - Entradas OFX com justificativas contábeis (`ofx_transactions WHERE manual_category IN ('aporte', 'outros_faturamento', 'sucata', 'faturamento_extra', 'aporte_socio')` ou `category ILIKE '%aporte%'`)
   - Atualizar `ResumoDiaPanel.tsx` e `FaturamentoDetalhesModal.tsx` para exibir no card do Faturamento do Dia:
     $$\text{Faturamento Total} = \text{Base OI } (55.420,95) + \text{Aportes/Ajustes } (5.000,00) = \mathbf{60.420,95}$$

2. **Equalização Contábil de Contas (Manual) & Subtotal a Cobrir [MODIFY]:**
   - Eliminar a dupla soma no fallback/edição de `ResumoDiaPanel.tsx`.
   - Exibir no Card de Contas (Manual) o valor total consolidado:
     $$\text{Contas Total} = \text{Base Planilha } (46.394,05) + \text{Retiradas/Extras } (5.000,00) = \mathbf{51.394,05}$$
   - Demonstrar com clareza nos sub-chips a composição: `Base: R$ 46.394,05`, `+ Extras: R$ 5.000,00` e `Juros Rede: R$ 3.932,35`, resultando exatamente no subtotal:
     $$\text{Subtotal Contas a Cobrir} = 51.394,05 + 3.932,35 = \mathbf{55.326,40}$$

3. **Módulo de Conciliação e Traqueamento de Saídas (Contas x Débitos OFX) [EXTEND]:**
   - Estender `ContasManualModal.tsx` adicionando a aba **"Batimento de Saídas (Contas x Débitos OFX)"**:
     - Grid comparativo de Débitos do Extrato (`ofx_transactions WHERE type='out'`) vs Contas a Pagar (`daily_manual_bills`).
     - Auto-match de saídas por valor e documento/favorecido.
     - Para contas/saídas não vinculadas: campo de justificativa rápida com toggle `[X] Contabilizar no Fechamento` (`contabilizar_no_subtotal: boolean`).
     - Se desmarcado, a conta/saída é mantida para auditoria bancária mas é excluída de `v_contas_manual` e do `subtotal_contas`.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Encontradas:**
  - Tabela `daily_manual_bills`: já possui colunas `external_code`, `category`, `store_id`. Será adicionada a coluna `contabilizar_no_subtotal BOOLEAN DEFAULT true` e `matched_ofx_id UUID REFERENCES ofx_transactions(id)`.
  - Tabela `ofx_transactions`: já possui `matched_bill_id UUID` e `manual_category`.
  - RPC `get_daily_reconciliation_summary`: será alterada para somar aportes de `ofx_transactions` em `faturamento_ajustes` e respeitar `contabilizar_no_subtotal = true` em `daily_manual_bills`.
- **Componentes / Hooks Existentes Encontrados:**
  - `ContasManualModal.tsx`: já gerencia inclusão/exclusão de contas. Será estendido com a visualização de Débitos OFX e toggle de contabilização.
  - `ResumoDiaPanel.tsx`: corrigida a matemática dos cards 5 (Faturamento), 6 (Contas) e 7 (Subtotal).
  - `useBackendConciliacao.ts`: já possui `useGlobalOfxOut`, que será integrado ao modal.

---

## Contratos de Dados & SQL (Supabase)

### Alterações de Schema:
```sql
ALTER TABLE public.daily_manual_bills 
ADD COLUMN IF NOT EXISTS contabilizar_no_subtotal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS matched_ofx_id UUID REFERENCES public.ofx_transactions(id) ON DELETE SET NULL;

ALTER TABLE public.ofx_transactions
ADD COLUMN IF NOT EXISTS matched_bill_id UUID REFERENCES public.daily_manual_bills(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contabilizar_no_subtotal BOOLEAN DEFAULT true;
```

### Regra na RPC `get_daily_reconciliation_summary`:
```sql
-- Faturamento Ajustes (Aportes em daily_revenue_adjustments + Aportes no OFX)
SELECT COALESCE(SUM(amount), 0)
INTO v_ofx_aportes
FROM ofx_transactions
WHERE target_date = v_target_date 
  AND type = 'in' 
  AND (manual_category IN ('aporte', 'outros_faturamento', 'sucata', 'faturamento_extra', 'aporte_socio') OR category ILIKE '%aporte%');

v_faturamento_ajustes := v_faturamento_ajustes + v_ofx_aportes;
v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

-- Contas a Pagar (Apenas com contabilizar_no_subtotal = true)
SELECT 
    COALESCE(SUM(CASE WHEN COALESCE(contabilizar_no_subtotal, true) THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN external_code IS NULL AND COALESCE(contabilizar_no_subtotal, true) THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN external_code IS NOT NULL AND COALESCE(contabilizar_no_subtotal, true) THEN amount ELSE 0 END), 0)
INTO v_total_bills, v_contas_extras, v_contas_imported_bills
FROM daily_manual_bills
WHERE date = v_target_date;
```

---

## API & Componentes (Frontend)

- **`src/components/conciliacao/ResumoDiaPanel.tsx` [MODIFY]:**
  - Card Faturamento do Dia: exibe `faturamento_periodo` ($60.420,95$) com sub-badges de `OI Base: R$ 55.420,95` e `+ Aportes: R$ 5.000,00`.
  - Card Contas (Manual): exibe `contas_manual` ($51.394,05$) com sub-badges de `Base Planilha: R$ 46.394,05` e `+ Extras: R$ 5.000,00`.
  - Subtotal a Cobrir: $51.394,05 + 3.932,35 = \mathbf{55.326,40}$.
- **`src/components/conciliacao/ContasManualModal.tsx` [EXTEND]:**
  - Nova aba "Batimento de Saídas (Contas x Débitos OFX)".
  - Toggle `Contabilizar no Fechamento` para cada conta extra/não vinculada.
  - Vínculo direto de 1 clique entre Débito OFX e Conta a Pagar.

---

## Risco Principal e Mitigação

- **Risco:** Um débito de transferência entre contas ser marcado como conta a pagar e inflar o subtotal.
- **Mitigação:** O toggle `Contabilizar no Fechamento` virá desmarcado por padrão para transferências internas identificadas e permitirá ao operador auditar sem alterar o DRE.
