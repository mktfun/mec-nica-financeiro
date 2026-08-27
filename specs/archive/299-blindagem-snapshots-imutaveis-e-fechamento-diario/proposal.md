# Proposal: Blindagem Definitiva de Snapshots Imutáveis, Persistência de Fechamento Diário e Consolidação Canônica do Dia 26/08 (299)

## Problema
1. **Snapshots Não Ficavam Gravados como Fechados (`is_closed: false`):**
   - Ao salvar o fechamento no `ResumoDiaPanel.tsx` ou no `CentralImportWizard.tsx`, o campo `is_closed: true` não era enviado e os metadados completos de fechamento não eram persistidos no `metadata` da tabela `daily_snapshots`.
   - Com `is_closed: false`, a RPC `get_daily_reconciliation_summary` tratava o dia como "aberto/draft" e executava recálculos dinâmicos em tempo real sobre tabelas mutáveis (`patio_os`, `reconciliations`, `ofx_transactions`).
2. **Contaminação Retroativa entre Dias ao Alterar OSs:**
   - Ao importar novas OSs ou editar OSs hoje (27/08), as queries dinâmicas recalculavam o pátio de OSs do dia 26/08, alterando retroativamente o saldo em loja (`na_loja_os`), o Caixa Atual e o Faturamento do dia 26/08.
   - Isso gerou efeito dominó que quebrou o `caixa_anterior` do dia 27/08 e a conciliação de hoje.
3. **Necessidade de Ajuste e Consolidação Imediata do Dia 26/08:**
   - O dia 26/08 precisa ser gravado e blindado como snapshot oficial fechado com os números exatos da conciliação:
     - **Saldo Bancos + Cofres + Cartões:** R$ 50.794,86 (Ativos R$ 66.388,38 + R$ 350 Cofre - R$ 15.943,52 Negativo)
     - **Dinheiro MP:** R$ 15.323,00
     - **A Receber:** R$ 8.349,67
     - **Na Loja (Pátio OS):** R$ 77.525,07
     - **Caixa Atual:** **R$ 151.642,60**
     - **Caixa Anterior (25/08):** **R$ 141.440,93**
     - **Fluxo de Caixa:** **+R$ 10.201,67**
     - **Faturamento do Período:** **R$ 29.046,09**
     - **Contas a Pagar:** **R$ 19.044,52**
     - **Diferença Final:** **-R$ 200,10**

## Solução Proposta
1. **Blindagem Backend e RPC de Fechamento Definitivo (`close_daily_reconciliation` / `daily_snapshots`):**
   - Garantir que a ação de gravação e fechamento persista compulsoriamente `is_closed: true`, `closed_at: now()`, e todos os pilares consolidados no `metadata`.
   - Na RPC `get_daily_reconciliation_summary`, quando `is_closed = true`, retornar imediatamente os dados imutáveis do snapshot, sem nunca consultar `patio_os` ou recálculos dinâmicos.
2. **Atualização do Frontend (`useDailySnapshot.ts` e `ResumoDiaPanel.tsx`):**
   - Atualizar a interface `DailySnapshotRow` com `is_closed` e `closed_at`.
   - No `handleSave` do `ResumoDiaPanel.tsx`, incluir `is_closed: true` e payload estruturado completo com todos os metadados.
   - Adicionar botão explícito e feedback visual de "Dia Fechado & Blindado" com cadeado.
3. **Consolidação e Blindagem Imediata do Dia 26/08:**
   - Script SQL consolidando e fechando o dia 26/08 com `is_closed = true` e Caixa Atual = R$ 151.642,60, garantindo que o dia 27/08 puxe R$ 151.642,60 como Caixa Anterior limpo.

## Contratos de Dados & Backend
- **Tabela:** `daily_snapshots`
- **RPCs:** `get_daily_reconciliation_summary`
- **Frontend:** `src/hooks/useDailySnapshot.ts`, `src/components/conciliacao/ResumoDiaPanel.tsx`

## Risco Principal
- **Risco:** Um dia fechado ser editado acidentalmente sem permissão de reabertura.
- **Mitigação:** Exigir confirmação ou ação explícita de "Reabrir Conciliação do Dia" se um usuário administrador precisar retificar um dia já fechado.
