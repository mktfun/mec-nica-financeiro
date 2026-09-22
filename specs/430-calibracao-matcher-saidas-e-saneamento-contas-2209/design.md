# SDD Design — Spec 430: Calibração do Matcher de Saídas, Correção do 400 Bad Request e Conciliação Loja a Loja 22/09

## 1. Arquitetura de Fluxo de Pareamento e Desvinculação

```
Transação OFX (Saída / Débito)
       │
       ▼
 [Verificação de Pareamento]
  ├── 1. Código Externo / FITID exato ───────► Match Automático (100%)
  ├── 2. Mesma Filial + Valor + Token Nome ──► Match Automático (95%)
  ├── 3. Matriz / Holding + Valor + Token ───► Match Automático (90%)
  └── 4. Nomes Divergentes (ex: Henrique != Daniel) ──► NÃO CASAR (Órfão Pendente)
       │
       ▼
  [Ação do Usuário no Modal]
  ├── Define "Pró-labore" ou categoria avulsa
  ├── Anula `matched_bill_id = null` no OFX
  ├── Libera `daily_manual_bills.matched_ofx_id = null` da conta anterior
  └── Cria conta avulsa em `daily_manual_bills` (para somar no Subtotal de Contas)
```

---

## 2. Cenários Obrigatórios

### Happy Path (Edição de Justificativa e Desvinculação)
1. O usuário abre o detalhe da transação `- R$ 5.000,00` de *Luis Henrique Alves da Silva*.
2. A transação não está casada erroneamente com *Cartão Daniel*.
3. O usuário seleciona a categoria *"Pró-labore"* com impacto no subtotal de contas.
4. O sistema grava `manual_category = 'Pró-labore'`, assegura `matched_bill_id = null` e cria um registro correspondente em `daily_manual_bills` com `amount = 5000` e `contabilizar_no_subtotal = true`.
5. A UI renderiza estritamente o badge roxo de *"Pró-labore"* sem vestígios de *"Conta: CARTAO DANIEL"*.
6. O subtotal de contas a pagar do dia é incrementado em R$ 5.000,00.

### Edge Case (Pagamento Centralizado de Cartão C6)
1. A fatura consolidada de R$ 116.209,60 é debitada na conta da Brasicar (`brasicar.ofx`).
2. O sistema reconhece o lote de contas C6 rateadas pelas filiais (Mauá, Piraporinha, etc.).
3. As contas das filiais são marcadas como quitadas via fatura centralizada, sem gerar débito órfão individual nas lojas onde não houve movimentação bancária.

---

## 3. Critérios de Aceitação Verificáveis

1. **Eliminação do Erro 400:** O console não apresenta nenhuma requisição com falha `400 Bad Request` para `daily_manual_bills`.
2. **Zero Falsos Casamentos por Valor:** Transações com favorecidos diferentes nunca são associadas automaticamente via `auto_match_saidas` ou `expenseMatcher.ts`.
3. **Persistência de Justificativa Manual:** Ao editar a categoria de uma transação de débito, o badge reflete fielmente a categoria selecionada e o valor impacta as contas pagas do dia.
4. **Terminal Gate:** `npm run build` conclui com exit code 0 sem erros de TypeScript.

---

## 4. Cenários de Teste

1. **[SCAN -> VERIFY] Teste de Carga e Query de `daily_manual_bills`:**
   - Executar query com `match_status` e confirmar retorno 200 com array de contas.
2. **[INFER -> FIX] Teste do Pareador com Nomes Divergentes:**
   - Submeter débito de R$ 5.000 de "Luis Henrique" contra conta de R$ 5.000 de "Cartão Daniel" e comprovar que o status permanece `unmatched`.
