# Design: Diagnóstico Forense e Resolução Automática de Saídas e Entradas Órfãs (375)

## 1. Arquitetura de Fluxo Ponta a Ponta

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              PIPELINE DE AUTO-RESOLUÇÃO DETERMINÍSTICA                                │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. INGESTÃO E SANEAMENTO DE DATAS                                                                      │
│    - BuscaContasAPagar.xls -> parseDate() suporta serial Excel (46269 -> 2026-09-04)                   │
│    - Extratos OFX          -> Ingestão de débitos e créditos com agência/conta canônica                │
│                                                                                                        │
│ 2. MOTOR DE PAREAMENTO INTELIGENTE (PostgreSQL auto_match_saidas & TS expenseMatcher)                  │
│    ├─► CAMADA 1-A: Vínculo Exato 1-para-1 (FITID / Código de Barras / Valor Único na Loja)             │
│    │     - Títulos unitários batem com débitos unitários (ex: FEMATH, LUBEL, fornecedores).           │
│    │                                                                                                   │
│    ├─► CAMADA 1-B: Vínculo em Lote 1-para-N (SISPAG SALÁRIOS)                                          │
│    │     - Débito OFX com 'SISPAG' ou 'SALARIO'                                                        │
│    │     - Agrupa títulos de salários abertos da MESMA FILIAL (ex: 4 colaboradores somam R$ 6.061,13) │
│    │     - Se SUM(salários) = Débito OFX: vincula todos os títulos e marca 'matched_batch'.            │
│    │                                                                                                   │
│    ├─► CAMADA 1-C: Pareamento Intercompany Espelhado (Transferência entre Lojas)                       │
│    │     - Débito Loja A (R$ 6.000 -> Brasicar) <---> Crédito Loja B (R$ 6.000 <- Empório do Óleo)     │
│    │     - Auto-justifica ambos como 'Transferência Entre Lojas [Apenas Conciliar]'.                   │
│    │                                                                                                   │
│    └─► CAMADA 1-D: Auto-Cancelamento Bloqueio / Desbloqueio PIX                                        │
│          - Débito R$ 900 (Bloqueio) + Crédito R$ 900 (Desbloqueio) na mesma conta -> Estorno nulo.    │
│                                                                                                        │
│ 3. FILA DE REVISÃO LIMPA (Step 2 - Justificativas)                                                     │
│    - Saques ATM pré-classificados como 'Retirada de Sócios / Sangria' (adicionaNoContas: false).       │
│    - Zero falsos fornecedores avulsos no Contas a Pagar.                                               │
│    - Somente PIXs legítimos sem OS aparecem como Entradas Órfãs reais.                                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Interfaces TypeScript Reais

```typescript
// Estrutura de Lote de Salários SISPAG Casado
export interface SispagBatchMatchResult {
  ofxDebitId: string;
  ofxFitid: string;
  storeId: string;
  storeName: string;
  debitAmount: number;
  matchedBills: Array<{
    id: string;
    externalCode?: string;
    employeeName: string;
    amount: number;
  }>;
  totalBillsAmount: number;
  divergence: number;
  confidence: number;
}

// Pareamento Intercompany Espelhado
export interface IntercompanyTransferPair {
  debitTxId: string;
  debitStoreId: string;
  debitStoreName: string;
  creditTxId: string;
  creditStoreId: string;
  creditStoreName: string;
  amount: number;
  date: string;
  matchedReason: string;
}

// Resposta Estendida do Motor de Matching
export interface EnhancedMatchingSummary {
  totalDebits: number;
  exactOneToOneMatches: number;
  sispagBatchMatches: number;
  sispagResolvedBillsCount: number;
  intercompanyPairedCount: number;
  pixLockCancelledCount: number;
  remainingOrphanOutflows: number;
  remainingOrphanInflows: number;
}
```

---

## 3. Cenários Obrigatórios

### Happy Path (Cenário Nominal Completo)
1. O usuário sobe a pasta `08/09/2026` contendo os 10 arquivos OFX e `BuscaContasAPagar.xls`.
2. O parser extrai as datas seriais `46269` como `2026-09-04` sem falha.
3. O motor identifica os 8 débitos de SISPAG (R$ 5.053,00 em Rudge, R$ 2.960,61 em Jorge Beretta, R$ 4.753,00 em Piraporinha, R$ 6.061,13 em Santo André, R$ 4.477,44 em Jabaquara, R$ 7.851,00 em Kennedy, R$ 2.213,00 em Planalto e R$ 680,48 em Dom Pedro).
4. O motor soma os salários de cada loja e encontra equivalência exata (diferença <= R$ 0,05) para todos os 8 débitos, vinculando os 23 colaboradores automaticamente.
5. O motor identifica as 3 transferências intercompany (R$ 6.000, R$ 4.000, R$ 4.000) e o bloqueio/desbloqueio PIX de R$ 900, auto-classificando-os como transferências e estornos internos sem impacto em faturamento nem em despesas extras.
6. A tela de Justificativas abre com:
   - **Saídas Órfãs**: apenas 8 (os 7 saques ATM já pré-selecionados para `Retirada / Sangria` sem adicionar no Contas, mais 1 seguro bancário de R$ 87,84).
   - **Entradas Órfãs**: apenas 2 (os depósitos avulsos de clientes Sara Sales R$ 3.500 e Tania Borali R$ 1.640,30).
