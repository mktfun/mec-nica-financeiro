# 📋 SDD Proposal: Spec 437 — Resolução de Pendências de Vendas em Cartão Rede Sem OS (Vínculo & Baixa Justificada)

## 1. Problema Diagnosticado
Na tela de detalhes de conciliação por filial (`/conciliacao/:lojaId`), na aba **"1. Cartão / Maquininha"** (`StoreCartaoMaquininhaView.tsx`), as transações da Rede (`pos_transactions`) que não possuem vínculo automático com uma Ordem de Serviço (`matched_os_number IS NULL`) são exibidas com o rótulo estático e inerte *"Lote Rede Consolidado"*.

Atualmente, o usuário **não tem nenhuma ação na interface** para resolver essas vendas de cartão órfãs, enquanto na aba de Extrato Bancário (PIX) o sistema já oferece um fluxo maduro para:
1. **Vincular a uma OS existente** no pátio ou **Criar uma nova OS manual** (essencial para casos reais como a OS 22613 de Mauá, onde a loja passou R$ 4.051 na maquininha mas não lançou no ERP Oficina Inteligente).
2. **Dar Baixa / Justificar Avulso** (Venda Balcão, Venda Avulsa, Pendente, Outros) através do modal de categorização de órfãos (`OrphanCategorizationModal`), permitindo que a pendência seja baixada ou justificada contabilmente.

## 2. Solução Proposta
Alinhar a experiência da aba **Cartão / Maquininha** à aba do Extrato Bancário (PIX), implementando as mesmas opções de ação para cada venda de cartão sem OS:

1. **Ações Rápidas na Linha da Venda de Cartão (`StoreCartaoMaquininhaView`):**
   - Quando `!hasOs` e sem justificativa:
     - Exibir botão com destaque sutil: **"Vincular OS"** (abre `ManualMatchOsModal` com `source: 'rede'`, filtrando OSs da loja e pré-preenchendo valor e bandeira/crédito/débito).
     - Exibir botão de ação secundária: **"Dar Baixa / Justificar"** (abre `OrphanCategorizationModal` permitindo classificar como Venda Balcão, Pendente, etc., e impactar ou não receita).
   - Quando já categorizada/justificada manualmente (`manual_category` preenchida):
     - Exibir Badge elegante com a categoria atribuída (ex: `Venda Balcão`, `Pendente`, `Justificado`) com botão de editar ou remover justificativa.
   - Quando vinculada a uma OS (`hasOs`):
     - Manter link para visualizar detalhes da OS (`OsDetailModal`).
     - Permitir desvincular a OS caso o operador queira corrigir (`unlinkTransaction` com `source: 'rede'`).

2. **Garantia de RPCs e Mutações no Backend:**
   - Ajustar `useManualMatch.ts` para garantir que `link_manual_rede_to_os` passe sempre o `p_store_id`, evitando erro de overload no Postgres.
   - Garantir que `useCategorizeOrphan.ts` invalide a query key `['store_pos_transactions', storeId, date]` após salvar uma justificativa em `pos_transactions`.

## 3. Skills Especializadas Aplicadas
- `frontend-design-pro`: Aplicação estrita do padrão Dark Zinc-950 (`bg-card`, `border-border/40`, micro-badges sem classes arbitrárias).
- `backend-patterns`: Mutações atômicas via RPC Supabase com idempotência e revalidação unificada de cache TanStack Query.
- `database`: Utilização das colunas já existentes em `pos_transactions` (`manual_category`, `manual_justification`, `matched_os_number`).

## 4. Contratos de Dados
- **Tabela `pos_transactions`:**
  - `matched_os_number`: string | null (número da OS vinculada).
  - `manual_category`: string | null (categoria atribuída na baixa avulsa).
  - `manual_justification`: string | null (justificativa informada pelo operador).
- **RPCs Utilizadas:**
  - `public.link_manual_rede_to_os(p_pos_id UUID, p_os_number TEXT, p_store_id TEXT, p_amount NUMERIC)`
  - `public.create_and_link_manual_os(p_transaction_type TEXT, p_transaction_id UUID, p_store_id TEXT, p_os_number TEXT, ...)`
  - `public.unlink_manual_os_match(p_transaction_type TEXT, p_transaction_id UUID, p_os_number TEXT)`
- **Tabela `daily_revenue_adjustments`:**
  - Inserção condicional de receita avulsa quando o operador opta por impactar receita.

## 5. Arquivos Afetados
### [Arquivos Existentes Reutilizados / Modificados]
- `src/components/conciliacao/StoreCartaoMaquininhaView.tsx` (Adição dos botões de ação Vincular OS, Dar Baixa/Justificar, Badge de Justificativa e Desvinculação).
- `src/hooks/useManualMatch.ts` (Garantia de passagem correta de `p_store_id` para `link_manual_rede_to_os` e invalidação da query `store_pos_transactions`).
- `src/hooks/useCategorizeOrphan.ts` (Adição da invalidação da query `store_pos_transactions`).

### [Arquivos Novos]
- Nenhum arquivo novo necessário; reutilização total dos componentes modais `ManualMatchOsModal` e `OrphanCategorizationModal`.

## 6. Plano de Rollback
Caso a alteração apresente qualquer inconsistência:
1. Reverter `StoreCartaoMaquininhaView.tsx`, `useManualMatch.ts` e `useCategorizeOrphan.ts` via `git checkout` para o commit anterior.
2. Nenhuma migration DDL destrutiva é realizada; as colunas e RPCs já existem no banco.

## 7. Risco Principal e Mitigação
- **Risco:** Re-render ou conflito de queries ao vincular uma venda de cartão com OS, alterando simultaneamente o pátio e a lista de cartões.
- **Mitigação:** Invalidar conjuntamente `['store_pos_transactions']`, `['patio_os_for_store']` e `['reconciliation_views']` após qualquer mutação.
