# Design Técnico — Spec 408: Resolução da Divergência de Saldos Bancários, Dinheiro no Cofre e RPC

## 1. Arquitetura de Conciliação e Fluxo dos Ativos

### 1.1. Matriz de Ativos do Caixa Atual vs Caixa Anterior
```
┌──────────────────────────────┬─────────────┬─────────────┬──────────────┐
│ Pilar                        │ 15/09 (Ant) │ 16/09 (Hoje)│ Delta (Δ)    │
├──────────────────────────────┼─────────────┼─────────────┼──────────────┤
│ 1. OFX Bancos Positivo       │  165.433,54 │  129.709,49 │ -35.724,05   │
│ 2. Cheque Especial           │  -30.092,74 │  -23.994,58 │  +6.098,16   │
│ 3. Dinheiro no Cofre (Lojas) │        0,00 │    3.918,50 │  +3.918,50   │
│ 4. Rede a Compensar          │        0,00 │   29.198,28 │ +29.198,28   │
│ 5. Dinheiro MP (Holding)     │   19.526,00 │   19.526,00 │         0,00 │
│ 6. A Receber                 │    6.929,67 │    6.929,67 │         0,00 │
│ 7. Na Loja OS (Pátio)        │   75.549,07 │   83.423,57 │  +7.874,50   │
├──────────────────────────────┼─────────────┼─────────────┼──────────────┤
│ TOTAL ATIVOS (Caixa Atual)   │  237.345,54 │  248.710,93 │ +11.365,39   │
└──────────────────────────────┴─────────────┴─────────────┴──────────────┘
```

---

## 2. Ajustes Técnicos Propostos

### 2.1. Desbloqueio do Dinheiro no Cofre no Frontend (`ResumoDiaPanel.tsx` e `useBackendConciliacao.ts`)
- **Problema:** O código executava:
  ```tsx
  const hasDinheiroManual = Number(dinheiroMpValor || 0) > 0;
  const cashToConsolidate = hasDinheiroManual ? 0 : effectiveDinheiro;
  ```
- **Ação:**
  - Alterar para `const cashToConsolidate = effectiveDinheiro;`.
  - O Card 1 `SALDO BANCOS + DINHEIRO` exibirá **R$ 162.826,27** (129.709,49 + 3.918,50 + 29.198,28), ficando 100% idêntico ao total do modal `SaldoBancosDetailModal`.
  - Remover do sub-chip de Dinheiro no Cofre a menção `(Consol. no MP)`.

### 2.2. Correção da RPC SQL (`get_daily_reconciliation_summary`)
- **Problema:** A RPC somava todo o histórico de `store_cash_vault` da data sem filtrar status, retornando R$ 23.578,50 em vez de R$ 3.918,50.
- **Ação:**
  - Garantir o filtro estrito:
    ```sql
    WHERE entry_date = v_target_date::date
      AND status IN ('em_transito', 'pending')
    ```
    Tanto no cálculo agregado `v_dinheiro_lojas` quanto na CTE `vault_agg` do detalhamento por loja.

### 2.3. Sincronização e Reatividade de Baixa
- Ao dar baixa em uma filial no modal (`BaixaDinheiroModal`), o item passa para `depositado`, o cofre da filial zera, e o valor entra no saldo bancário.
- Enquanto NÃO houver baixa (as 3 lojas pendentes), o dinheiro permanece como "Dinheiro no Cofre" (R$ 3.918,50) somando no Card 1 sem sumir nem duplicar.