7. Nenhuma duplicata de input manual de OS aparece.

### Edge Case (Cenário de Exceção)
1. O débito de SISPAG no extrato bancário diverge do total da folha no ERP por centavos (ex.: arredondamento bancário de R$ 0,08 ou diferença de taxa de emissão de R$ 1,00).
2. O motor aplica a tolerância estrita de até R$ 0,10. Se a diferença for superior (ex: um funcionário foi pago por PIX avulso fora do SISPAG), o motor **NÃO FORÇA** o casamento cego do lote.
3. Nesse caso, os funcionários individuais que tiveram PIX unitário são casados pela Camada 1 (1-para-1), e o residual do SISPAG é destacado com clareza na interface: *"Lote SISPAG parcial: R$ 4.753,00 debitado no banco vs R$ 3.254,00 em títulos encontrados"*, permitindo conciliação assistida sem corrupção de dados.

---

## 4. Critérios de Aceitação Verificáveis

1. **Parser de Datas Excel**:
   - Títulos com `Dt. Pgto = 46269` são ingeridos com `payment_date = '2026-09-04'`.
   - Títulos com `Dt. Pgto = 46270` são ingeridos com `payment_date = '2026-09-05'`.
   - `targetDate` da importação de contas não regride para a data do sistema.
2. **Resolução de Lotes SISPAG**:
   - Os 8 lotes SISPAG dos extratos de 08/09/2026 casam com os títulos de salários de suas respectivas lojas.
   - 23 títulos de colaboradores têm `matched_ofx_id` preenchido.
   - Nenhuma saída de SISPAG aparece como órfã no Step 2.
3. **Pareamento Intercompany**:
   - O débito de R$ 6.000 em Piraporinha e o crédito de R$ 6.000 em Planalto são marcados como pareados.
   - Os débitos de R$ 4.000 em Kennedy casam com os créditos em Mauá e Santo André.
   - Nenhuma dessas 6 pontas exige justificativa manual como nova despesa ou receita.
4. **Proteção de Saques ATM**:
   - Débitos com memo `SAQUE DIN ATM CART001008` recebem categoria `Retirada de Sócios / Sangria / Saque em Dinheiro` e `adicionaNoContas = false`.
5. **Contagem na UI**:
   - Para os arquivos de 08/09/2026, a aba *Saídas Órfãs* exibe exatamente 8 itens (não 20).
   - A aba *Entradas Órfãs* exibe exatamente 2 itens (não 6).
6. **Build e Testes**:
   - `npm run build` executa com sucesso com zero erros de TypeScript.

---

## 5. Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]

### Teste 1: Lote SISPAG Salários Santo André (R$ 6.061,13)
- **SCAN**: Extrato de Santo André (`Extrato_8813_994293_08-09-2026.ofx`) contém débito `-6061.13 SISPAG SALARIOS`. Planilha de contas possui 4 títulos para `MPSantoAndre`: Caio R$ 1.787,06 + Alessandro R$ 1.331,01 + Allan R$ 1.579,94 + Gabriel R$ 1.363,12.
- **INFER**: 1.787,06 + 1.331,01 + 1.579,94 + 1.363,12 = R$ 6.061,13. O motor infere que o débito de R$ 6.061,13 é o lote consolidador desses 4 pagamentos.
- **VERIFY**: Os 4 títulos recebem o mesmo `matched_ofx_id`. O débito OFX recebe `matched_bill_id = 'BATCH_SISPAG'`. O contador de saídas órfãs decrementa em 1 e nenhum dos 4 salários fica pendente.
- **FIX**: Se houver título de outra filial envolvido no SISPAG (holding), permitir agregação de `store_id = 'master'` caso a soma da filial isolada seja insuficiente.

### Teste 2: Pareamento de Transferência Piraporinha -> Planalto (R$ 6.000,00)
- **SCAN**: Piraporinha (`7386_162601`) tem débito de `-6000 PAGAMENTOS BRASICAR`. Planalto (`7386_166586`) tem crédito de `+6000 RECEBIMENTOS EMPORIO DO OLEO`.
- **INFER**: Trata-se da mesma transferência interna intercompany de R$ 6.000 entre filiais do mesmo grupo.
- **VERIFY**: Ambos recebem `manual_category = 'Transferência Entre Lojas [Apenas Conciliar]'`, `contabilizar_no_subtotal = false` e são removidos das filas de órfãos a justificar.
- **FIX**: Garantir que se a transferência ocorrer entre dias úteis adjacentes (ex: sexta e segunda), a janela temporal de pareamento aceite tolerância de até 4 dias para finais de semana e feriados.
