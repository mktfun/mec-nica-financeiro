# Proposal: Blindagem do Salvamento de Contas a Pagar (Constraint Violations) e Refatoração do Terminal de Logs (349)

## 1. Problema

1. **Erro de Violação de Constraint no Contas a Pagar (`daily_manual_bills_amount_check`)**:
   - Durante a importação de planilhas de Contas a Pagar (`BuscaContasAPagar.xls`), linhas com valor zero (`amount <= 0`) — como títulos cancelados, estornos ou linhas com código de referência mas sem valor pago — não eram devidamente ignoradas pelo parser (`contasPagarParser.ts:170: if (amount <= 0 && !codRaw) continue;`).
   - Como a tabela `daily_manual_bills` possui a restrição `CHECK (amount > 0)`, ao tentar inserir o lote no Supabase via `useContasAPagarImport.ts`, o PostgreSQL disparava o erro fatal `violates check constraint "daily_manual_bills_amount_check"`, abortando a gravação de todas as contas do chunk.

2. **Terminal de Logs Quebrado e Experiência de Erro Degradada**:
   - **Mojibake UTF-8**: Múltiplas mensagens de log no `CentralImportWizard.tsx` continham caracteres corrompidos (`ðŸ ¦`, `âš™ï¸ `, `âœ…`, `ðŸ”—`, `âš ï¸ `).
   - **Layout Quebrado e Texto Ilegível**: Quando ocorria um erro no Supabase, a mensagem crua de erro estourava a largura do container sem quebras de linha (`break-words`), sem formatação de JSON/Stack Trace e sem detalhes do código de erro PostgreSQL.
   - **Glitches de Auto-Scroll**: O uso de `scrollIntoView` fazia a página inteira dar saltos verticais indesejados a cada nova mensagem de log.
   - **Perda de Contexto no Botão de Retentativa**: Ao clicar no botão de retry no painel final, a função `handleConfirm()` era chamada sem o parâmetro `advanceToWizard = true`, impedindo o avanço normal para os passos seguintes.

---

## 2. Solução Proposta (Foco em Reuso e Correção)

1. **Blindagem Defensiva no Parser e Salvamento de Contas a Pagar**:
   - No `src/lib/parsers/contasPagarParser.ts`: Ignorar estritamente qualquer linha com `amount <= 0` (`if (amount <= 0) continue;`).
   - No `src/hooks/useContasAPagarImport.ts`:
     * Sanitizar `store_id`: garantir que seja um `id` de filial válido em `stores` ou `null` (quando `'master'` ou não mapeado), prevenindo violação de Foreign Key (`daily_manual_bills_store_id_fkey`).
     * Sanitizar `intercompany_entity_id`: validar formato UUID ou atribuir `null`, prevenindo violação de Foreign Key (`daily_manual_bills_intercompany_entity_id_fkey`).
     * Sanitizar `title`: se `recipient_name` e `description` forem vazios, preencher com `'Conta a Pagar'`.
     * Deduplicação defensiva em memória antes de montar os chunks de inserção.
     * Sanitizar `date` e `due_date`.

2. **Criação do Terminal de Logs Profissional (`ImportExecutionTerminal.tsx`)**:
   - Componente Dark Zinc-950 com visual Linux/macOS, dots superiores, badges de origem (`[OFX]`, `[REDE]`, `[PÁTIO]`, `[CONTAS]`, `[DATABASE]`, `[AI]`), filtros rápidos por severidade (Todos, Erros, Avisos, Sucesso), botão de copiar logs de 1-clique e auto-scroll interno no container (sem pular a página).

3. **Criação do Banner de Erro Estruturado (`ExecutionErrorBanner.tsx`)**:
   - Card de erro moderno com bordas em `rose-500/30`, tradução amigável dos códigos de erro comuns do Supabase/PostgreSQL (ex: Check Constraint `amount > 0`, Chave Duplicada `23505`, Foreign Key `23503`), visualizador colapsável de payload técnico e botão de retry que preserva o fluxo do Wizard (`handleConfirm(true)`).

4. **Saneamento de UTF-8 / Mojibake em `CentralImportWizard.tsx`**:
   - Corrigir todas as strings de logs para caracteres UTF-8 puros com emojis limpos.

---

## 3. Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Backend & Schemas Existentes**:
  - Tabela `daily_manual_bills`: Possui `amount NUMERIC NOT NULL CHECK (amount > 0)`.
  - Foreign keys: `daily_manual_bills_store_id_fkey` -> `stores(id)` e `daily_manual_bills_intercompany_entity_id_fkey` -> `intercompany_entities(id)`.
  - `useContasAPagarImport.ts`: Já realiza a deleção preventiva de despesas do dia com `external_code` e a inserção em chunks de 100.
- **Frontend & Componentes Existentes**:
  - `CentralImportWizard.tsx`: Componente central com os estados `importLogs`, `importStages` e `handleConfirm`.
  - `Step4FinalAuditAndClose.tsx`: Step 7 de auditoria final que consome os dados conciliados.

---

## 4. Contratos de Dados & SQL

### Tabela `daily_manual_bills`
```sql
-- Schema existente preservado com validação defensiva no client
CREATE TABLE IF NOT EXISTS public.daily_manual_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    store_id TEXT REFERENCES stores(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'outros',
    amount NUMERIC NOT NULL CHECK (amount > 0),
    external_code TEXT,
    installment TEXT,
    due_date DATE,
    payment_date DATE,
    recipient_name TEXT,
    is_intercompany BOOLEAN DEFAULT false,
    intercompany_entity_id UUID REFERENCES public.intercompany_entities(id) ON DELETE SET NULL,
    matched_os_number TEXT,
    contabilizar_no_subtotal BOOLEAN DEFAULT true NOT NULL,
    matched_ofx_id UUID REFERENCES public.ofx_transactions(id) ON DELETE SET NULL,
    match_status TEXT DEFAULT 'unmatched',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. API & Componentes (Frontend)

### `[NEW] src/components/importacoes/ImportExecutionTerminal.tsx`
- Componente de terminal com scroll interno, tags de filtro, cópia de logs e expansão de payloads.

### `[NEW] src/components/importacoes/ExecutionErrorBanner.tsx`
- Card de erro com diagnóstico amigável de erro Supabase, código de erro e botão de retry.

### `[MODIFY] src/lib/parsers/contasPagarParser.ts`
- Filtro estrito `if (amount <= 0) continue;`.

### `[MODIFY] src/hooks/useContasAPagarImport.ts`
- Sanitização de Foreign Keys e campos obrigatórios antes do `supabase.from('daily_manual_bills').insert(chunk)`.

### `[MODIFY] src/components/importacoes/CentralImportWizard.tsx`
- Integração do `ImportExecutionTerminal` e `ExecutionErrorBanner`.
- Correção de UTF-8 Mojibake em todos os `addLog`.
- Correção do botão "Tentar Novamente" (`handleConfirm(true)`).

---

## 6. Risco Principal e Mitigação

| Risco | Causa Raiz | Mitigação |
| :--- | :--- | :--- |
| **Linhas com valor zero abortarem lote inteiro** | Check constraint `amount > 0` rejeitar o chunk de 100 itens. | Descarte prévio no parser e sanitização defensiva em `useContasAPagarImport.ts` garantindo `amount > 0` em 100% dos itens enviados. |
| **Perda de logs ou truncamento em erros longos** | Texto cru sem quebra de linha. | `ImportExecutionTerminal` com `break-words`, `whitespace-pre-wrap` e visualizador de JSON/Stack Trace colapsável. |
