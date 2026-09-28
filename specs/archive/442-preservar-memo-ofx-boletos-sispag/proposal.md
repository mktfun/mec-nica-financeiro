# Spec 442 — Preservar e Exibir o MEMO de Boletos e SISPAG Importados do OFX

## 1. Problema e Evidência Forense Confirmada

Débitos bancários de boletos e pagamentos via SISPAG frequentemente aparecem na interface do extrato bancário exibindo apenas um número de conta/agência (ex.: `8813994293`) ou número de transação em vez da descrição bancária útil ou da contraparte real.

### Evidência no Banco de Dados Supabase (Filial `st-08`, Data 2026-09-24):
- Transações ID `ae85b5aa-8542-493c-b0df-74bfad0eaf5e` (R$ 1.275,48) e ID `f9330c21-0d7b-4f65-9265-a9a71c3d75b6` (R$ 5.000,00):
  - `bank_name`: `"SISPAG FORNECEDORES"`
  - `counterpart_name`: `"ITAU - 8813994293"` (o alias da conta bancária!)
  - `fitid`: Hash determinístico gerado pelo sistema.
- **Sintoma Visual em `StoreExtratoBancarioView.tsx`:**
  - Em `getCleanTransactionDisplay(tx)`, o código prioriza:
    `let primaryName = (tx.counterpart_name || tx.recipient_name || tx.title || tx.subtitle || '').trim();`
  - Em seguida, remove o prefixo `"ITAU "`:
    `primaryName = primaryName.replace(/^(BOLETO PAGO|...|ITAU|SISPAG FORNECEDORES)\s+/i, '').trim();`
  - **Resultado:** A tela exibe `- 8813994293` ou `8813994293`, ocultando o MEMO `"SISPAG FORNECEDORES"` e exibindo um número de agência/conta como se fosse o nome do beneficiário.
  - Para boletos cujo MEMO traz código de barras ou número (ex.: `BOLETO PAGO 00390123...`), a remoção do prefixo `BOLETO PAGO` deixa apenas os dígitos numéricos.

---

## 2. Diagnóstico da Causa-Raiz no Código

1. **Parser OFX (`src/lib/parsers/ofxParser.ts`):**
   - Extrai `<MEMO>` para `title`, mas **ignora** tags úteis como `<NAME>`, `<CHECKNUM>` e o `<FITID>` bancário original.
   - O `<FITID>` original é substituído pelo hash determinístico gerado pela função `generateDeterministicHash`.
   - Só extrai `counterpart_name` quando há um CPF ou CNPJ formatado no final do MEMO. Para qualquer outro lançamento, deixa `counterpart_name` indefinido.
2. **Importador Central (`CentralImportWizard.tsx:1581` e `useTransactions.ts:652`):**
   - Quando `counterpart_name` está ausente, o wizard define `subtitle: tx.counterpart_name || ofx.alias` (ex.: `ITAU - 8813994293`).
   - Ao persistir em `useTransactions.ts:652`, faz:
     `counterpart_name: t.counterpart_name || t.subtitle || null`
     gravando o alias da conta na coluna `counterpart_name` do banco!
3. **Divergência entre Fluxos de Importação:**
   - Central Import: grava o MEMO em `bank_name` e o alias em `counterpart_name`.
   - Importação Manual (`Fase3OfxReconciliation.tsx`): grava o nome da instituição (ex.: `Itaú`) em `bank_name` e o MEMO em `counterpart_name`.
4. **Camada de Apresentação (`StoreExtratoBancarioView.tsx`):**
   - Trata qualquer string em `counterpart_name` como favorecido legítimo e aplica regex de limpeza que descarta o rótulo da operação, deixando apenas números.

---

## 3. Solução Proposta

1. **Evolução do Schema do Banco de Dados (`ofx_transactions`):**
   - Migration idempotente adicionando colunas opcionais:
     - `raw_memo TEXT NULL`: Armazena o conteúdo bruto integral da tag `<MEMO>`.
     - `raw_name TEXT NULL`: Armazena o conteúdo da tag `<NAME>` (quando fornecido pelo banco).
     - `bank_reference TEXT NULL`: Armazena `<CHECKNUM>` ou referência bancária da operação.
     - `original_fitid TEXT NULL`: Preserva o FITID original do banco, mantendo `fitid` para a deduplicação atual.
2. **Parser OFX Robusto (`src/lib/parsers/ofxParser.ts`):**
   - Capturar `<NAME>`, `<CHECKNUM>` e `<FITID>` original no loop de `<STMTTRN>`.
   - Manter compatibilidade com a interface `OfxTransaction` estendida.
