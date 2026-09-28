# Design Técnico — Spec 440: Rede × OS Isolamento Temporal e Matcher Canônico

## Arquitetura de Fluxo

O sistema adota a separação estrita de duas pernas contábeis que anteriormente estavam acopladas erroneamente:

```
[ARQUIVO REDE (XLSX / CSV)]
         │
         ▼
[PARSER: parseRedeFile]
   Extrai: date (venda), grossAmount, interest (MDR), netAmount, creditDate (banco), nsu, auth
         │
         ▼
[INGESTÃO: CentralImportWizard]
   pos_transactions:
     - target_date = effectivePosDate (data real da venda)
     - occurred_at = item.date
     - gross_amount = bruto cobrado do cliente
     - fee_amount = MDR retido
     - amount = netAmount (líquido)
     - settlement_status = 'a_compensar' (INICIAL)
     - import_batch_id = batchId
         │
         ├────────────────────────────────────────┬────────────────────────────────────────┐
         ▼                                        ▼                                        ▼
[PERNA 1: OPERACIONAL (REDE x OS)]    [PERNA 2: LIQUIDAÇÃO (REDE x OFX)]       [VISUALIZAÇÃO UI]
   RPC: auto_match_daily_transactions    Motor de Reconciliação Bancária        StoreCartaoMaquininhaView
   - Compara gross_amount com            - Compara net_amount na data           - Filtro estrito:
     credit_value / debit_value            de crédito (D+1 ou D+30) com           target_date = date
   - Mesma loja e mesma data               crédito no extrato OFX               - Rótulos exatos:
   - Unicidade estrita                   - Transiciona settlement_status          Bruto / MDR / Líquido
   - Atualiza patio_os.paid_value          de 'a_compensar' para                - Sugestão com motivo
     pelo bruto (se pendente)              'entrou' / 'liquidado'                 e sem auto-baixa errônea
   - JAMAIS altera settlement_status
```

### Contrato Monetário Rigoroso

$$\text{gross\_amount} = \text{Valor cobrado do cliente (abate a OS)}$$
$$\text{fee\_amount} = \text{MDR / Taxa de antecipação}$$
$$\text{net\_amount} = \text{gross\_amount} - \text{fee\_amount} \quad (\text{Liquidação bancária no OFX})$$

- A OS é satisfeita pelo montante que o cliente desembolsou (`gross_amount`). A taxa MDR é um custo da empresa, não uma dívida do cliente.
- `patio_os.paid_value` não pode ser abatido por `net_amount`, pois geraria um resíduo falso idêntico à taxa MDR.
- O vínculo com a OS não implica dinheiro na conta bancária. `settlement_status` deve permanecer `a_compensar` até a conciliação com o extrato OFX.

---

## Design System & UI Standards

Em conformidade com `DESIGN.md` e a regra de Zinc-950:
- **Zero classes arbitrárias:** Proibido `bg-[#...]` ou `bg-zinc-800`/`bg-zinc-950` literais. Utilizar tokens semânticos:
  - Backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-secondary`, `bg-popover`.
  - Bordas: `border-border` ou `border-border/40`.
  - Textos: `text-foreground`, `text-muted-foreground`, `text-primary`.
- **Hierarquia de Elevação:**
  - Nível 0 (Canvas/View): `bg-background`
  - Nível 1 (Cards da Tabela): `bg-card border border-border/50`
  - Nível 2 (Modal de Vínculo Manual): `bg-popover border border-border shadow-xl`
- **Feedback Visual e Acessibilidade:**
  - Badges explicativos de status: "A Compensar" (âmbar), "Liquidado no Banco" (esmeralda), "Casado com OS" (azul).
  - Indicação explícita dos três valores da transação de cartão no modal: Bruto, MDR e Líquido.

---

## Interfaces TypeScript Reais

```typescript
// Extraído de src/lib/parsers/redeParser.ts
export interface RedeTransaction {
  storeName: string;
  establishment?: string;
  method: 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Outros';
  grossAmount: number;
  netAmount: number;
  interest: number;
  date: string;
  creditDate?: string;
  batchNumber?: string;
  prazoDays?: number;
  transactionType?: 'venda' | 'devolucao';
  nsu?: string;
  authorization?: string;
  tid?: string;
  time?: string;
  brand?: string;
}

// Representação de Linha em StoreCartaoMaquininhaView.tsx
export interface PosCardViewRow {
  id: string;
  data: string;
  hora: string;
  bandeira: string;
  payment_method: string;
  rede_bruto: number;
  taxa_mdr: number;
  rede_liquido: number;
  status_conciliacao_os: 'vinculado' | 'pendente' | 'colisao';
  matched_os_number: string | null;
  os_detalhes: {
    numero: string;
    cliente: string;
    placa: string;
    total: number;
    valor_pago: number;
    status: string;
  } | null;
  settlement_status: 'a_compensar' | 'entrou' | 'divergente';
  is_settled: boolean;
}

