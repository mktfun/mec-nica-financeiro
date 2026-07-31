# Proposal: Correção de FK na Importação e Redesign do Painel de Progresso (fix-import-fk-and-log-ui)

## Problema
1. **Erro de Chave Estrangeira ao Importar/Confirmar:**
   - Ao confirmar ou reprocessar um lote de importação, o sistema exibe:
     `❌ Erro ao confirmar importação: update or delete on table "transactions" violates foreign key constraint "conciliation_matches_ofx_transaction_id_fkey" on table "conciliation_matches"`.
   - **Causa Raiz:** As chaves estrangeiras `ofx_transaction_id` e `rede_transaction_id` na tabela `conciliation_matches` foram criadas no PostgreSQL sem a cláusula `ON DELETE SET NULL`. Quando transações antigas são apagadas ou substituídas durante a reimportação/limpeza, o banco rejeita a operação. Além disso, a RPC `delete_import_batch` não limpa os matches associados antes de deletar as transações.

2. **Design Inadequado do Log de Importação (Visual CMD):**
   - O Step 4 da Central de Importação (`CentralImportWizard.tsx`) foi construído parecendo um console de terminal CMD retrô (`bg-[#0a0d1a]`, `font-mono`, `[hh:mm:ss]`).
   - O usuário solicitou refatoração completa para seguir rigorosamente o sistema de design executivo da plataforma (Dark UI sólido Zinc-950, fontes Inter/Outfit, barra de progresso animada e cards limpos com ícones e status).

## Solução Proposta

### 1. Correção de Banco de Dados & Delecão (Backend/Supabase):
- **Constraint Foreign Key com `ON DELETE SET NULL`:**
  Atualizar as FKs em `public.conciliation_matches`:
  - `ofx_transaction_id` -> `REFERENCES public.transactions(id) ON DELETE SET NULL`
  - `rede_transaction_id` -> `REFERENCES public.transactions(id) ON DELETE SET NULL`
- **RPC `delete_import_batch` & Fallback JS:**
  - Atualizar a função SQL `delete_import_batch` para executar a limpeza de `conciliation_matches` **ANTES** de deletar `transactions` e `reconciliations`.
  - Garantir a mesma ordem no fallback em `useImportProcessor.ts`.

### 2. Redesign do Painel de Progresso da Importação (Frontend/UI):
- **Eliminar Visual CMD Terminal:** Remover completamente `font-mono`, caixas pretas estilo prompt de comando e o ícone de terminal retrô.
- **Painel Executivo de Processamento (`Step 4` em `CentralImportWizard.tsx`):**
  - **Header de Progresso:** Barra de progresso animada com porcentagem de conclusão (0% a 100%).
  - **Cards de Etapas Limpos:** 4 cards visuais representando cada fase do processamento:
    1. *Ordens de Serviço (Pátio)* (ícone `FileText`, quantidade de OSs)
    2. *Relatórios de Maquininha (Rede)* (ícone `CreditCard`, transações)
    3. *Extrato Bancário (OFX)* (ícone `Landmark`, lançamentos)
    4. *Associação & Conciliação* (ícone `Sparkles`, pares identificados)
  - **Status Badges Visuais:** Badges com ícones e cores do sistema (`Pendente`, `Em Processamento`, `Concluído`, `Aviso`, `Erro`).
  - **Card de Erro Elegante:** Em caso de erro, exibir card de alerta em tom vermelho escuro (`bg-red-500/10 border-red-500/20`) com mensagem legível em português e botão de ação ("Tentar Novamente").

## Contratos de Dados
- Tabela `public.conciliation_matches`:
  - `ofx_transaction_id` (FK para `transactions.id`, `ON DELETE SET NULL`)
  - `rede_transaction_id` (FK para `transactions.id`, `ON DELETE SET NULL`)
- RPC `delete_import_batch`: Ordem de deleção `conciliation_matches` -> `transactions` -> `patio_os` -> `receivables` -> `reconciliations` -> `import_logs`.

## API / Interface
- `CentralImportWizard.tsx`: Refatoração do `Step 4` (Painel Executivo de Progresso & Gravação).
- `useImportProcessor.ts`: Ajuste na deleção e tratamento de exceções de FK.

## Features Existentes Impactadas
- `src/components/importacoes/CentralImportWizard.tsx`: Tela de importação centralizada.
- `src/hooks/useImportProcessor.ts`: Mutation de gravação e deleção de lotes.

## Risco Principal
Remoção de registros sem zerar matches relacionados.
*Mitigação:* A cláusula `ON DELETE SET NULL` desvincula a transação deletada em `conciliation_matches` sem estourar erro de FK e sem corromper a tabela.
