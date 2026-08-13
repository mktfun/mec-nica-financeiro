# Spec Plan: fix-ofx-bank-balance-and-os-pending-values (190)

## Tasks

- [x] [FRONTEND] Alterar `src/lib/parsers/ofxParser.ts` (função `parseOFXFile`), injetando uma condicional rigorosa: Se `balStr` não contiver `.` nem `,` (ou se o número for suspeitamente inflado por faltar pontuação), e for > 100000, e não houver casas decimais aparentes, divida por `100.0` como precaução de extração de centavos. Alternativamente, manter os pontos e ajustar `extractNumber`.
- [x] [BACKEND] Criar nova migration `..._fix_ofx_bank_balance_and_status.sql` para substituir (CREATE OR REPLACE) as funções `calculate_daily_conciliation(p_date date)` e `get_dashboard_metrics(p_date date)`.
- [x] [BACKEND] Na CTE `patio` de ambas as funções, adicionar restrição obrigatória para excluir as OSs finalizadas. Condição: `LOWER(status) IN ('em_aberto', 'pago_parcial', 'pendente')` (verificaremos os enum corretos na base no momento da execução, ou usaremos a aproximação de exclusão).
- [x] [BACKEND] Incluir script (anônimo DO ou instrução no fim da migration) que corrija retroativamente os `bank_total` absurdos da tabela `reconciliations` (ex: `UPDATE reconciliations SET bank_total = bank_total / 100 WHERE bank_total > 500000;`).
- [x] [TEST] Verificar cenário de `bankBalance` no parser importando ou simulando com `<BALAMT>1309322`.
- [x] [TEST] Verificar no frontend a ausência dos saldos mortos e os números retroativos corrigidos, voltando para o patamar BRL de milhares.
