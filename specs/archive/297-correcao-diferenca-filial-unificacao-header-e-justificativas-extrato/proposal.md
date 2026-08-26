# Proposal: Correção da Diferença por Filial, Unificação do Header da Loja e Justificativas de Extrato (297)

## Problema
1. **Diferença Falsa de R$ 5k+ por Loja (Cálculo Incorreto de Diferença):**
   - A fórmula anterior na RPC calculava `diferenca = ABS(ofx_in.entradas_total - (pos.rede_liquido + pix.pix_total))`.
   - Isso comparava as vendas brutas/líquidas de maquininha de **hoje** (ex: R$ 6.578,59 em Jabaquara) com os créditos bancários de **ontem** que caíram hoje no extrato (R$ 963,43), gerando uma falsa "diferença" de **R$ 5.615,16**, mesmo estando o extrato 100% conciliado.
   - Vendas de maquininha de D0 são **A COMPENSAR** (entram no saldo do caixa, mas não entram no extrato de hoje).
2. **Justificativa do Extrato não saía da Diferença:**
   - O hook `useCategorizeOrphan` atualizava apenas a tabela `transactions`, deixando `ofx_transactions` desatualizada.
   - A RPC não considerava transações justificadas/identificadas (`manual_category`, `matched_os_number`, lotes Rede D-1) ao calcular as pendências reais do extrato.
3. **Banner Poluído no Topo de `conciliacao.$lojaId.tsx`:**
   - A página da filial exibia um bloco duplicado com "Vendas Rede (Líquido)", "Creditado no OFX", "A Compensar", "Status de Compensação".
   - O usuário solicitou substituir esse bloco pelo **Card Consolidado de Fechamento da Filial** (o mesmo padrão executivo da home: Saldo Bancos + Cartões, Maquininha, PIX, Na Loja OS, Previsto e Diferença/Status).

## Solução Proposta
1. **Cálculo Canônico da Diferença por Filial (Backend):**
   - A verdadeira divergência de uma filial é a soma das transações bancárias **órfãs / não identificadas** do dia (que não possuem vínculo com OS, não são lote Rede D-1 e não possuem justificativa manual):
     $$\text{Divergência Filial} = \sum \text{OFX pendentes sem identificação/justificativa}$$
   - Se todas as transações do extrato da filial estiverem identificadas (OS, Lote Rede D-1 ou Justificativa), a diferença é **R$ 0,00 (100% Conciliado)**.
2. **Sincronização Completa de Justificativas (`useCategorizeOrphan.ts`):**
   - Ao justificar/categorizar no extrato, atualizar simultaneamente `transactions` e `ofx_transactions` com `manual_category` e `manual_justification`.
   - A transação justificada é imediatamente removida do montante de pendências.
3. **Unificação do Header da Filial (`conciliacao.$lojaId.tsx`):**
   - Substituir o banner duplicado de 4 colunas pelo **Card de Fechamento por Filial**, com as 6 métricas padronizadas: Saldo Bancos + Cartões, Maquininha, PIX, Na Loja OS, Previsto e Status de Conciliação.

## Contratos de Dados & Backend
- **RPC:** `get_daily_reconciliation_summary`.
- **Tabelas:** `ofx_transactions`, `transactions`, `pos_transactions`.
- **Frontend:** `src/routes/conciliacao.$lojaId.tsx`, `src/hooks/useCategorizeOrphan.ts`.

## Risco Principal
- **Risco:** Transação justificada em uma data antiga reaparecer como pendente.
- **Mitigação:** Gravar `manual_category` e `manual_justification` permanentemente no registro original.
