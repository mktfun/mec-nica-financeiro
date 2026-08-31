# Proposal: Matching Automático de Saídas OFX × Contas a Pagar e Filtro Estrito de Órfãos (325)

## Problema

No Passo 5 do Wizard de Conciliação (*"Justificativas de Movimentações por Loja"*), o sistema exibiu todas as 47 saídas bancárias do OFX como *"Saídas Órfãs"*, mesmo quando 44 delas já possuem correspondência exata em `BuscaContasAPagar.xls` (ex: Oficina Inteligente R$ 599,00, Raven R$ 202,50, PRPK Auto Peças, Sispag Salários R$ 3.616,31, etc.).

O usuário precisa que:
1. O sistema faça o cruzamento (*tracking*) entre os débitos do OFX e as Contas a Pagar importadas.
2. Cada débito casado com uma conta a pagar seja considerado **automaticamente justificado/vinculado**.
3. **APENAS as saídas realmente órfãs** (débitos bancários sem nenhuma conta a pagar correspondente na planilha) apareçam na tela para o usuário justificar e definir se entra ou não como despesa extra no Contas a Pagar.

---

## Causa Raiz

### 1. Fallback em Memória no `Step2NonRevenueJustifications.tsx`
O `useMemo` de `nonRevenueOutflowEntries` verificava `if (dbOutflows.length > 0)`. Quando o motor no banco casava com sucesso 100% das saídas (ou restavam 0 órfãs no banco), `dbOutflows.length` era `0`. Em vez de exibir 0 saídas órfãs (tela limpa com checkmark de sucesso), o código caía no bloco de fallback `results.ofxResults`, onde `tx.matched_bill_id` não existia em memória, despejando **todas as 47 saídas na tela como se fossem órfãs**.

### 2. Ausência de Pré-Cruzamento em Memória no `CentralImportWizard`
O parser do wizard lia `ofxResults` e `contasPagarResults` de forma isolada em memória. `tx.matched_bill_id` só era preenchido no banco após o `auto_match_saidas`, deixando os dados em memória sem marcação de match.

### 3. `ignoreDuplicates: true` no `useTransactions.ts`
No `useBulkInsertTransactions`, o upsert em `ofx_transactions` usava `{ onConflict: 'store_id, fitid', ignoreDuplicates: true }`, o que impedia que reimportações atualizassem `target_date`, `type` e campos de vínculo.

---

## Solução Proposta

### 1. Correção do `Step2NonRevenueJustifications.tsx`
- Se `isLoadingOutflows` for false, renderizar estritamente `dbOutflows`. Se `dbOutflows.length === 0`, exibir estado vazio gracioso: *"🎉 100% dos débitos bancários foram casados com o Contas a Pagar! Nenhuma saída órfã pendente."*
- Eliminar o fallback cego que reinjetava transações já casadas.

### 2. Motor de Pré-Matching em Memória (`expenseMatcher.ts` / `useCentralImport.ts`)
- Cruzar `results.ofxResults` com `results.contasPagarResults` em memória (por valor exato R$, tolerância de centavos, loja/alias e palavras-chave de fornecedor).
- Marcar `tx.matched_bill_id` e `conta.matched_ofx_id` logo na importação dos arquivos.

### 3. Sincronização e Idempotência no Backend (`useTransactions.ts` & `auto_match_saidas`)
- Remover `ignoreDuplicates: true` para que upserts de OFX atualizem campos vivos.
- Garantir que a RPC `auto_match_saidas(p_date)` filtre e vincule compulsoriamente os débitos às contas no banco.

---

## Componentes Reutilizados (Sem criar nada novo)

- `Step2NonRevenueJustifications.tsx` — ajustado para consumir reativamente o banco e renderizar somente órfãos reais.
- `auto_match_saidas` (RPC Supabase) — mantida e aprimorada como motor canônico de 5 camadas.
- `CentralImportWizard.tsx` — orquestração de pré-match e invalidação de cache.
- `useContasAPagarImport.ts` e `useTransactions.ts` — persistência atômica.

---

## Contratos de Dados & SQL

RPC canônica existente `auto_match_saidas(p_date date)`:
```sql
-- Atualiza daily_manual_bills.matched_ofx_id = ofx.id
-- Atualiza ofx_transactions.matched_bill_id = bill.id
```

Query reativa no Frontend (`Step2NonRevenueJustifications.tsx`):
```sql
SELECT * FROM ofx_transactions
WHERE target_date = :targetDate
  AND type = 'out'
  AND matched_bill_id IS NULL;
```

---

## Risco Principal e Mitigação

- **Risco:** Débito de valor repetido (ex: duas contas de R$ 599,00 da Oficina Inteligente em filiais distintas) casar com a loja errada.
- **Mitigação:** Prioridade 1 para match com a mesma filial (`store_id`), e match fuzzy de texto de favorecido/descrição na Camada 2 antes de qualquer fallback global.

---

## Cenários de Verificação

### Cenário 1: Pasta 31-08 (52 débitos OFX × 47 Contas a Pagar)
- Ingestão dos arquivos de `C:\Users\admin\Desktop\conciliacao\31-08`.
- Motor roda: 44 débitos casados automaticamente.
- Passo 5 exibe **apenas as 3 ou 4 saídas realmente órfãs** (ex: Tarifas bancárias R$ 9,14, Sispag sem boleto).
- 44 contas casadas NÃO aparecem na lista de órfãos.

### Cenário 2: Justificativa de Saída Órfã Residual
- Operador clica em *"Despesa Extra / Adicionar ao Contas"* para uma tarifa bancária órfã de R$ 9,14.
- Transação é resolvida via RPC `resolve_orphan_saida_ofx` e some da lista imediatamente.
- Lista fica zerada: *"100% Conciliado"*.
