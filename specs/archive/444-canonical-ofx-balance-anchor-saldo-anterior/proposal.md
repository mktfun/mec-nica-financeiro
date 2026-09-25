# Proposal — Spec 444: Âncora no Saldo do Dia (SALDO TOTAL DISPONÍVEL DIA) e Descarte de LEDGERBAL de D+0

## 1. Problema Diagnosticado & Evidências Reais

### 1.1 A Evidência Forense dos Extratos Bancários (Itaú Empresas)
Ao inspecionar extratos OFX reais de diferentes filiais extraídos na manhã de 25/09 para conciliação de ontem (**24/09**), foi comprovado que o banco **já fornece a linha exata de fechamento do dia**:

#### Exemplo Filial 1:
```xml
</STMTTRN>
<STMTTRN>
  <TRNTYPE>CREDIT</TRNTYPE>
  <DTPOSTED>20260924100000[-03:EST]</DTPOSTED>
  <TRNAMT>13135.01</TRNAMT>
  <FITID>20260924005</FITID>
  <CHECKNUM>20260924005</CHECKNUM>
  <MEMO>SALDO TOTAL DISPONÍVEL DIA</MEMO>
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
  <BALAMT>14903.46</BALAMT>
  <DTASOF>20260925100000[-03:EST]</DTASOF>
</LEDGERBAL>
```
- **Saldo Real e Fiduciário de 24/09:** `R$ 13.135,01` (na tag `<TRNAMT>` com `<MEMO>SALDO TOTAL DISPONÍVEL DIA` e `<DTPOSTED>20260924`).
- **Saldo Contaminado de D+0 (Hoje):** `R$ 14.903,46` (na tag `<LEDGERBAL>` com `<DTASOF>20260925100000`).

#### Exemplo Filial 2:
```xml
</STMTTRN>
<STMTTRN>
  <TRNTYPE>CREDIT</TRNTYPE>
  <DTPOSTED>20260924100000[-03:EST]</DTPOSTED>
  <TRNAMT>7930.11</TRNAMT>
  <FITID>20260924004</FITID>
  <CHECKNUM>20260924004</CHECKNUM>
  <MEMO>SALDO TOTAL DISPONÍVEL DIA</MEMO>
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
  <BALAMT>12874.36</BALAMT>
  <DTASOF>20260925100000[-03:EST]</DTASOF>
</LEDGERBAL>
```
- **Saldo Real e Fiduciário de 24/09:** `R$ 7.930,11`.
- **Saldo Contaminado de D+0 (Hoje):** `R$ 12.874,36`.

### 1.2 Por que o Parser Legado Não Estava Gravando o Saldo do Dia?
Testes no terminal revelaram a causa-raiz exata da falha no `src/lib/parsers/ofxParser.ts`:
1. **Decodificação de Encoding:** Arquivos codificados em UTF-8 ao serem decodificados via `new TextDecoder('windows-1252')` transformavam `DISPONÍVEL` em `DISPONÃ VEL`.
2. **Falha de Match:** `rawMemo.toUpperCase().includes('SALDO TOTAL DISPONÍVEL')` avaliava para `false`.
3. **Descarte Prematuro por Filtro de Lixo:** Logo abaixo, a lista `JUNK = ['SALDO TOTAL', 'SALDO DISPONIVEL', ...]` dava match no termo ASCII `'SALDO TOTAL'` e executava `continue;`, descartando a transação de saldo do dia silenciosamente!
4. **Queda no `<LEDGERBAL>`:** Com `closingDayBalance` restando `undefined`, o parser recorria ao `<LEDGERBAL>` de 25/09 (`14903.46` e `12874.36`), gravando o saldo do dia seguinte no fechamento contábil de ontem.

---

## 2. Solução Proposta

### 2.1 Captura Canônica de `SALDO TOTAL DISPONÍVEL DIA`
Configurar o scanner de memos com:
- **Decodificação Resiliente:** Auto-detecção UTF-8 vs Windows-1252 com normalização sem acentos (`.normalize("NFD").replace(/[\u0300-\u036f]/g, "")`).
- **Regex Resiliente para Saldo do Dia:**
  ```typescript
  const isClosingBalMemo = (
    /SALDO\s*(?:TOTAL)?\s*DISPON[^\n\r<]*?DIA/i.test(normalizedMemo) ||
    /DISPON[IÍ]VEL\s*DIA/i.test(normalizedMemo) ||
    /SALDO\s*DO\s*DIA/i.test(normalizedMemo) ||
    /SDO\s*(?:FDO|FIM|FINAL)/i.test(normalizedMemo) ||
    /SALDO\s*FINAL/i.test(normalizedMemo)
  );
  ```
- **Execução ANTES de qualquer filtro JUNK:** A extração do saldo do dia tem precedência absoluta sobre o descarte de resíduos de cabeçalho.
- **Normalização de Sinal:** Se `TRNTYPE === 'DEBIT' || TRNTYPE === 'SRVCHG'` ou valor negativo, o saldo é `-Math.abs(amount)`. Senão, `+Math.abs(amount)`.

