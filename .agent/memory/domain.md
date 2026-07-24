# 🧠 Memória Modular: Domínio & Conciliação

## [2026-07-24] — Feature ID: conciliacao-tab-redesign

**Contexto:** Correção da lógica de pareamento entre Maquininha, Extrato OFX e OSs do Pátio nas telas de conciliação individual por loja (`conciliacao.$lojaId.tsx`), além da adição de uma aba exclusiva de conciliação de PIX.

**Regra aprendida:**
- Transações bancárias do OFX identificadas como depósitos de adquirente (`REDE`, `REDECARD`, `MAST`, `VISA`, `ELO`, `PAGAMENTO S.A.`) que foram pareadas com a movimentação líquida da maquininha (Aba 2) NUNCA devem figurar na aba de extrato sem associação (`ofxSemMatch` / Aba 4).
- O cálculo de delta na conciliação `OS → Maquininha` (Aba 1) deve considerar a proporção em cartão (`parsed_credit_debit`) para OSs com recebimento fracionado/misto (ex: Cartão + PIX) para evitar falsos deltas negativos.
- A conciliação por loja deve ser dividida em 4 pilares cristalinos: `1. Cartão (OS → Maquininha)`, `2. Maquininha (Líq) → Banco`, `3. PIX (OS → Banco OFX)` e `4. Banco (Sem Origem)`.

**Risco identificado:** Exibir o mesmo lançamento do extrato bancário como "Pareado" em uma aba e "Não Identificado" em outra causa desconfiança no usuário quanto à integridade do fechamento.

**Não fazer:** Nunca deixar depósitos de cartão já pareados vazarem para a lista de extratos sem match.

## [2026-07-24] — Feature ID: conciliacao-visual-grouping

**Contexto:** Pareamento visual agrupado das vendas da maquininha dentro do card do depósito bancário OFX correspondente (ex: R$ 3.652,33 + R$ 330,38 = R$ 3.982,71), busca abrangente de OSs por loja e Modal de Detalhes da OS.

**Regra aprendida:**
- Na busca de OSs do pátio para conciliação (`patio_os`), NUNCA restrinja a consulta por `entry_date` exato de 1 dia, pois OSs cadastradas em dias anteriores continuam sendo conciliadas e vinculadas aos lotes do dia atual.
- Para conciliar N transações de cartão com 1 depósito bancário acumulado, apresente visualmente os itens da maquininha agrupados DENTRO do card do depósito bancário OFX com a soma transparente dos valores dos itens.
- Ao clicar no número da OS em qualquer tabela de conciliação, abra o modal de detalhes (`OsDetailModal.tsx`) exibindo cliente, veículo, valor total, valor pago e fracionamento das formas de pagamento.

**Risco identificado:** Restringir a busca de `patio_os` por data exata fazia o faturamento da OS parecer `R$ 0,00`, gerando deltas falsos negativos.

**Não fazer:** Nunca apresentar tabelas desconectadas de maquininha e banco sem mostrar qual grupo de vendas forma qual depósito.
