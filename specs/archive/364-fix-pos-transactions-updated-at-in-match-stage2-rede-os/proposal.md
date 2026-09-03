# Proposal: Correção de `updated_at` em `pos_transactions` e na RPC `match_stage2_rede_os` (364)

## Problema
Ao processar os arquivos da Adquirente Rede na **Fase 2 do Fechamento Manual**, o PostgreSQL dispara o seguinte erro ao executar a RPC `match_stage2_rede_os`:
```json
{
  "code": "42703",
  "details": null,
  "hint": null,
  "message": "column \"updated_at\" of relation \"pos_transactions\" does not exist"
}
```
HTTP Status: `POST https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/rpc/match_stage2_rede_os 400 (Bad Request)`.

### Causa Raiz Forense
- Na migration `20260903000027_reconciliation_pipeline_sessions.sql` (linha 295), a RPC `match_stage2_rede_os` realiza um UPDATE quando encontra correspondência determinística de uma venda com uma OS:
  ```sql
  UPDATE public.pos_transactions
  SET matched_os_number = v_os.os_number,
      settlement_status = 'entrou',
      updated_at = now()
  WHERE id = v_pos.id;
  ```
- No entanto, a tabela `public.pos_transactions` (criada em `20260807000009_schema_cleanup_and_split.sql`) possui apenas `created_at TIMESTAMPTZ DEFAULT now()`, e nunca teve a coluna `updated_at` adicionada.
- Quando o primeiro match determinístico é executado, o PostgreSQL barra a transação com `42703 (undefined_column)`.

---

## Solução Proposta (Foco em Reuso e Correção)

Em estrita conformidade com os princípios de estabilidade e reuso do projeto:
1. **Migration SQL Canônica (`supabase/migrations/20260903000028_add_updated_at_to_pos_transactions.sql`) [NEW]:**
   - Adicionar idempotentemente a coluna `updated_at TIMESTAMPTZ DEFAULT now()` em `public.pos_transactions`.
   - Executar backfill para registros existentes com `updated_at IS NULL`.
   - Anexar o trigger `trg_pos_transactions_updated_at` para manter `updated_at` automaticamente sincronizado.
   - Recompilar a RPC `match_stage2_rede_os` para invalidar planos de execução cacheados no PostgreSQL.
2. **Aplicação Headless no Banco Remoto via Supabase CLI:**
   - Aplicar a migration via `npx supabase db push --linked`.
3. **Atualização de Tipagem TypeScript (`src/integrations/supabase/types.ts`) [MODIFY]:**
   - Refletir `updated_at` nas interfaces `Row`, `Insert` e `Update` de `pos_transactions`.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Encontradas:**
  - `pos_transactions`: Tabela física canônica de cartões.
  - `match_stage2_rede_os`: RPC de matching determinístico balcão x OS.
- **Justificativa para a Nova Migration:**
  - A coluna `updated_at` é uma dependência estrutural da RPC `match_stage2_rede_os`. A criação de uma migration versionada (`20260903000028`) é a forma oficial de manter a integridade do banco sem scripts manuais soltos.

---

## Contratos de Dados & SQL (Supabase)

### DDL da Coluna e Trigger
```sql
ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.pos_transactions
SET updated_at = COALESCE(updated_at, occurred_at, created_at, now())
WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pos_transactions_updated_at ON public.pos_transactions;
CREATE TRIGGER trg_pos_transactions_updated_at
BEFORE UPDATE ON public.pos_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Risco Principal e Mitigação

- **Risco Principal:** Falha de compatibilidade ou bloqueio de tabela (lock) durante `ALTER TABLE`.
- **Mitigação:** O comando usa `ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();`, que no PostgreSQL 11+ é uma operação de metadados instantânea ($O(1)$) sem reescrever a tabela física.
