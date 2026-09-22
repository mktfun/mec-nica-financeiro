# Spec 426 — Design: Blindagem Operacional de Cartões REDE 100% A Compensar por Filial

## 1. Arquitetura de Fluxo de Dados

```
[Upload de Arquivos da REDE]
          │
          ▼
[CentralImportWizard: Ingestão de Cartões]
• Todas as vendas salvas em pos_transactions com settlement_status = 'a_compensar'
          │
          ▼
[Etapa 4.1: Conciliação Determinística de Cartões]
• NÃO BAIXA VENDAS COMO 'entrou'
• Vendas REDE permanecem 100% como 'a_compensar'
• Log: "💳 Conciliação de Cartões: 100% das vendas REDE mantidas A Compensar"
          │
          ▼
[useBackendConciliacao & get_daily_reconciliation_summary]
• Consulta pos_transactions com settlement_status IN ('a_compensar', 'nao_entrou')
• Apura nao_entrou_valor para TODAS as filiais com vendas REDE
• v_cartoes_a_compensar computa o total integral (~R$ 43.570,34 em 18/09)
          │
          ▼
[SaldoBancosDetailModal: Raio-X de Saldos Bancários]
• Todas as filiais com cartão exibem o valor verde em "A Compensar"
• Total geral da coluna "A Compensar" bate exatamente com as maquininhas
• Caixa Atual e Ativos Reais balanceados -> Diferença Final converge para ~R$ 0,00
```

---

## 2. Design System & UI Standards
- **Modal de Raio-X (`SaldoBancosDetailModal.tsx`):**
  - Coluna "A Compensar": Valor em verde com badge `text-emerald-400 bg-emerald-500/10 border-emerald-500/30`.
  - Badge de Status: Lojas com cartão a compensar recebem badge `A COMPENSAR` ou `COM DINHEIRO / CARTÃO`.
  - Proibido exibir `-` ou `CONCILIADO` para filiais que possuem vendas líquidas de maquininha em aberto.
- **Paleta Canônica:** `bg-background` (Zinc-950), `bg-card` (Zinc-900), `border-border`. Zero classes arbitrárias.

---

## 3. Interfaces TypeScript Reais

```typescript
export interface StoreReconciliationPosSummary {
  storeId: string;
  storeName: string;
  saldoOfxPuro: number;
  dinheiroLoja: number;
  maquininhaNaoEntrou: number; // 100% das vendas Rede em aberto
  saldoConsolidado: number;
  statusCompensacao: 'a_compensar' | 'nao_entrou' | 'entrou' | 'sem_movimento';
}

export interface RedeReconciliationPolicy {
  preserveUnsettledStatus: boolean; // true = 100% a compensar
  targetDate: string;
}
```

---

## 4. Cenários Obrigatórios

### Happy Path
1. O operador realiza o upload dos relatórios de conciliação de 18/09 (REDE, OFX, Contas, OSs).
2. Na Etapa 4.1 do wizard:
   - Todas as vendas da REDE são cadastradas em `pos_transactions` com `settlement_status = 'a_compensar'`.
   - O motor determinístico não marca nenhuma venda como `entrou`.
   - O log informa: `💳 Conciliação de Cartões: 100% das vendas REDE mantidas A Compensar (R$ 43.570,34 em aberto)`.
3. Ao abrir o modal "Raio-X de Saldos Bancários & Dinheiro por Filial":
   - Dom Pedro: R$ 4.126,11
   - Jabaquara: R$ 8.480,59
   - Rei do Módulo: R$ 9.209,93
   - Rudge Ramos: R$ 12.192,81
   - Jorge Beretta: R$ 6.357,40
   - Santo André: R$ 3.203,50
   - Demais filiais com seus respectivos valores.
   - Total da coluna "A Compensar": R$ 43.570,34.
4. O valor do Ativo no Caixa Atual incorpora os R$ 43.570,34 integrais, eliminando a divergência de R$ 30.963,64.
5. O fechamento do dia aprova com diferença final dentro da tolerância contábil.

### Edge Case
1. **Filial sem nenhuma venda de cartão no dia (ex: Piraporinha em 18/09):**
   - O sistema define `maquininhaNaoEntrou = 0`, status `sem_movimento` e exibe `-` na coluna de compensação sem gerar erros.
2. **OFX do dia possui créditos com descrição "REDE" de vendas de dias anteriores:**
   - Esses créditos já estão compondo o `saldo_banco_ofx` oficial da filial no extrato. O sistema não tenta abater as vendas de hoje contra esses créditos de ontem/semana passada, mantendo a segregação de competência.

---

## 5. Critérios de Aceitação Verificáveis
1. **Zero Mutações para `entrou` no Wizard:** `CentralImportWizard.tsx` não executa `.update({ settlement_status: 'entrou' })` em vendas da data alvo.
2. **Todas as Lojas com Cartão no Raio-X:** As 6 filiais com vendas REDE em 18/09 exibem seus valores respectivos na coluna "A Compensar" do modal de Raio-X.
3. **Paridade no Sandbox:** `sandboxCalculator.ts` mantém `nao_entrou_valor = rede.liquido` para filiais com movimento.
4. **Terminal Gate:** `npm run build` compila com exit code 0.

---

## 6. Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]
- **Teste 1: Verificação da Ingestão de Cartões:**
  - SCAN: Analisar o fluxo de `pos_transactions` no wizard.
  - INFER: Todas as vendas inseridas devem manter `settlement_status = 'a_compensar'`.
  - VERIFY: Código do wizard confirma ausência de mutação cega para `entrou`.
  - FIX: Reverter qualquer marcação acidental para `a_compensar`.
- **Teste 2: Verificação do Modal de Raio-X:**
  - SCAN: Componente `SaldoBancosDetailModal.tsx`.
  - INFER: Lojas com `rede_liquido > 0` devem apresentar `maquininhaNaoEntrou = rede_liquido`.
  - VERIFY: Inspeção de cálculo garante fallback seguro para `redeLiquidoVal`.
