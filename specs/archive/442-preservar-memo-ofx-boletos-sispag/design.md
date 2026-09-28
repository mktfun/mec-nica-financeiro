# Design Técnico — Spec 442: Preservar e Exibir o MEMO de Boletos e SISPAG do OFX

## 1. Arquitetura de Fluxo de Dados Ponta a Ponta

```
[Arquivo OFX: SGML/XML]
          │  <STMTTRN> contendo:
          │  <TRNAMT>, <DTPOSTED>, <TRNTYPE>, <MEMO>, <NAME>?, <CHECKNUM>?, <FITID>?
          ▼
[Parser: ofxParser.ts]
          │  Extrai:
          │  - title = rawMemo
          │  - raw_memo = rawMemo
          │  - raw_name = nameMatch
          │  - bank_reference = checknumMatch
          │  - original_fitid = bankFitid
          │  - fitid = deterministicHash (mantém deduplicação existente)
          │  - counterpart_name = docExtraction.name (apenas se houver contraparte real)
          ▼
[Importador: CentralImportWizard / Fase3OfxReconciliation]
          │  Regra de Mapeamento:
          │  - bank_name = title / raw_memo
          │  - counterpart_name = counterpart_name (ou NULL, NUNCA o alias da conta)
          │  - raw_memo, raw_name, bank_reference, original_fitid
          ▼
[Database: public.ofx_transactions]
          │  ON CONFLICT (store_id, fitid)
          │  Persiste descrição canônica e metadados brutos
          ▼
[UI: StoreExtratoBancarioView.tsx]
          │  getCleanTransactionDisplay(tx):
          │  - Descarta counterpart_name se for alias de conta (ex: regex /ITAU - \d+/)
          │  - Exibe bank_name/raw_memo preservando "SISPAG FORNECEDORES" ou "BOLETO PAGO ..."
          │  - Exibe referência numérica (bank_reference / FITID) em badge secundária
```

---

## 2. Contratos e Interfaces TypeScript Reais

### Interface `OfxTransaction` em `src/lib/parsers/ofxParser.ts`:
```typescript
export interface OfxTransaction {
  storeName: string;
  amount: number;
  type: 'in' | 'out';
  date: string;
  title: string;
  fitid?: string;
  cnpj_cpf?: string;
  counterpart_name?: string;
  raw_memo?: string;
  raw_name?: string;
  bank_reference?: string;
  original_fitid?: string;
}
```

### Regra do Helper `getCleanTransactionDisplay` em `StoreExtratoBancarioView.tsx`:
```typescript
const isAccountAlias = (val?: string) => {
  if (!val) return false;
  const clean = val.trim().toUpperCase();
  return (
    clean.startsWith('ITAU -') ||
    clean.startsWith('ITAU ') ||
    /^\d{4}\s*\d{5,6}-?\d?$/.test(clean) ||
    /^\d{5,10}$/.test(clean)
  );
};

// Se counterpart_name for apenas o alias da conta, descarta e usa a descrição do banco
const validCounterpart = (!isAccountAlias(tx.counterpart_name) && tx.counterpart_name) 
  ? tx.counterpart_name 
  : null;

let primaryName = validCounterpart || tx.recipient_name || tx.raw_memo || tx.bank_name || tx.title || '';
```

---

## 3. Cenários Obrigatórios

### Happy Path (Boleto com MEMO Descritivo):
1. **Entrada OFX:**
   `<MEMO>BOLETO PAGO AUTO PECAS CENTRAL 12.345.678/0001-90</MEMO>`
2. **Processamento:**
   - `ofxParser` extrai: `raw_memo = 'BOLETO PAGO AUTO PECAS CENTRAL ...'`, `counterpart_name = 'AUTO PECAS CENTRAL'`, `cnpj_cpf = '12.345.678/0001-90'`.
   - `useTransactions` grava: `bank_name = 'BOLETO PAGO AUTO PECAS CENTRAL ...'`, `counterpart_name = 'AUTO PECAS CENTRAL'`.
