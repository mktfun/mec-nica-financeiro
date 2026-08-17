# Architect Position: Round 1

## 1. Tese Estrutural: A Inversão de Polaridade (OFX-First Ledger)
O erro arquitetural raiz atual é tratar a conciliação como uma função dependente de **data síncrona `target_date`** em ambos os lados.
No mundo real automotivo:
- O **Extrato Bancário (OFX)** é um fluxo contínuo de **fatos contábeis imutáveis** (o dinheiro entrou na conta em uma data precisa).
- O **Relatório de Pátio (OSs)** é um **snapshot de estado acumulado e volátil** (uma OS aberta hoje pode conter pagamentos parciais de 7 dias atrás).

## 2. Desenho Arquitetural Proposto
1. **Entidade Imutável de Vínculo (`conciliation_matches`):**
   - Criação/Consolidação de uma tabela relacional de matches: `(id, store_id, ofx_transaction_id, os_number, matched_amount, match_mode: 'AUTO' | 'MANUAL', matched_at)`.
2. **Ciclo de Vida de Novos PIXs:**
   - Todo PIX importado no OFX entra como `status: 'UNLINKED'`.
   - O motor de conciliação busca candidatos em um **Pool Atemporal de OSs da Filial** (janela retroativa de até 30 dias).
   - Ao casar: o `ofx_transaction_id` é marcado como `status: 'MATCHED'` e a OS correspondente recebe a baixa do pagamento em PIX.
3. **Resiliência contra Novas Importações:**
   - Quando um novo relatório de pátio é importado amanhã, o parser/upsert consulta os registros em `conciliation_matches`. Se a OS #1234 já estiver pareada com o PIX `UUID-X`, o sistema mantém o vínculo intacto e não a reabre como pendente.

## 3. Veredito Técnico do Architect
A abordagem atemporal centrada no OFX é a única arquitetura escalável e matematicamente correta para o modelo de pátio.