// Payload de Execução da RPC Canônica
export interface AutoMatchDailyResult {
  matched_pos_count: number;
  matched_pix_count: number;
  collisions_count: number;
  collisions_detail: Array<{
    pos_id: string;
    store_id: string;
    gross_amount: number;
    candidate_os_numbers: string[];
    reason: string;
  }>;
  saidas_result?: {
    matched_saidas_count: number;
  };
}
```

---

## Cenários Obrigatórios

### Happy Path: Venda Única Visa R$ 2.286,00 em 24/09
1. Arquivo Rede de 24/09 contém venda Visa com:
   - Data da venda: `2026-09-24`
   - `gross_amount`: 2286.00
   - `fee_amount`: 209.85
   - `net_amount`: 2076.15
   - Filial: Floresta
2. Ingestão grava `pos_transactions` com `target_date = '2026-09-24'` e `settlement_status = 'a_compensar'`.
3. No banco, `patio_os` contém a OS #40394 com `store_id = Floresta`, `credit_value = 2286.00` e nenhuma outra OS na mesma filial com esse valor.
4. A RPC `auto_match_daily_transactions('2026-09-24')` identifica exatamente 1 candidata.
5. Vínculo realizado:
   - `pos_transactions.matched_os_number = '40394'`
   - `patio_os.match_status = 'MATCHED'`
   - Se OS estava pendente, `paid_value = total_value` (baseado no bruto 2286.00) e `status = 'finalizada'`
   - Registro criado em `conciliation_matches`
   - `settlement_status` permanece `a_compensar`.
6. Na UI de 24/09, a venda aparece casada com a OS #40394, cliente Claudio Santos Antunes, e status bancário "A Compensar".

### Edge Case 1: Lote Multi-Dia (Vazamento de 22/09 e 23/09)
- Arquivo importado em 24/09 contém vendas com data operacional `2026-09-22`, `2026-09-23` e `2026-09-24`.
- **Comportamento Esperado:** Cada transação POS é gravada com seu `target_date` exato (`2026-09-22`, etc.).
- Ao abrir a conciliação de 24/09, a query filtra `target_date = '2026-09-24'`: zero linhas de 22 ou 23 aparecem na visualização de vendas de 24/09.
- As linhas de 22 e 23 ficam disponíveis em seus respectivos dias e no conciliador bancário de suas datas previstas de crédito (`expected_credit_date`).

### Edge Case 2: Colisão de Candidatas
- Duas OSs na mesma loja possuem parcela de cartão idêntica de R$ 1.570,00.
- **Comportamento Esperado:** `v_count_candidates = 2`. O matcher automático suspende a amarração para evitar falso positivo.
- O campo `matched_os_number` permanece `NULL`.
- A colisão é reportada para o modal de revisão manual com o badge explicativo de duplicidade de candidatos.

### Edge Case 3: OS Já Paga ou Finalizada
- A OS já constava com `status = 'finalizada'` e `paid_value = total_value` antes da importação da Rede.
- **Comportamento Esperado:** O matcher grava o vínculo informativo (`matched_os_number = os_number`), mas **NÃO altera** `paid_value` novamente, evitando duplicação contábil de faturamento.

### Edge Case 4: Estorno / Cancelamento
- Linha com `transaction_type = 'devolucao'` ou `gross_amount < 0`.
- **Comportamento Esperado:** Ignorada pelo auto-matcher de OS; mantida para conciliação líquida bancária.

---

## Critérios de Aceitação Verificáveis

1. **Isolamento de Data:** Transações inseridas via wizard possuem `pos_transactions.target_date` idêntico à data da venda (`effectivePosDate`).
2. **Filtro Estrito na UI:** `StoreCartaoMaquininhaView` consulta exclusivamente `target_date = date`.
3. **Casamento por Bruto:** A RPC compara `gross_amount` com `credit_value`/`debit_value`, garantindo que vendas com MDR descontado casem com o valor total da OS.
4. **Preservação de Status Bancário:** Nenhuma chamada ao matcher de OS altera `pos_transactions.settlement_status` para `'entrou'`.
5. **Rótulos Corretos no Modal:** O modal de vínculo exibe "Valor Bruto" (R$ 2.286,00), "Taxa MDR" (R$ 209,85) e "Valor Líquido" (R$ 2.076,15) sem chamar bruto de líquido.
6. **Build e Testes:** `npm run build` passa com zero erros de compilação TypeScript.

---

## Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]

### Cenário 1: Vazamento de Datas Multi-Dia
- **SCAN:** Analisar o lote de transações POS gerado pelo wizard para um arquivo contendo múltiplas datas.
- **INFER:** No código anterior, todas recebiam `target_date = targetDate` do wizard.
- **VERIFY:** Criar teste unitário passando array de transações com datas `2026-09-22`, `2026-09-23` e verificar se `txsToInsert` preserva a data individual.
- **FIX:** Definir `target_date: effectivePosDate` em `CentralImportWizard.tsx:1507`.

### Cenário 2: Matcher Bruto vs Líquido e Deduplicação
- **SCAN:** Verificar a query da RPC `auto_match_daily_transactions`.
- **INFER:** Ela utilizava `net_amount` contra `credit_value` e somava `net_amount` ao `paid_value` da OS.
- **VERIFY:** Executar cenário de teste no banco onde OS tem `credit_value = 2286.00` e POS tem `gross_amount = 2286.00` e `net_amount = 2076.15`. Confirmar que houve match e que `paid_value` atingiu 2286.00.
- **FIX:** Ajustar a RPC no PostgreSQL para usar `gross_amount` no confronto e no incremento do pagamento.