3. **Exibição na UI:**
   - Exibe `"AUTO PECAS CENTRAL"` com badge de Boleto e documento `12.345.678/0001-90`.

### Edge Case 1: SISPAG sem Favorecido no Arquivo:
1. **Entrada OFX:**
   `<MEMO>SISPAG FORNECEDORES</MEMO><CHECKNUM>0008813</CHECKNUM><FITID>20260924001</FITID>`
2. **Processamento:**
   - `ofxParser` extrai: `raw_memo = 'SISPAG FORNECEDORES'`, `bank_reference = '0008813'`, `original_fitid = '20260924001'`, `counterpart_name = undefined`.
   - `useTransactions` grava: `bank_name = 'SISPAG FORNECEDORES'`, `counterpart_name = NULL`, `bank_reference = '0008813'`.
3. **Exibição na UI:**
   - Exibe `"SISPAG FORNECEDORES"` como título principal da transação.
   - Exibe badge de referência contendo `#0008813`.
   - **Zero exibição de número de conta/agência no lugar do título.**

### Edge Case 2: Boleto sem Documento (Apenas Código/Número no MEMO):
1. **Entrada OFX:**
   `<MEMO>BOLETO PAGO 003901234567890</MEMO>`
2. **Exibição na UI:**
   - Preserva o rótulo `"BOLETO PAGO 003901234567890"` em vez de arrancar o prefixo e deixar apenas uma sequência de dígitos desconexos.

### Edge Case 3: Reimportação do Mesmo OFX:
- Transações já importadas e conciliadas (com `matched_os_number` ou `matched_bill_id`) sofrem enriquecimento de metadados (`raw_memo`, `bank_reference`) sem alteração de status de conciliação ou valores.

---

## 4. Critérios de Aceitação Verificáveis

1. **Eliminação do Alias no Lugar da Contraparte:**
   - Nenhuma linha do extrato bancário exibe `ITAU - 8813994293` ou formato similar como título da transação.
2. **Preservação de SISPAG:**
   - Os débitos de SISPAG de R$ 1.275,48 e R$ 5.000,00 da filial `st-08` em `2026-09-24` exibem `"SISPAG FORNECEDORES"` no extrato.
3. **Integridade de Deduplicação:**
   - O campo `fitid` determinístico permanece idêntico; a reimportação não duplica transações.
4. **Alinhamento dos Dois Fluxos de Importação:**
   - O mesmo arquivo processado pela Central Import ou pela Fase 3 gera registros idênticos em `ofx_transactions`.
5. **Build Limpo:**
   - `npm run build` passa sem erros de tipagem TypeScript.

---

## 5. Verificação Dirigida (SCAN → INFER → VERIFY → FIX)

### Teste 1: Auditoria das Linhas de SISPAG de 24/09
- **SCAN:** Selecionar transações de `st-08` em 24/09 com valor de R$ 1.275,48 e R$ 5.000,00.
- **INFER:** `counterpart_name` contém `'ITAU - 8813994293'`, fazendo a UI exibir número de agência/conta.
- **VERIFY:** Atualizar a UI para descartar alias de conta e conferir se o título passa a ser `'SISPAG FORNECEDORES'`.

### Teste 2: Parser de Tags OFX
- **SCAN:** Executar parse em fixture com `<MEMO>`, `<NAME>`, `<CHECKNUM>` e `<FITID>`.
- **VERIFY:** Confirmar que `raw_memo`, `raw_name`, `bank_reference` e `original_fitid` são preenchidos corretamente.

---

## 6. Blast Radius e Dependências

- `src/lib/parsers/ofxParser.ts`
- `src/components/importacoes/CentralImportWizard.tsx`
- `src/hooks/useTransactions.ts`
- `src/components/importacoes/manual/Fase3OfxReconciliation.tsx`
- `src/components/conciliacao/StoreExtratoBancarioView.tsx`
- `supabase/migrations/20260928000003_add_ofx_raw_fields_and_preserve_memo.sql`
