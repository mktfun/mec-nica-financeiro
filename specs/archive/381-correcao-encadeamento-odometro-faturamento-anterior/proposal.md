# SDD Proposal: 381-correcao-encadeamento-odometro-faturamento-anterior

## 1. Problema Identificado

Ao realizar a importação diária na **Central de Importação Inteligente (Wizard)**, o cálculo do faturamento do dia fica incorreto (com valores muito inflados ou distorcidos).

O usuário descreveu com precisão a causa:
> *"ele n ta usando o faturamento atual anterior (sem ser o calculado ja), n ta usando no caso o total de faturamento da ultima conciliação, praticamente o msm input que eu coloco no fluxo ao importar os bglh saca?"*

### Diagnóstico Forense da Causa Raiz
Na operação financeira da rede de oficinas:
1. **O que o usuário insere no fluxo de importação:**
   - O campo **"Odômetro OI (Acumulado)"** (via Mapa de Metas PDF ou digitação manual) representa o total acumulado de faturamento no mês até aquela data (ex: R$ 235.023,20 em 09/09 e R$ 281.317,68 em 10/09).
   - O **Faturamento Líquido do Dia** é a diferença entre dois odômetros acumulados:
     $$\text{Faturamento do Dia} = \text{Odômetro Hoje} - \text{Odômetro Fechamento Anterior}$$
     Exemplo real em 10/09:
     $$281.317,68 - 235.023,20 = \mathbf{46.294,48}$$

2. **O Bug da Inversão de Precedência no Wizard (`CentralImportWizard.tsx`):**
   - Na linha 1730 e 1897:
     ```ts
     const fatAnt = Number(prevSnap?.faturamento || (prevSnap?.metadata as any)?.odometro_hoje || 0);
     ```
   - O operador `||` avalia `prevSnap?.faturamento` primeiro. Se esse campo contiver o faturamento diário calculado do dia anterior (ex: R$ 64.930,73), o código para no primeiro operando truthy e ignora `(prevSnap?.metadata as any)?.odometro_hoje` (que guardava R$ 235.023,20)!
   - Consequência:
     $$\text{fatOiBase} = 281.317,68 - 64.930,73 = \mathbf{216.386,95} \quad (\text{EXPLOSÃO ANÔMALA DE FATURAMENTO!})$$

3. **O Bug na RPC `close_daily_snapshot`:**
   - Na linha 506 de `20260901000002_fix_daily_reconciliation_stores_and_snapshot_guard.sql`:
     ```sql
     faturamento = (v_summary->>'faturamento_periodo')::numeric
     ```
   - Ao homologar o fechamento do dia, a RPC grava `faturamento_periodo` (o faturamento líquido diário!) na coluna `daily_snapshots.faturamento`. Isso corrompe a coluna para o dia seguinte, transformando-a em faturamento diário em vez do odômetro acumulado.

4. **O Bug na RPC `get_daily_reconciliation_summary`:**
   - Na linha 1044 de `20260908000036_fix_store_canonical_matching_and_anti_hijack.sql`:
     ```sql
     v_faturamento_anterior := COALESCE(v_prev_snapshot.faturamento, 0);
     ```
   - Lê cegamente `v_prev_snapshot.faturamento` sem verificar `metadata->>'odometro_hoje'`. Se `faturamento` tiver o valor diário, a RPC calcula um faturamento diário absurdo para o novo dia.

---

## 2. Solução Proposta

Implementar a **Regra Canônica de Precedência do Odômetro** de forma unificada no Backend (RPCs) e no Frontend (Wizard e Telas de Conciliação), acompanhada de saneamento seguro dos registros históricos em `daily_snapshots`.

### Pilares da Correção:

1. **Precedência Canônica Universal:**
   Toda leitura de faturamento/odômetro anterior deve seguir estritamente:
   ```ts
   // Frontend
   const fatAnt = Number(
     (prevSnap?.metadata as any)?.odometro_hoje ??
     (prevSnap?.metadata as any)?.faturamento_anterior ??
     prevSnap?.faturamento ??
     0
   );
   ```
   ```sql
   -- Backend (RPCs)
   v_faturamento_anterior := COALESCE(
       (v_prev_snapshot.metadata->>'odometro_hoje')::numeric,
       (v_prev_snapshot.metadata->>'faturamento_anterior')::numeric,
       v_prev_snapshot.faturamento,
       0
   );
   ```

2. **Preservação do Odômetro Acumulado no `close_daily_snapshot` e no Wizard:**
   - A coluna `daily_snapshots.faturamento` deve armazenar o **Odômetro Acumulado Oficial** (`odometro_hoje`), garantindo que tanto a coluna quanto o metadata sejam consistentes.
   - `metadata.odometro_hoje`: Odômetro acumulado hoje (ex: 281.317,68).
   - `metadata.faturamento_anterior`: Odômetro acumulado da conciliação anterior (ex: 235.023,20).
   - `metadata.faturamento_oi_base`: Delta líquido do dia (ex: 46.294,48).
   - `metadata.faturamento_periodo`: Faturamento do dia com ajustes (ex: 46.294,48).

3. **Correção do Encadeamento no `CentralImportWizard.tsx`:**
   - Unificar a extração do faturamento anterior no pipeline do Wizard utilizando diretamente `previousOdometro` (já computado no início do componente).
   - Garantir que tanto no auto-save (linhas 1730/1774) quanto na homologação final (linhas 1897 e 2010), os metadados do odômetro sejam preservados.

4. **Saneamento Seguro do Histórico:**
   - Script de saneamento em migração SQL para ajustar `daily_snapshots.faturamento` e `metadata` dos dias de setembro de 2026 onde `faturamento` foi gravado como o valor diário isolado em vez do odômetro acumulado.

---

## 3. Contratos de Dados Afetados

- **Tabela `daily_snapshots`**:
  - `faturamento`: Odômetro acumulado oficial do mês.
  - `metadata->'odometro_hoje'`: Odômetro acumulado do dia atual.
  - `metadata->'faturamento_anterior'`: Odômetro acumulado do dia de fechamento anterior.
  - `metadata->'faturamento_oi_base'`: Delta do dia = `odometro_hoje - faturamento_anterior`.
  - `metadata->'faturamento_periodo'`: Faturamento diário consolidado com receitas extras.

- **RPC `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean)`**:
  - Retorna `odometro_hoje`, `faturamento_anterior`, `faturamento_oi_base` e `faturamento_periodo` calculados com a precedência correta.

- **RPC `close_daily_snapshot(p_date text, p_notes text, p_metadata jsonb)`**:
  - Atualizada para respeitar `odometro_hoje` passado em `p_metadata` ou derivado do summary, gravando `faturamento = odometro_hoje`.

---

## 4. Risco Principal e Mitigação

- **Risco:** Alguma tela ou relatório depender do campo `daily_snapshots.faturamento` interpretando-o como faturamento líquido diário em vez de acumulado.
- **Mitigação:** Os hooks principais (`useExecutiveDashboard`, `useDailyReconciliationSummary`, `ResumoDiaPanel`, `FaturamentoDetalhesModal`) já operam com `odometro_hoje` e `faturamento_oi_base` extraídos do metadata. A padronização da precedência elimina qualquer ambiguidade.
