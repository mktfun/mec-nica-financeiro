# Proposal: Correção de Duplicação de Contas (Manual / Importação) e Blindagem de Edição (289)

## Problema

Na conciliação diária (ex: 26/08/2026), o card de **Contas (Manual)** exibiu um valor duplicado (**R$ 33.949,88** em vez de **R$ 16.974,94**), elevando o subtotal para **R$ 35.814,77** e distorcendo a Diferença Final.

### Causa Raiz Identificada:
1. **Dupla soma na RPC `get_daily_reconciliation_summary`:**
   - Ao importar a planilha `BuscaContasAPagar.xls`, o hook `useContasAPagarImport.ts` salva as 24 contas analíticas na tabela `daily_manual_bills` (com `external_code` preenchido, totalizando R$ 16.974,94) **E** atualiza `daily_snapshots.contas_a_pagar = 16.974,94`.
   - Na RPC PostgreSQL `get_daily_reconciliation_summary`, a lógica atual calcula:
     - `v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);` (R$ 16.974,94)
     - `v_contas_extras := SELECT SUM(amount) FROM daily_manual_bills WHERE date = v_target_date;` (sem filtrar por `external_code IS NULL`, somando novamente todas as 24 contas da planilha = R$ 16.974,94)
     - `v_contas_manual := v_contas_base + v_contas_extras;` (16.974,94 + 16.974,94 = **R$ 33.949,88 — O DOBRO!**)
   - A interface do `ResumoDiaPanel.tsx` exibiu `Base Planilha: R$ 16.974,94 + Extras: R$ 16.974,94`.

---

## Solução Proposta

Isolar estritamente a **Base da Planilha** dos **Extras Manuais Autênticos** no backend (RPC) e no frontend, garantindo que o valor importado nunca duplique e que a edição manual continue 100% funcional.

### 1. Separação Estrita na RPC `get_daily_reconciliation_summary` (PostgreSQL):
- **`v_contas_imported_bills`**: Soma das despesas originadas da planilha de Contas a Pagar:
  ```sql
  SELECT COALESCE(SUM(amount), 0)
  INTO v_contas_imported_bills
  FROM daily_manual_bills
  WHERE date = v_target_date AND external_code IS NOT NULL;
  ```
- **`v_contas_extras`**: Soma EXCLUSIVA de despesas manuais avulsas lançadas diretamente pelo usuário (sem `external_code` de ERP):
  ```sql
  SELECT COALESCE(SUM(amount), 0)
  INTO v_contas_extras
  FROM daily_manual_bills
  WHERE date = v_target_date AND external_code IS NULL;
  ```
- **`v_contas_base`**: Prioriza o valor da base (seja do snapshot ou da soma das contas importadas):
  ```sql
  IF v_snapshot.contas_a_pagar IS NOT NULL AND v_snapshot.contas_a_pagar > 0 THEN
      v_contas_base := v_snapshot.contas_a_pagar;
  ELSE
      v_contas_base := v_contas_imported_bills;
  END IF;
  ```
- **`v_contas_manual`**:
  ```sql
  v_contas_manual := v_contas_base + v_contas_extras;
  ```
- **Resultado para 26/08/2026:**
  - `contas_base`: R$ 16.974,94
  - `contas_extras`: R$ 0,00
  - `contas_manual`: R$ 16.974,94
  - `juros_rede`: R$ 1.864,89
  - `subtotal_contas`: R$ 18.839,83 (em vez de R$ 35.814,77!)

### 2. Blindagem de Edição Manual (`ResumoDiaPanel.tsx` e `ContasManualModal.tsx`):
- Ao clicar em "Editar Fechamento", o usuário edita a Base (`contasInput`). Ao salvar, `saveSnapshot` grava `contas_a_pagar` no snapshot. Os extras manuais (`external_code IS NULL`) continuam sendo somados dinamicamente.
- No `ContasManualModal.tsx`, qualquer despesa avulsa inserida pelo usuário continua sendo gravada com `external_code = NULL`, entrando automaticamente em `contas_extras`.
- No `CentralImportWizard.tsx` e `useContasAPagarImport.ts`, o fluxo de importação permanece idêntico e protegido (limpa apenas `WHERE external_code IS NOT NULL`, preservando lançamentos manuais).

---

## Contratos de Dados

### Tabelas Supabase Envolvidas:
- `public.daily_manual_bills` (coluna `external_code` já existente, usada como discriminador)
- `public.daily_snapshots` (coluna `contas_a_pagar` armazena a Base da Planilha / Override do Fechamento)

### Mutações de Estado:
- Nenhuma alteração estrutural no schema das tabelas.
- Apenas substituição da RPC canônica `get_daily_reconciliation_summary`.

---

## API / Interface

| Artefato | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260826000001_fix_contas_manual_deduplication.sql` | **[NEW]** | Atualizar RPC `get_daily_reconciliation_summary` com discriminação por `external_code` |
| `src/components/conciliacao/ResumoDiaPanel.tsx` | **[VERIFY/ADJUST]** | Garantir que exibição de Base e Extras use o retorno correto da RPC |
| `src/hooks/useContasAPagarImport.ts` | **[VERIFY]** | Garantir que limpeza e inserção mantenham `external_code` correto |

---

## Features Existentes Impactadas
- **Feature 283 (Congelamento Imutável de Snapshots e Isolamento de Contas)** — Respeitado integralmente.
- **Feature 256 (Importação de Contas e Entidades Intercompany)** — Mantido sem regressão.
- **Central Import Wizard (Passo 2 / Contas a Pagar)** — Importação continua funcionando sem alterações.
- **Painel de Conciliação Diária (ResumoDiaPanel)** — Cálculo passa a refletir R$ 18.839,83 para o dia 26/08.

---

## Risco Principal
**Risco:** Dias históricos fechados com snapshot imutável (`is_closed = true`) sofrerem alteração de valor.
**Mitigação:** O Ramal 1 da RPC (dias com `is_closed = true`) lê diretamente os valores congelados em `daily_snapshots` e `metadata`, permanecendo 100% imutável. A correção afeta estritamente o Ramal 2 (dias abertos/dinâmicos).