### 2.2 Hierarquia Canônica de Precedência do Saldo Bancário (`bankBalance`)
1. **Prioridade 1 (Saldo do Dia - Canon Itaú):** Se houver `closingDayBalance` no extrato (`SALDO TOTAL DISPONÍVEL DIA`), ele é adotado como `bankBalance`. `balanceSource = 'saldo_total_disponivel_dia'`.
2. **Prioridade 2 (Âncora no Saldo Anterior):** Se não houver saldo do dia explícito, mas houver `<MEMO>SALDO ANTERIOR`, deriva o saldo final:
   $$\text{bankBalance} = \text{previousBalance} + \sum_{t \le \text{targetDate}} \Delta(t)$$
   `balanceSource = 'saldo_anterior_plus_tx'`.
3. **Prioridade 3 (LEDGERBAL da Mesma Data):** Se `<DTASOF>` for menor ou igual à `targetDate`. `balanceSource = 'ledgerbal_exact'`.
4. **Prioridade 4 (Fallback Legado):** Apenas se nenhuma das anteriores for aplicável. `balanceSource = 'ledgerbal_fallback'`.

---

## 3. Skills Especializadas Aplicadas

- **`backend-patterns`:** Decodificação binária resiliente, normalização imutável de strings e precisão fiduciária com arredondamento monetário de dois dígitos.
- **`database`:** Gravação limpa em `reconciliations` garantindo que `bank_total` reflita a foto exata de D-1 (R$ 13.135,01 e R$ 7.930,11) sem contaminação de D+0.
- **`frontend-design-pro`:** Exibição do saldo real no Step 1 do `CentralImportWizard.tsx` com badge semântico `bg-emerald-500/10 text-emerald-400` (*"Saldo Fechamento do Dia"*).
- **`security`:** Sanitização contra injeção de caracteres de controle em strings SGML/XML e integridade multi-tenant por filial.

---

## 4. Contratos de Dados & Interfaces

### 4.1 Interface `OfxParseResult` (Atualizada)
```typescript
export type BalanceSource = 
  | 'saldo_total_disponivel_dia' 
  | 'saldo_anterior_plus_tx' 
  | 'ledgerbal_exact' 
  | 'ledgerbal_fallback';

export interface OfxParseResult {
  alias: string;
  transactions: OfxTransaction[];
  bankBalance?: number;              // R$ 13.135,01 (exato do dia)
  previousBalance?: number;          // R$ 17.026,91 (saldo anterior se presente)
  previousBalanceDate?: string;
  closingDayBalance?: number;        // R$ 13.135,01 (extraído de SALDO TOTAL DISPONÍVEL DIA)
  closingDayDate?: string;           // 2026-09-24 (extraído de DTPOSTED)
  ledgerBalance?: number;            // R$ 14.903,46 (valor bruto do LEDGERBAL D+0)
  ledgerBalanceDate?: string;        // 2026-09-25 (data de DTASOF)
  balanceSource?: BalanceSource;
  fileName?: string;
  accountLimit?: number;
}
```

---

## 5. Blast Radius & Arquivos Afetados

### 5.1 Arquivos Existentes Modificados
1. `src/lib/parsers/ofxParser.ts` — Decodificação de encoding resiliente, normalização sem acentos, regex aprimorada de `SALDO TOTAL DISPONÍVEL DIA`, extração de `DTPOSTED` do saldo e atribuição prioritária a `bankBalance`.
2. `src/lib/parsers/centralImportManager.ts` — Propagação de metadados enriquecidos (`closingDayBalance`, `balanceSource`).
3. `src/components/importacoes/CentralImportWizard.tsx` — Exibição no Step 1 do badge de fechamento do dia.
4. `src/hooks/useTransactions.ts` — Gravação de `bank_total` correspondente ao saldo do dia.

### 5.2 Arquivos Novos
1. `tests/e2e/tier2_boundary/ofx_closing_balance_saldo_do_dia.test.mjs` — Teste unitário e de fronteira com os dois extratos reais fornecidos pelo usuário.

---

## 6. Plano de Rollback

- **Código:** `git restore` nos arquivos de parser.
- **Banco:** Os campos `bank_total` e `previous_balance` na tabela `reconciliations` são atualizados por upsert idempotente. O rollback de código restabelece a extração anterior imediatamente se necessário.

---

## 7. Risco Principal & Mitigação

- **Risco:** Um banco que utilize `SALDO TOTAL DISPONÍVEL` sem a palavra `DIA` ou com pequenas variações de espaçamento.
- **Mitigação:** A regex `/SALDO\s*(?:TOTAL)?\s*DISPON[^\n\r<]*?DIA/i` e `/SALDO\s*DO\s*DIA/i` cobre variações com e sem acentos, múltiplos espaços e variações abreviadas (`SDO FINAL`, `SDO FIM DIA`).
