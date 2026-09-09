# Proposal: Motores de Match Decoupling, Baixa de Lote Automática e Sanidade Contábil de "Entrou vs Não Entrou" (382)

## Problema
A conciliação financeira diária apresenta falhas críticas de casamento e inconsistências graves de caixa após finais de semana, feriados prolongados (ex: 08/09 pós-Independência) e na apuração de "Entrou vs Não Entrou":

1. **Filtro Cego de Data em [autoMatchingEngine.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/matchers/autoMatchingEngine.ts#L145-L148):**  
   O motor atual descarta transações onde `tx.date !== targetDate`. Ao conciliar uma terça-feira pós-feriado (08/09), **100% das vendas de sexta (04/09), sábado (05/09) e domingo (06/09) são eliminadas sumariamente**.
2. **Inexistência de Match Rede x OFX no Motor e Roleta-Russa no SQL:**  
   O [autoMatchingEngine.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/matchers/autoMatchingEngine.ts) não possui lógica de pareamento entre o relatório de vendas da Rede e os depósitos bancários no OFX. A tentativa em SQL (`auto_match_transactions`) é um loop guloso acumulador de 3 dias que gera entre 45% e 65% de falsos positivos, casando vendas de crédito de semanas à frente para cobrir depósitos de débito de hoje.
3. **Hardcode de `cartao_nao_entrou = 0` e Ativo Fantasma no Módulo 1:**  
   Em [useConciliacao.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useConciliacao.ts#L603-L604), `cartao_entrou` é cravado como a soma cega das vendas da maquininha do dia, e `cartao_nao_entrou` é forçado para `0`. Como cartão de débito é D+1 e crédito é D+30, no dia da venda o dinheiro não está no banco. O faturamento sobe hoje, o caixa omite o direito a receber, e o sistema acusa falsas divergências de mais de R$ 25.000 no fechamento diário ($G31$).
4. **Splice Cego e Rejeição de PIX Retroativo:**  
   PIX recebidos no fim de semana constam no extrato de terça-feira com data no memo (`PIX RECEBIDO ROBERT 05/09`), mas são rejeitados pelo filtro de data. No frontend, um `findIndex` por valor puro sem validação de cliente (`useConciliacao.ts:L575-L580`) rouba matches entre clientes e filiais diferentes.
5. **Retenções de Aluguel de POS na Fonte:**  
   A Rede retém no início do mês tarifas de aluguel de terminais (R$ 119 ou R$ 238), fazendo o depósito bancário ser menor que a soma do lote líquido e quebrando a tolerância de R$ 0,05.

---

## Solução Proposta (Foco em Reuso e Correção)

Implementar as diretrizes aprovadas por consenso unânime no **Conselho Deliberativo Multi-Agente ([GO])**:

1. **Desacoplamento Temporal em 2 Pernas (Two-Legged Matching):**
   - **Perna Operacional (OS x Venda POS):** Casamento ancorado na **Data da Realização da Venda** (`occurred_at` / `sale_date`), com janela de tolerância de até 3 dias ($D-3$ a $D$) para cobrir OSs de sábado/domingo.
   - **Perna Financeira (Lote Rede x Depósito OFX):** Casamento ancorado na **Data Prevista de Crédito** (`expected_credit_date`), calculada saltando fins de semana e feriados bancários nacionais (FEBRABAN 2026).
2. **Baixa de Lote Automática Determinística $O(n)$ via Hash Grouping:**
   - Agrupar as vendas da Rede em lotes por `(store_id, expected_credit_date, modalidadeCode)`.
   - Casamento $O(1)$ com os créditos de adquirente do OFX do dia. Ao casar, baixa em cascata atômica todas as micro-vendas filhas do lote como liquidadas no banco (`settlement_status = 'entrou'`).
3. **Reconhecimento Automático de Dedução de Aluguel de POS (`KNOWN_POS_RENTAL_FEES`):**
   - Se o depósito bancário for menor que a soma líquida do lote exatamente por um valor contratual de aluguel de POS (ex: R$ 119,00, R$ 238,00), o sistema fecha o match integralmente e lança automaticamente a diferença como despesa de taxas de maquininha (`juros_rede` / contas pagas).
4. **Sanidade Contábil do "Entrou vs Não Entrou" no Módulo 1:**
   - Eliminar o hardcode `cartao_nao_entrou: 0`.
   - `cartao_entrou`: Soma dos lotes de cartão efetivamente identificados e baixados no extrato bancário de hoje (`SUM(ofx.amount)` vinculados).
   - `cartao_nao_entrou`: Soma dos lotes com `creditDate <= targetDate` confirmados na máquina que ainda não caíram no banco (Créditos em Trânsito a Compensar).
   - Prova matemática de balanço zero: $\Delta G21 = 0, \Delta G23 = 0, \Delta G31 = 0$.
5. **Motor OS (PIX) x OFX com Regex de Data e Tokens de Cliente:**
   - Extrair a data do memo bancário (`05/09`) via regex e admitir janela $D-3$ a $D$, validando obrigatoriamente a contraparte com `matchClientTokens`.

---

## Investigação e Análise de Reuso (Relatório do Conselho & Grafo)

- **Código Existente Reutilizado:**
  - `src/lib/matchers/autoMatchingEngine.ts`: Reutilizar e estender o motor principal, mantendo `matchClientTokens`, `extractDocDigits` e `normalizeText`.
  - `src/lib/parsers/redeParser.ts`: Estender a extração para capturar `prazo`, `lote` e `data do crédito` que já existem no layout Excel da Rede.
  - `src/lib/modulo1Calculations.ts`: Reutilizar a fórmula canônica já estabelecida, garantindo que `cartao_nao_entrou` seja alimentado dinamicamente.
  - `src/hooks/useConciliacao.ts`: Corrigir `useDailyConciliacao` e `useReconciliationViews`, eliminando linhas hardcoded e loops gulosos.
- **Justificativa para Não Criação de Novas Tabelas:**
  - Todas as entidades necessárias (`pos_transactions`, `ofx_transactions`, `patio_os`) já possuem colunas suficientes (`matched_ofx_id`, `settlement_status`, `target_date`, `occurred_at`, `credit_date`). Nenhuma nova migration destrutiva é necessária.

---

## Contratos de Dados & Estruturas Afetadas

### 1. `RedeTransaction` ([redeParser.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/parsers/redeParser.ts#L6-L19))
```typescript
export interface RedeTransaction {
  storeName: string;
  method: 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Outros';
  grossAmount: number;
  netAmount: number;
  interest: number;
  date: string;                  // Data da realização da venda (occurred_at)
  creditDate: string;            // Data prevista de liquidação bancária (expected_credit_date)
  batchNumber?: string;          // Resumo de vendas / Lote (ex: 76549981)
  prazoDays?: number;            // Prazo contratual em dias úteis
  transactionType?: 'venda' | 'devolucao';
  nsu?: string;
  authorization?: string;
  tid?: string;
  time?: string;
}
```

### 2. Hash Grouping de Lotes ([autoMatchingEngine.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/matchers/autoMatchingEngine.ts))
```typescript
export interface RedeSettlementBatch {
  id: string;
  storeId: string;
  creditDate: string;
  modality: 'DB' | 'AT' | 'CRED' | 'OUTROS';
  batchNumber?: string;
  totalGross: number;
  totalNet: number;
  feeAmount: number;
  transactionCount: number;
  txIds: string[];
  matchedOfxId?: string;
  status: 'pendente' | 'liquidado';
  feeDeducted?: number; // Aluguel POS ou tarifa retida na fonte
}
```

---

## Mutações em Arquivos [MODIFY]

1. **[MODIFY] `src/lib/parsers/redeParser.ts`:**
   - Adicionar extração de colunas de lote (`lote`, `resumo de vendas`), prazo (`prazo`) e data de crédito (`data do crédito`, `data prevista`).
   - Adicionar função utilitária `calculateExpectedCreditDate` com a tabela `BRAZILIAN_BANK_HOLIDAYS_2026`.
2. **[MODIFY] `src/lib/matchers/autoMatchingEngine.ts`:**
   - Ajustar Fase 1 (OS x Rede): Manter `tx.date` com janela retroativa de até 3 dias ($D-3$ a $D$).
   - Implementar Fase 2 (Rede x OFX): Hash grouping $O(n)$ por lote/data de crédito, com conferência de `KNOWN_POS_RENTAL_FEES`.
   - Ajustar Fase 3 (OS (PIX) x OFX): Regex de extração de data do memo do Itaú e janela $D-3$ condicionada a `matchClientTokens`.
3. **[MODIFY] `src/hooks/useConciliacao.ts`:**
   - Em `useDailyConciliacao`: remover `cartao_nao_entrou: 0` e calcular dinamicamente.
   - Em `useReconciliationViews`: remover `redeTxs.length === 1` e remover o `splice` cego por valor puro.
4. **[MODIFY] `src/components/importacoes/manual/Fase3OfxReconciliation.tsx`:**
   - Apurar liquidação da Rede comparando os depósitos bancários contra as vendas com `creditDate == targetDate`.

---

## Risco Principal e Mitigação

- **Risco:** Alguma filial ter tarifa de aluguel de POS com valor atípico (ex: R$ 89,90) não previsto na lista padrão.
- **Mitigação:** Além da lista padrão `KNOWN_POS_RENTAL_FEES` (R$ 119, R$ 238, etc.), o sistema permite tolerância centesimal de até R$ 0,10 e exibe no modal de conciliação a divergência com botão de "Reconhecer Tarifa de POS", sem rejeitar o lote.
