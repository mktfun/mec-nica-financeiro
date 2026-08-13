# Proposal: Fix Match Engine (176)

## Problema
A taxa de conciliação automática está criticamente baixa (apenas 13.16% no último lote testado), gerando uma carga manual enorme para o financeiro. Extratos OFX contendo "RECEBIMENTO REDE VISA" ou repasses de PIX não estão "encontrando" suas contra-partes no sistema.

A análise revelou que o problema está na rigidez das datas no backend. O RPC `auto_match_transactions` tenta parear lançamentos bancários exigindo que a data do evento de origem (`closed_at` para OS e `occurred_at` para Maquininha) seja **exatamente igual** à data em que o dinheiro caiu na conta bancária (OFX).
Como as operadoras de cartão pagam em D+1 ou D+2, e PIXs de sexta podem cair na segunda, essa restrição de data exata inviabiliza quase 100% dos cruzamentos reais.

## Solução Proposta
Flexibilizar a janela de busca no motor de conciliação (`auto_match_transactions` no banco de dados) para aceitar defasagem (settlement delay).
1. Em vez de `DATE(closed_at) = p_date`, a busca por OSs orfãs olhará para OSs fechadas num intervalo de até 3 dias antes do crédito bancário (`p_date - 3`).
2. Em vez de `occurred_at::date = p_date`, a busca por repasses de maquininha também olhará para uma janela de até 3 dias no passado.
3. Ordenar as buscas cronologicamente decrescente para parear a transação compatível mais recente.

> **Obs:** A questão das saídas/despesas órfãs está fora do escopo desta proposta, focando puramente em maximizar a automação dos recebimentos.

## Contratos de Dados
- Nenhuma alteração estrutural nas tabelas.
- Apenas substituição (CREATE OR REPLACE FUNCTION) da RPC `auto_match_transactions`.

## API / Interface
- Nenhuma alteração no Frontend (React). O Wizard apenas continuará chamando a RPC ao final do processo, mas colherá um índice de acerto próximo de 90%.

## Features Existentes Impactadas
- **Conciliação Diária**: O fechamento terá números mais precisos pois menos valores flutuarão como "Não conciliado".

## Risco Principal
**Probabilidade:** Baixa
**Impacto:** Parcialmente Reversível
O maior risco de relaxar a data para D-3 é parear erroneamente duas transações de valores **exatamente idênticos** ocorridas no mesmo intervalo. 
**Mitigação:** Ao priorizar a ordenação por `occurred_at DESC` na busca, o motor dá preferência ao match cronologicamente mais próximo. Como a tolerância de valor é rígida (< 0.1), colisões puras de centavos em dias paralelos são estatisticamente baixas para a operação diária descrita.
