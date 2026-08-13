# Design: Fila de Órfãos (Manual) (181)

## Arquitetura Técnica
Componente Visual (Botão Ação) -> RedeVsExtratoTable.tsx -> Modal (OrphanCategorizationModal.tsx) -> Hook -> Supabase RPC (`categorize_orphan_transaction`) -> Tabela `transactions` -> Retorno de Status Atualizado -> Reload da Matriz de Conciliação.

## Interfaces TypeScript
```typescript
interface ManualCategoryPayload {
  transaction_id: string; // uuid
  manual_category: string;
  manual_justification: string;
}
```

## Componentes / Hooks / Funções
1. `supabase/migrations/<date>_add_manual_category_to_transactions.sql`
   - Adiciona colunas `manual_category` e `manual_justification`.
   - Adiciona RPC `categorize_orphan_transaction(p_tx_id, p_category, p_justification)`.
2. `src/components/conciliacao/OrphanCategorizationModal.tsx`
   - Modal minimalista para selecionar categoria (ex: "Sucata", "Depósito Avulso", "Estorno") e digitar justificativa.
3. `src/hooks/useCategorizeOrphan.ts`
   - Hook de mutação (RPC)
4. `src/components/conciliacao/RedeVsExtratoTable.tsx`
   - Renderiza botão "Justificar" caso a linha esteja órfã. Mostra Badge com a justificativa caso já esteja preenchido.

## Fluxo de UI (se frontend)
1. Gerente acessa o Painel de Conciliação e clica na Loja.
2. Expande o detalhamento da Loja (extrato bancário).
3. Na tabela, nas linhas marcadas como "Sem Par" (Órfãs), aparece o botão "Ação" ou "Justificar".
4. Ao clicar, o `OrphanCategorizationModal` aparece.
5. Ele seleciona a Categoria ("Venda Sucata") e digita um texto.
6. Ao salvar, a linha recebe a flag visual "Justificado". A RPC atualiza o backend.
7. Restrições visuais: Zinc-950, sem glassmorphism, fonte Inter.

## Infra / Deploy (se aplicável)
Variáveis inalteradas.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Transação Sem Par no Frontend] → [Clicar em Justificar, Inserir texto "Sucata"] → [Badge Justificado aparece, a matemática de Diferença permanece inalterada (faturamento cego)].
- Cenário 2: [Erro na RPC] → [Submeter Formulário sem categoria] → [Validação barra o processo, nada é modificado no backend].
