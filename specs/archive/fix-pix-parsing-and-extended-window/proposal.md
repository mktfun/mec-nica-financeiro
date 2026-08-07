# Proposal: Correção da Extração de PIX & Expansão da Janela de Conciliação (fix-pix-parsing-and-extended-window)

## Problema

1. **Bug de Agregação do PIX (5 Vendas Declaradas = R$ 0,00):**
   - Na importação de OS (`useOsImportProcessor.ts`), o parser de métodos de pagamento só buscava valores se a string contivesse o caractere dois-pontos (`:`). Formatos como `"PIX 680,00"`, `"PIX R$680"`, `"TRANSFERÊNCIA PIX"` zeravam o campo `parsed_pix_transfer`. Em seguida, a regra de fallback sobrescrevia `parsed_credit` com o valor da OS.
   - Além disso, na busca da conciliação (`useConciliacao.ts`), a propriedade lida da tabela `patio_os` era `os.parsed_pix_transfer` em vez da coluna real do banco de dados `os.pix_transfer_value`. Isso fazia a soma de PIX resultar em **R$ 0,00** em todas as telas.

2. **Janela de Data Curta da Conciliação (Apenas D-0 a D-2):**
   - A requisição de transações da conciliação em `useConciliacao.ts` filtrava `.in('target_date', [date, d1Str, d2Str])`, buscando apenas 2 dias atrás.
   - Lançamentos de PIX ou OSs de dias anteriores (ex: PIX de 17/07 em conciliação de 23/07 - D-6) ficavam invisíveis no motor de conciliação por estarem fora da janela consultada.

## Solução Proposta

1. **Parser Robusto de Formas de Pagamento em `useOsImportProcessor.ts`:**
   - Implementar Regex universal para captura de PIX, Crédito, Débito e Dinheiro independente da presença de dois-pontos (`:`), hífens ou traços.
   - Padrão Regex: `/(?:PIX|TRANSF|DEP|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTÃO)\s*[:\-\s]?\s*(?:R\$\s*)?([\d\.,]+)/gi`.
   - Garantir que se a string contiver a palavra `PIX` ou `TRANSF`, o valor pago ou o valor capturado seja atribuído a `parsed_pix_transfer` (e não sobrescrito por `parsed_credit`).

2. **Leitura Correta do Banco em `useConciliacao.ts`:**
   - Corrigir a extração do valor em `osPixList` para ler `os.pix_transfer_value || os.parsed_pix_transfer || 0`.
   - Garantir que `totalVal * pixRatio` ou `pix_transfer_value` seja somado corretamente no card de PIX do Pátio.

3. **Expansão da Janela de Conciliação de D-2 para D-7 / D-14:**
   - Expandir a busca de transações e OSs pendentes para os últimos 7 a 14 dias (`[date, d1Str, d2Str, d3Str, d4Str, d5Str, d6Str, d7Str]`).
   - Incluir no pool de matching todas as OSs em aberto do Pátio e transações OFX sem vínculo dos últimos 7 dias.

## Contratos de Dados
- Tabela `patio_os`: coluna `pix_transfer_value` (numeric).
- Tabela `transactions`: coluna `target_date` (date), `source` ('ofx').

## Features Existentes Impactadas
- `src/hooks/useOsImportProcessor.ts`
- `src/hooks/useConciliacao.ts`
- `src/components/conciliacao/PixVsOfxTable.tsx`
- `src/components/importacoes/CentralImportWizard.tsx`

## Risco Principal
Garantir que a expansão da janela de datas (D-7) não sobrecarregue nem traga transações já vinculadas em conciliações anteriores.
*Mitigação:* Manter a exclusão de IDs já presentes na tabela `conciliation_matches`.
