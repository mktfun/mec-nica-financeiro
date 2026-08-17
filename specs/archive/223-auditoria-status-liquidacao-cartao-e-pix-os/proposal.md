# Proposal: Auditoria Clara de Liquidação Bancária para Cartões e PIX de Ordens de Serviço (223)

## Contexto & Necessidade
O operador financeiro precisa saber com total precisão e transparência:
1. **Para Cartões de Maquininha:**
   - Se o valor líquido da venda com cartão já foi **liquidado e depositado no banco** (via lote de recebimento da Rede no Itaú) ou se ainda está **pendente de liquidação** (data futura de recebimento D+30/D+1).
   - Qual foi o lançamento bancário de depósito da adquirente correspondente.
2. **Para PIX de Ordens de Serviço:**
   - Se o PIX informado pelo cliente na OS realmente **caiu na conta bancária**.
   - Qual foi a transação exata no extrato bancário (com Nome da Contraparte, CPF/CNPJ mascarado, Data/Hora e Valor).
   - O que fazer quando o PIX não foi localizado (poder vincular a um PIX sem identificador ou corrigir caso tenha sido pago em dinheiro).

## Solução Proposta
1. **Transparência de Liquidação de Cartão (`OsVsRedeTable.tsx` e `RedeVsOfxTable.tsx`):**
   - Status visual evidente por linha:
     - `✅ Liquidado no Banco (Lote Itaú: DD/MM)` quando o lote da adquirente foi identificado no extrato OFX.
     - `⏳ Aguardando Depósito (Previsão: DD/MM)` quando a venda foi registrada na maquininha mas o crédito bancário ocorre em data futura.
   - Tooltip e detalhamento do lote bancário que quitou o cartão.
2. **Auditoria de PIX de OSs (`PixVsOfxTable.tsx`):**
   - Exibição linha a linha da contraparte bancária real (ex: `PIX RECEBIDO - JOAO DA SILVA - R$ 350,00`).
   - Diferença de valor (Delta) entre o declarado na OS e o que entrou no banco.
   - Status claro:
     - `✅ Confirmado no Banco` (com dados do extrato).
     - `⚠️ Pendente no Extrato` (com botão de ação rápida para buscar lançamento bancário).
3. **Ações Rápidas de Resolução:**
   - Botão para **Vincular Lançamento Bancário** direto na linha da OS pendente.
   - Botão para **Desvincular / Corrigir Pagamento em Dinheiro** para OSs que não foram pagas via PIX bancário.

## Benefícios
- Elimina qualquer dúvida sobre recebimentos reais vs declarados.
- Dá segurança total na conferência de que todo PIX e Cartão de fato entrou na conta corrente da empresa.
