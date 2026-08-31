# Proposal: Persistência de Contas Manual e Gestão Completa de Despesas End-to-End (320)

## Problema
Quando ocorrem divergências na exportação ou importação de planilhas de Contas a Pagar (`BuscaContasAPagar.xls`), o operador precisa ajustar o valor de Contas a Pagar na conciliação diária de duas formas:
1. **Ajuste Direto no Painel de Fechamento (`ResumoDiaPanel.tsx`)**: Ao clicar em "Editar Fechamento", digitar o valor correto no campo Contas e salvar, o sistema grava em `daily_snapshots`, mas logo após o refetch da RPC `get_daily_reconciliation_summary`, a tela reverte automaticamente para o somatório original bruto de `daily_manual_bills`.
2. **Edição de Contas no Modal (`ContasManualModal.tsx`)**: Não existe modal/mecanismo para editar valor, título ou loja de uma conta existente (importada ou avulsa), apenas criar nova, excluir ou alternar o toggle de contabilização.

Esse comportamento impede que o operador sanitize discrepâncias de despesas, forçando o fechamento a carregar valores incorretos.

## Solução Proposta (Foco em Reuso e Correção)
1. **[MODIFY] RPC `public.get_daily_reconciliation_summary`**:
   - Respeitar compulsoriamente o override manual gravado em `daily_snapshots.metadata->>'contas_manual_override'` ou `daily_snapshots.contas_a_pagar` quando o fechamento tiver sido editado/homologado pelo operador.
   - Retornar propriedades claras: `contas_base`, `contas_extras`, `contas_manual`, `contas_manual_override`, `juros_rede`, `subtotal_contas`.
2. **[NEW] RPC `public.update_manual_bill`**:
   - Criar procedure segura para atualizar qualquer despesa de `daily_manual_bills` (`amount`, `title`, `category`, `store_id`, `description`, `contabilizar_no_subtotal`).
3. **[MODIFY] Componente `ContasManualModal.tsx`**:
   - Adicionar modal de edição de despesa (`EditBillModal`) com formulário completo (Título, Valor, Categoria, Filial, Descrição, Toggle Contábil).
   - Adicionar botão de edição (`Pencil`) em cada linha da tabela de contas.
   - Sincronização e recálculo instantâneo dos totais no cabeçalho do modal.
4. **[MODIFY] Componente `ResumoDiaPanel.tsx`**:
   - Persistir `contas_manual_override` em `daily_snapshots.metadata` no `handleSave`.
   - Manter a exibição consistente do valor salvo sem permitir que o refetch sobrescreva a edição com o somatório bruto.
   - Adicionar badge sutil ("Ajustado Manualmente") e botão de "Restaurar Soma" para dar flexibilidade total ao usuário.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Encontradas:**
  - `daily_manual_bills`: Tabela de itens de contas a pagar. Reutilizada 100%.
  - `daily_snapshots`: Tabela de fechamento diário. Reutilizada 100%, utilizando a coluna `metadata` para armazenar o flag de override.
  - `get_daily_reconciliation_summary`: RPC principal. Modificada (`[MODIFY]`) para dar precedência ao override manual quando presente.
- **Componentes / Hooks Existentes Encontrados:**
  - `ContasManualModal.tsx`: Modal de gestão de contas. Modificado (`[MODIFY]`) para incluir fluxo de edição.
  - `ResumoDiaPanel.tsx`: Painel de consolidação. Modificado (`[MODIFY]`) para manter a persistência e reatividade.
- **Justificativa para Artefatos Novos (se houver):**
  - Apenas a RPC `update_manual_bill` para atualização atômica de contas existentes. Nenhuma tabela nova.

## Contratos de Dados & SQL (Supabase)

### RPC `update_manual_bill`
```sql
CREATE OR REPLACE FUNCTION public.update_manual_bill(
    p_bill_id uuid,
    p_title text DEFAULT NULL,
    p_amount numeric DEFAULT NULL,
    p_category text DEFAULT NULL,
    p_store_id text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_contabilizar_no_subtotal boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated daily_manual_bills%ROWTYPE;
BEGIN
    UPDATE daily_manual_bills
    SET 
        title = COALESCE(p_title, title),
        recipient_name = COALESCE(p_title, recipient_name),
        amount = COALESCE(p_amount, amount),
        category = COALESCE(p_category, category),
        store_id = CASE WHEN p_store_id = '' THEN NULL ELSE COALESCE(p_store_id, store_id) END,
        description = COALESCE(p_description, description),
        contabilizar_no_subtotal = COALESCE(p_contabilizar_no_subtotal, contabilizar_no_subtotal),
        updated_at = now()
    WHERE id = p_bill_id
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta com ID % não encontrada.', p_bill_id;
    END IF;

    RETURN to_jsonb(v_updated);
END;
$$;
```

## Risco Principal e Mitigação
- **Risco:** Conflito entre edições manuais no painel e alterações nos itens individuais da tabela.
- **Mitigação:** Quando o usuário altera itens no `ContasManualModal`, a soma dos itens atualiza dinamicamente. Se houver um override ativo no painel, o sistema exibe o badge informativo e um botão de 1 clique para sincronizar com a soma dos itens.
