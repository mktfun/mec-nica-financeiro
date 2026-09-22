# SDD Proposal: Consistência Arquitetural de Conciliação e Cofre (SSOT)

## 1. O Problema
Atualmente, o frontend (`ResumoDiaPanel.tsx` e modals) age de forma híbrida: lê dados unitários operacionais (lançamentos de cofre, contas) mas também escreve e consome totais agregados num campo `metadata` de `daily_snapshots`. 
Quando o usuário edita manualmente os totais do dia, a tela (que carrega estados parcialmente do cache/RPC e parcialmente ao vivo) reescreve os metadados agregados. Isso resulta em um problema gravíssimo: uma conta que foi baixada em dinheiro tem seu saldo unitário descontado no banco (`status = depositado`), mas o salvamento de um snapshot obsoleto pelo frontend força o resumo daquele dia a acreditar que o cofre ainda tem o saldo antigo (R$ 24k). Essa sobreposição de fontes causa distorções bizarras onde o dinheiro consta como disponível, mas os itens unitários não estão lá para dar baixa.
Adicionalmente, relata-se que a própria RPC de baixa em dinheiro possuía buracos de concorrência/retorno, propiciando uma falsa "dupla efetivação" no front.

## 2. Solução Proposta
Uma refatoração cirúrgica em quatro partes:
1. **SSOT para Banco (RPC Transacional):** Transformar a RPC `dar_baixa_dinheiro` em um bloco `SELECT ... FOR UPDATE`, garantindo atomicidade absoluta sem "falso positivo" no frontend.
2. **SSOT para Visualização (Read-Only UI):** Fazer com que o `ResumoDiaPanel` derive estritamente do `get_daily_reconciliation_summary` e que essa RPC faça as agregações, sem recálculos duplicados do React.
3. **Imutabilidade do Snapshot:** Ação "Salvar/Editar" no painel deixará de reescrever saldos de cofre e transações. O frontend só poderá gerar registros de "Ajustes Manuais". O total será sempre a soma da base de dados viva + ajustes.
4. **Resiliência do Front:** Retirar a lógica de "assumir sucesso local" de modais como `BaixaDinheiroModal`.

## 3. Skills Especializadas Consultadas
- `database`: Utilização rigorosa de concorrência com travamento de linha (`FOR UPDATE`) e isolamento transacional.
- `backend-patterns`: Mutações que confiam totalmente na API RPC e revalidam o cache com React Query.
- `sdd-proposal`: Planejamento arquitetural direto.

## 4. Contratos de Dados
- Tabela `store_cash_vault`: Única fonte de verdade de saldo em trânsito (não pode ser substituído por valores agregados no json `metadata`).
- Tabela `daily_snapshots`: Virará registro puro de fechamento de período para auditoria (read-only snapshot) em vez de variável de estado dinâmico durante edição.

## 5. Arquivos Afetados

### [MODIFICADOS]
- `src/components/conciliacao/ResumoDiaPanel.tsx`
- `src/components/conciliacao/CashVaultCompositionModal.tsx`
- `src/components/conciliacao/BaixaDinheiroModal.tsx`
- `src/hooks/useBackendConciliacao.ts`
- `supabase/migrations/[TIMESTAMP]_fix_cash_vault_transactionality_and_ssot.sql` (Nova Migration)

## 6. Plano de Rollback
Todas as modificações nos componentes front-end estão blindadas por commits curtos. Caso a migration traga impactos indesejados nas queries lentas de resumo, um script SQL de "down migration" reverterá as Views/RPCs e restaurará a função `dar_baixa_dinheiro` baseada no payload prévio (armazenado via cópia no header da migration).

## 7. Risco Principal
**Risco:** Invalidações de caches de React Query que descasam da nova estrutura SSOT podem render bugs transientes (telas em branco).
**Mitigação:** `useQuery` de conciliação passará a ter `staleTime` menor em caso de mutações, garantindo sincronia forçada com o PostgreSQL após saves e baixas.
