# Spec Plan — Spec 444: Âncora no Saldo do Dia (SALDO TOTAL DISPONÍVEL DIA) e Descarte de LEDGERBAL de D+0

## Checklist de Implementação Determinística

### [PARSER & ENCODING]
- [x] Completed - **Task 1: Normalização de Encoding e Sanitização de Strings em `ofxParser.ts`**
  - **Skill:** `backend-patterns`
  - **Ação:** Implementar leitura de buffer com suporte dual a UTF-8 e Windows-1252 em `parseOFXFile`; criar função `normalizeMemoText` com descarte de acentos e caracteres de controle corrompidos.
  - **Verificação de Terminal:** `npm run build`

- [x] Completed - **Task 2: Implementar Scanner Canônico de `SALDO TOTAL DISPONÍVEL DIA` em `ofxParser.ts`**
  - **Skill:** `backend-patterns`
  - **Ação:** Adicionar regex flexível `isClosingDayBalanceMemo` que detecta `SALDO TOTAL DISPONÍVEL DIA`, `DISPONÍVEL DIA`, `SALDO DO DIA`, `SDO FINAL`; extrair valor com preservação de sinal; executar este teste antes do filtro JUNK; atribuir como `bankBalance` prioritário absoluto (`saldo_total_disponivel_dia`).
  - **Verificação de Terminal:** `npm run build`

- [x] Completed - **Task 3: Extrair `<DTASOF>` e Telemetria em `OfxParseResult`**
  - **Skill:** `backend-patterns`
  - **Ação:** Extrair `<DTASOF>` de `<LEDGERBAL>` para `ledgerBalanceDate` e salvar `ledgerBalance` bruto apenas para fins de telemetria; enriquecer `OfxParseResult` com `balanceSource: 'saldo_total_disponivel_dia'`.
  - **Verificação de Terminal:** `npm run build`

### [FRONTEND & PIPELINE CENTRAL]
- [x] Completed - **Task 4: Atualizar `centralImportManager.ts` e Card de Preview no `CentralImportWizard.tsx`**
  - **Skill:** `frontend-design-pro`
  - **Ação:** Propagar os metadados de `closingDayBalance` e `balanceSource`; exibir no Step 1 do Wizard o badge Zinc-950 `✓ Saldo do Dia (Extrato Oficial)` para o saldo capturado.
  - **Verificação de Terminal:** `npm run build`

### [SECURITY & TESTS]
- [x] Completed - **Task 5: Criar Teste E2E com Fixtures Reais Itaú Fornecidas pelo Usuário**
  - **Skill:** `security`
  - **Ação:** Criar `tests/e2e/tier2_boundary/ofx_closing_balance_saldo_do_dia.test.mjs` com as duas fixtures reais fornecidas pelo usuário (`13135.01` vs `14903.46` e `7930.11` vs `12874.36`), testando decodificação UTF-8, descarte de `<LEDGERBAL>` e integridade do saldo do dia.
  - **Verificação de Terminal:** `node tests/e2e/tier2_boundary/ofx_closing_balance_saldo_do_dia.test.mjs`