3. **Normalizador Compartilhado de Entradas OFX (`src/lib/parsers/ofxNormalizer.ts`):**
   - Função pura para unificar as regras de mapeamento da Central e da Importação Manual:
     - `bank_name`: Descrição bancária canônica (MEMO priorizado, ou NAME, ou descrição por TRNTYPE).
     - `counterpart_name`: Exclusivamente a contraparte real (validada por documento ou regra de negócio). **PROIBIDO gravar alias de conta ou números em `counterpart_name`**.
     - `raw_memo`, `raw_name`, `bank_reference`, `original_fitid` preenchidos fielmente.
4. **Ajuste na Exibição (`StoreExtratoBancarioView.tsx`):**
   - Refatorar `getCleanTransactionDisplay`:
     - Se `counterpart_name` for um alias de conta (ex.: `ITAU - ...` ou padrão numérico de agência/conta), descartá-lo como contraparte.
     - Exibir `bank_name` / `raw_memo` como título principal da transação (ex.: `"SISPAG FORNECEDORES"` ou `"BOLETO PAGO AUTO PECAS"`).
     - Não desmembrar rótulos bancários de modo a deixar apenas números isolados no título.
     - Exibir a referência bancária (`CHECKNUM`/`FITID`) em badge discreta secundária.
5. **Saneamento Histórico Seguro de Linhas com Alias:**
   - Script SQL seguro e auditável que identifica transações onde `counterpart_name` é igual ao alias da conta (ex.: `ITAU - 8813994293`) e restaura `counterpart_name = NULL`, preservando intactos valores, datas, `store_id`, `matched_os_number` e vínculos com despesas.

---

## 4. Contratos de Dados

### Tabela `public.ofx_transactions` (Colunas Novas):
```sql
ALTER TABLE public.ofx_transactions 
ADD COLUMN IF NOT EXISTS raw_memo TEXT NULL,
ADD COLUMN IF NOT EXISTS raw_name TEXT NULL,
ADD COLUMN IF NOT EXISTS bank_reference TEXT NULL,
ADD COLUMN IF NOT EXISTS original_fitid TEXT NULL;
```

### Interface TypeScript Estendida (`OfxTransaction`):
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

---

## 5. Arquivos Afetados

### Arquivos Existentes a Reutilizar/Modificar:
- `src/lib/parsers/ofxParser.ts`: Extração de `<NAME>`, `<CHECKNUM>`, `<FITID>` original e enriquecimento de `OfxTransaction`.
- `src/components/importacoes/CentralImportWizard.tsx`: Eliminar injeção de `ofx.alias` em `counterpart_name`/`subtitle`.
- `src/hooks/useTransactions.ts`: Mapear novas colunas (`raw_memo`, `raw_name`, `bank_reference`, `original_fitid`) no upsert.
- `src/components/importacoes/manual/Fase3OfxReconciliation.tsx`: Alinhar para o mesmo normalizador canônico.
- `src/components/conciliacao/StoreExtratoBancarioView.tsx`: Evitar alias em `primaryName` e preservar rótulos de SISPAG/Boleto.
- `src/integrations/supabase/types.ts`: Atualizar tipos de `ofx_transactions`.

### Arquivo Novo:
- `supabase/migrations/20260928000003_add_ofx_raw_fields_and_preserve_memo.sql`: Migration DDL para adicionar as 4 novas colunas em `ofx_transactions`.

---

## 6. Plano de Rollback

1. **Rollback de Banco de Dados:**
   - As colunas adicionadas são nulas e não quebram queries existentes.
   - Backup prévio das linhas que tiverem `counterpart_name` saneado salvo em `.tmp/backup_ofx_counterpart_saneamento.json`.
   - Se necessário rollback, restaurar os valores originais via update pelo arquivo `.tmp/`.
2. **Rollback de Frontend:**
   - `git checkout -- <arquivos>` restaurando as versões anteriores dos parsers e componentes.

---

## 7. Risco Principal e Mitigação

- **Risco:** Sobrescrever transações bancárias já conciliadas ou alterar a chave de deduplicação `fitid`.
- **Mitigação:** A chave `fitid` determinística permanece 100% inalterada. Apenas metadados de descrição e tags complementares são adicionados. Nenhum valor monetário, data, vínculo ou `matched_os_number` é modificado.

---

## 8. Skills Especializadas Aplicadas

- `sdd-proposal`: Tríade determinística formal e conformidade com circuit breakers.
- `database`: DDL idempotente, inspeção de schema e saneamento restrito.
- `backend-patterns`: Normalização unificada de parsers e mutações seguras.
- `frontend-design-pro`: Padrões de legibilidade, badges discretos e tokens de design Zinc-950 de `DESIGN.md`.
