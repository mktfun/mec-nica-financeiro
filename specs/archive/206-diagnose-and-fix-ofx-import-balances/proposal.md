# Proposal: 206-diagnose-and-fix-ofx-import-balances

## Problema
Ao importar os extratos bancários (.OFX) na tela de Importações (`CentralImportWizard`), o saldo bancário consolidado apresenta uma discrepância de aproximadamente R$ 23.000,00 ("uns 23k") em relação à soma manual real das contas. O diagnóstico identificou 4 causas raízes concomitantes:

1. **Variações de Rótulo de Saldo Anterior no OFX**: O `ofxParser.ts` busca estritamente pela substring `SALDO ANTERIOR`. Em arquivos com variações (`SDO ANTERIOR`, `SLD ANTERIOR`, `SALDO INICIAL`, `SALDO ANTERIOR C/C`, etc.), o `previousBalance` fica como `undefined`. Sem o saldo anterior, o algoritmo de triangulação não consegue validar o fator de escala do `<BALAMT>` truncado do Itaú e cai no fallback `/ 100`, reduzindo saldos que deveriam ser divididos por 10 (ex: R$ 25.000,00 vira R$ 2.500,00, gerando um rombo exato de ~R$ 22.500,00).
2. **Sobrescrita de `storeBankBalances` para Aliases Não Mapeados ou Múltiplas Contas**: No `CentralImportWizard.tsx`, extratos de lojas não mapeadas ou com múltiplas contas usam a chave `'global_account'`, sobrescrevendo o saldo do arquivo anterior.
3. **Mapeamento Ausente ou Incompatível de Filiais**: Quando um arquivo OFX não tem correspondência exata de alias com `stores.id`, seu `bank_total` não é vinculado a nenhuma loja, sendo completamente ignorado nas RPCs `calculate_daily_conciliation` e `get_dashboard_metrics`.
4. **Falta de Tabela de Auditoria e Diagnóstico Visual de Balanços no Wizard**: O operador importa os arquivos às cegas sem visualizar o comparativo individual por loja de Saldo Anterior, Total de Entradas/Saídas e Saldo Final Calculado antes de salvar.

## Solução Proposta
1. **Robusticidade no `ofxParser.ts`**:
   - Expandir a detecção de Saldo Anterior para todas as variantes bancárias comuns (`SALDO ANTERIOR`, `SDO ANTERIOR`, `SLD ANTERIOR`, `SALDO INICIAL`, `SALDO ANTERIOR C/C`, `SALDO DO DIA ANTERIOR`, `<PRVBAL>`).
   - Tratamento adequado de saldos anteriores negativos (contas com limite/cheque especial).
   - Validação aprimorada de grandeza e consistência matemática (`Saldo Esperado = Saldo Anterior + Soma Transações`).
2. **Correção de Agrupamento em `CentralImportWizard.tsx` e `useTransactions.ts`**:
   - Acumular saldos por loja de forma determinística (se uma loja tiver mais de uma conta OFX, somar os saldos `bank_total` em vez de sobrescrever).
   - Bloquear e alertar com destaque caso existam extratos OFX sem vínculo de loja no Step 2/3.
3. **Painel de Auditoria de Balanços OFX no Wizard (Step 2 / Step 3)**:
   - Exibir tabela detalhada com cada arquivo OFX, conta/alias, loja mapeada, Saldo Anterior, Movimentação (In/Out), Saldo Calculado, `<BALAMT>` e Saldo Final Salvo.
   - Indicador visual verde/amarelo de conferência para identificar na hora qual loja possui divergência.

## Contratos de Dados
- Tabela `reconciliations`: `store_id` (TEXT), `date` (DATE), `bank_total` (NUMERIC), `previous_balance` (NUMERIC).
- Tabela `ofx_transactions`: `store_id` (TEXT), `target_date` (DATE), `amount` (NUMERIC), `type` ('in' | 'out'), `fitid` (TEXT).
- Tabela `store_file_mappings`: `file_alias` (TEXT UNIQUE), `store_id` (TEXT), `store_name` (TEXT).

## API / Interface
- `parseOFXFile(file: File)` em `src/lib/parsers/ofxParser.ts`: Retorna `OfxParseResult` com `bankBalance`, `previousBalance`, `transactions`, `alias`.
- `CentralImportWizard.tsx`: Nova seção/tabela expansível de "Auditoria de Saldos Bancários por Loja".
- `useBulkInsertTransactions` em `src/hooks/useTransactions.ts`: Garantir preservação e acumulação de `bank_total` por loja.

## Features Existentes Impactadas
- `CentralImportWizard.tsx`: Wizard de importação central.
- `src/lib/parsers/ofxParser.ts`: Parser de extratos OFX.
- `src/hooks/useTransactions.ts`: Persistência de transações e conciliações.
- `ResumoDiaPanel.tsx` / `conciliacao.index.tsx`: Visualização de fechamento e conciliação diária.

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Reversível
- **Mitigação:** Todas as alterações preservam a compatibilidade estrita com o banco Supabase, mantêm tipagem 100% estrita no TypeScript e validam matematicamente os saldos antes da persistência.
