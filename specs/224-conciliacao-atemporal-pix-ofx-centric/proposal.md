# Proposal: Conciliação Atemporal e Persistente de PIX (OFX-Centric) (224)

## Origem da Decisão
Aprovado por unanimidade no **Council Debate (Veredito [GO])** após análise de viabilidade arquitetural, volumetria e salvaguardas de unicidade.

## Problema
- Nos relatórios de "Carros em Pátio", os pagamentos parciais ou sinais (PIX, dinheiro, cartão) aparecem acumulados na OS, independentemente da data original do pagamento.
- Exemplo: Um cliente pagou R$ 1.000 via PIX no dia 10/08 (caiu no banco no dia 10/08). Se a OS for importada hoje (17/08) porque o carro ainda está em serviço, o modelo atual baseado em data estrita (`target_date`) deixa o PIX do dia 10 como órfão e a OS do dia 17 como pendente.
- Além disso, ao reimportar uma nova planilha de pátio no dia seguinte, os vínculos manuais anteriores não podem ser apagados ou perdidos.

## Solução Arquitetural
1. **Motor de Conciliação OFX-Centric:**
   - O fluxo de entrada é guiado pelo **Extrato Bancário (OFX)**.
   - Quando novos PIXs entram no banco, o motor busca automaticamente OSs em aberto daquela loja em uma janela retroativa de até 15 dias.
2. **Regra de Unicidade Estrita:**
   - Se houver **1 OS candidata** com o valor exato $\rightarrow$ Vincula automaticamente (`match_status = 'MATCHED'`).
   - Se houver **mais de 1 OS** com o mesmo valor $\rightarrow$ Marca como sugestão e aguarda confirmação manual de 1 clique no modal.
3. **Persistência Imutável em Reimportações:**
   - O processo de importação de pátio (`useOsImportProcessor.ts`) passa a preservar os registros já vinculados (`matched_ofx_id IS NOT NULL`), garantindo que novas planilhas não desfaçam o trabalho de conciliação.
4. **Sem Duplicidade Contábil:**
   - PIXs vinculados a OSs continuam sem somar no faturamento atual (já estão no previsto da OS), enquanto PIXs avulsos justificados compõem o faturamento normalmente.
