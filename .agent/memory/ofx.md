# 🧠 Memória Modular: Importação & Processamento de Planilhas (OFX, XLSX, CSV)

## [2026-07-28] — Feature ID: fix-import-fk-and-log-ui

**Contexto:** Correção de violação de chave estrangeira (`conciliation_matches_ofx_transaction_id_fkey`) durante a reimportação/gravação de lotes e redesign do painel de progresso da importação (`Step 4` em `CentralImportWizard.tsx`).

**Regra aprendida:**
- **FK ON DELETE SET NULL Obrigatório:** As Foreign Keys `ofx_transaction_id` e `rede_transaction_id` na tabela `public.conciliation_matches` DEVEM possuir a cláusula `ON DELETE SET NULL`. Isso garante que quando uma transação de extrato ou adquirente for atualizada, substituída ou excluída no reprocessamento de lotes, o PostgreSQL desvincule a chave sem abortar com erro `violates foreign key constraint`.
- **Ordem de Deleção de Lotes:** Na RPC `delete_import_batch` e nos fallbacks em JS (`useImportProcessor.ts`), SEMPRE deletar registros de `public.conciliation_matches` ANTES de deletar registros de `public.transactions`, `patio_os` e `receivables`.
- **Design do Painel de Progresso (Sem Visual Terminal/CMD):** O Step 4 da Central de Importação NÃO DEVE usar caixas pretas monospaçadas (`font-mono`, `bg-black`, `[hh:mm:ss]`). Deve utilizar um Painel Executivo com barra de progresso animada (0% - 100%), 4 cards de etapas (`Pátio OS`, `Maquininha Rede`, `Extrato OFX`, `Conciliação`) com status badges (`Pendente`, `Processando...`, `Concluído ✓`, `Erro`) e card de falha amigável com suporte a re-tentativa.

**Risco identificado:** Tentar apagar ou sobrescrever transações de extrato/adquirente sem `ON DELETE SET NULL` na FK de `conciliation_matches` causa travamento total do fluxo de confirmação de lote.

**Não fazer:** Nunca reintroduzir caixas de texto com fontes monospaçadas ou ícones de terminal retrô em fluxos de importação executivos.
