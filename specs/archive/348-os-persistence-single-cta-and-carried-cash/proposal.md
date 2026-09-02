# Proposal: Persistência Atômica de OSs OCR, Botão Único no Step 3 e Herança de Dinheiro MP (348)

## 1. Problema

1. **Risco de Perda de Dados na Ingestão OCR (Step 1.5)**:
   - Quando o operador cola os prints no Step 1.5 e clica em "Salvar e Avançar Fluxo", as OSs eram mantidas apenas na memória (`results.osFiles`). A gravação no banco (`patio_os`, `receivables`, `store_cash_vault`) ficava postergada para o final do processo.
   - Se ocorresse qualquer erro nos passos subsequentes (Step 4, 5, 6, 7), timeout ou se a página sofresse refresh (F5), todo o trabalho de captura dos prints de OSs era perdido, obrigando o operador a colar tudo novamente.

2. **Layout Quebrado e Ambiguidade de Botões de Ação no Step 3**:
   - No rodapé do Step 3 (Preview Consolidado & Inputs Manuais), existiam **dois botões concorrentes** (`Gravar Direto (sem Wizard)` e `Processar e Conciliar com IA →`).
   - Isso gerava confusão operacional ("qual botão devo clicar?"), quebrava a esteira sequencial do Wizard e poluía o layout.
   - Os cards de inputs manuais apresentavam pequenas variações de alinhamento e alturas de cabeçalho.

3. **Falta de Herança Automática do Dinheiro MP (Cofre Central)**:
   - O campo "Dinheiro MP" iniciava zerado (`0,00`) em dias virgens, forçando o operador a procurar e redigitar manualmente o saldo de dinheiro físico que sobrou do fechamento do dia anterior.

---

## 2. Solução Proposta (Foco em Reuso e Correção)

1. **Persistência Imediata e Idempotente no Step 1.5 (`handleSaveAndAdvanceOcr`)**:
   - Ao clicar em "Salvar e Avançar Fluxo", o sistema executa a conversão via `convertOcrToOsImportResults` e **persiste imediatamente no banco de dados** (`patio_os`, `receivables` e `store_cash_vault`) através da função existente `savePatioOsAndReceivables` / RPC `batch_upsert_patio_os`.
   - Dispara o auto-pareamento bancário em background com `auto_match_daily_transactions`.
   - Assim, se houver qualquer erro posterior ou a página for recarregada, as OSs e parcelas já estão salvas e consolidadas no PostgreSQL.

2. **Unificação do Botão de Avanço no Step 3**:
   - Remover completamente o botão `Gravar Direto (sem Wizard)`.
   - Criar **UM ÚNICO botão de ação primário, proeminente e claro**:
     **`Processar e Avançar Conciliação →`** (que aciona `handleConfirm(true)` e avança deterministicamente para o Step 4: Vínculo de Pagamentos sem OS).
   - Polir os 4 cards de inputs manuais (`Odômetro OI`, `Dinheiro MP`, `A Receber` e `Contas a Pagar`) em padrão Dark Zinc-950, alinhados com `min-h-[22px]` e badges informativos.

3. **Herança Automática do Dinheiro MP do Dia Anterior**:
   - Conectar o estado `manualDinheiroMp` ao `previousSnapshot.dinheiro_mp` (fornecido pelo hook `usePreviousDaySnapshot`).
   - Em dias virgens, o valor de Dinheiro MP vem automaticamente preenchido com o saldo do dia anterior e exibe a badge `Saldo de ontem: R$ X.XXX,XX`.
   - Se o operador destravar e editar o valor, a edição manual é preservada com flag de proteção (`isDinheiroMpUserEdited`).

---

## 3. Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Backend & Migrations Existentes**:
  - `savePatioOsAndReceivables` em `src/hooks/useImportProcessor.ts`: Já implementa o merge defensivo de `paid_value` e gravação em `patio_os`, `receivables` e `store_cash_vault`.
  - RPC `batch_upsert_patio_os` em `supabase/migrations/20260902000020_create_batch_upsert_patio_os.sql`: Já possui a lógica de merge de OSs em PL/pgSQL.
  - RPC `auto_match_daily_transactions`: Já realiza o pareamento automático entre extratos bancários e OSs.
- **Frontend & Hooks Existentes**:
  - `usePreviousDaySnapshot` em `src/hooks/useDailySnapshot.ts`: Já recupera o snapshot homologado do dia anterior (`.lt('date', targetDate).order('date', { ascending: false }).limit(1)`).
  - `CentralImportWizard.tsx`: Componente central que orquestra a máquina de estados.

---

## 4. Contratos de Dados & SQL

### Tabela `patio_os` (Idempotência por Chave Composta)
- Chave: `(store_id, os_number)`.
- Merge defensivo: $\text{paid\_value}_{\text{final}} = \max(\text{paid\_value}_{\text{antigo}}, \text{paid\_value}_{\text{ocr}})$.
- Atualização em `history_log` para auditoria pericial.

### Tabela `daily_snapshots`
- Coluna `dinheiro_mp numeric NOT NULL DEFAULT 0`.
- Consumo na RPC `get_daily_reconciliation_summary` para cálculo do Pilar 2 (Dinheiro MP / Cofre) e Caixa Atual.

---

## 5. API & Componentes (Frontend)

### `src/components/importacoes/CentralImportWizard.tsx` `[MODIFY]`
1. **No Step 1.5 (`handleSaveAndAdvanceOcr`)**:
   - Chamar `savePatioOsAndReceivables` para cada filial presente em `convertedOsFiles` antes de avançar.
   - Atualizar `results.osFiles` em memória e mappings de lojas.
   - Disparar `toast.success` informando que as OSs foram salvas no banco.
2. **No Step 3 (Valores Manuais do Dia & Rodapé)**:
   - Inicializar `manualDinheiroMp` a partir de `previousSnapshot.dinheiro_mp` com badge indicativa `Saldo de ontem: R$ ...`.
   - Remover botão "Gravar Direto (sem Wizard)".
   - Manter um único botão CTA: `Processar e Avançar Conciliação →`.

---

## 6. Risco Principal e Mitigação

| Risco | Causa Raiz | Mitigação |
| :--- | :--- | :--- |
| **Duplicação de Faturamento do Dia** | Se a OS for gravada no Step 1.5 e regravada no Step 8, `delta_paid` poderia ser recalculado incorretamente como zero. | O `convertOcrToOsImportResults` já define `delta_paid: paidVal` no objeto `ParsedOS`, preservando o faturamento do dia de forma imutável durante toda a esteira do Wizard. |
| **Sobrescrita do Dinheiro MP digitado manualmente** | Resolução assíncrona de `previousSnapshot` sobrescrever valor digitado pelo usuário. | Controle com flag `isDinheiroMpUserEdited` ou verificação `manualDinheiroMp === 0` na inicialização. |
