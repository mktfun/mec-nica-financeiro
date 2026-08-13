# Proposal: Fila de Órfãos (Manual) (181)

## Problema
O sistema atual já domina a extração de OFX (hashing/deduplicação), domina a persistência retroativa de OS (através do Upsert no Estoque Pendente) e faz os cálculos exatos baseados no fluxo de caixa fechado do dia anterior (através do `daily_snapshots`). O Motor de Match (Fase 1 e Fase 2) funciona nas RPCs e Parsers. 
Porém, falta a **Fase 3: A Fila de Órfãos**. Atualmente, transações de OFX não pareadas (`unmatchedExtrato` e `unmatchedRede`) ficam expostas no breakdown detalhado da conciliação, mas o gerente da loja não possui um painel de ação ("Botão") para justificar manualmente e classificar essas transações que sobraram (ex: "Isso foi venda de sucata" ou "Depósito avulso").

## Solução Proposta
Criar a **Fila de Órfãos (Manual)** na tela de Conciliação Diária, permitindo que o usuário interaja com a lista de transações `unmatched` (sem par) e aplique uma categorização forçada ou vincule a uma justificativa manual, mudando o status visual delas e afetando os somatórios de fechamento de forma controlada.

## Contratos de Dados
- **Tabela Supabase envolvida:** `transactions` (atual)
- **Campos adicionais (Migration):** Adicionar coluna `manual_category` (text) e `manual_justification` (text) na tabela `transactions`.
- **Mutações de estado:** UPDATE na tabela `transactions` onde `id = X`, setando `manual_category` e `manual_justification`, e potencialmente mudando `status` ou flag `is_matched_manually = true`.
- **RLS policies necessárias:** UPDATE permitindo usuários autenticados modificarem as transações de sua loja.

## API / Interface
- **RPC:** Criar `categorize_orphan_transaction(p_tx_id UUID, p_category TEXT, p_justification TEXT)`.
- **Componentes React:** Atualizar `RedeVsExtratoTable.tsx` e `BankReconciliationDashboard.tsx` para adicionar botão de ação em cada linha "Órfã".
- **Nova View/Modal:** `OrphanCategorizationModal.tsx` para input da justificativa.

## Features Existentes Impactadas
- (Ref spec/global/features.md) `RedeVsExtratoTable.tsx` e `ResumoDiaPanel.tsx`. Modificar o status das transações não deve quebrar a soma do fluxo bruto (`Faturamento_Atual`).

## Risco Principal
- **Probabilidade:** Média
- **Impacto:** Parcialmente reversível
- **Mitigação:** Permitir categorização manual do OFX órfão pode gerar distorção matemática caso a nova categoria criada seja considerada uma "conta" e subtraída de novo. O valor da transação não pode sumir da matemática global, apenas ser justificado visualmente, mantendo a métrica `Faturamento Líquido` intacta, conforme a regra de "soma cega".
