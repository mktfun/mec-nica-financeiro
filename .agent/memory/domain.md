# 🧠 Memória Modular: Domínio & Conciliação

## [2026-07-24] — Feature ID: conciliacao-tab-redesign

**Contexto:** Correção da lógica de pareamento entre Maquininha, Extrato OFX e OSs do Pátio nas telas de conciliação individual por loja (`conciliacao.$lojaId.tsx`), além da adição de uma aba exclusiva de conciliação de PIX.

**Regra aprendida:**
- Transações bancárias do OFX identificadas como depósitos de adquirente (`REDE`, `REDECARD`, `MAST`, `VISA`, `ELO`, `PAGAMENTO S.A.`) que foram pareadas com a movimentação líquida da maquininha (Aba 2) NUNCA devem figurar na aba de extrato sem associação (`ofxSemMatch` / Aba 4).
- O cálculo de delta na conciliação `OS → Maquininha` (Aba 1) deve considerar a proporção em cartão (`parsed_credit_debit`) para OSs com recebimento fracionado/misto (ex: Cartão + PIX) para evitar falsos deltas negativos.
- A conciliação por loja deve ser dividida em 4 pilares cristalinos: `1. Cartão (OS → Maquininha)`, `2. Maquininha (Líq) → Banco`, `3. PIX (OS → Banco OFX)` e `4. Banco (Sem Origem)`.

**Risco identificado:** Exibir o mesmo lançamento do extrato bancário como "Pareado" em uma aba e "Não Identificado" em outra causa desconfiança no usuário quanto à integridade do fechamento.

**Não fazer:** Nunca deixar depósitos de cartão já pareados vazarem para a lista de extratos sem match.
