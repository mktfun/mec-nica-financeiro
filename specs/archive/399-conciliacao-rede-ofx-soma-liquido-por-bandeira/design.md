# Design: Conciliação Rede x OFX por Soma de Líquido por Bandeira (399)

## Arquitetura e Fluxo de Dados
```
Relatório Rede (D-1) ──┐
                       ├──> ReconciliadorRedeOFX (Agregação por Bandeira)
Extrato OFX Itaú (D0) ──┘        │
                                 ├──> Soma Líquida Mastercard vs Crédito REDE MAST
                                 ├──> Soma Líquida Visa vs Crédito REDE VISA
                                 │
                                 ▼
                     Status por Venda:
                     - Match Confirmado -> settlement_status = 'entrou'
                     - Sem Depósito     -> settlement_status = 'nao_entrou'
                                 │
                                 ▼
                     pos_transactions (store_id, target_date, brand)
                                 │
                                 ▼
           SaldoBancosDetailModal / ResumoDiaPanel
           - Dom Pedro: maquininhaNaoEntrou = 0.00
           - Saldo Consolidado = R$ 20.534,66 (Fim da duplicação!)
```

---

## Interfaces TypeScript

```typescript
export interface BrandAggregateMatch {
  brand: 'Mastercard' | 'Visa' | 'Elo' | 'Hipercard' | 'Outros';
  vendasIds: string[];
  totalLiquidoVendas: number;
  totalBrutoVendas: number;
  creditosFitids: string[];
  totalCreditoOfx: number;
  diferenca: number;
  status: 'entrou' | 'nao_entrou' | 'parcial';
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

1. **`supabase/migrations/20260911_add_brand_to_pos_transactions.sql` [NEW]**:
   - Adicionar coluna `brand` e index.
   - Atualizar views/triggers que apontam para `pos_transactions`.

2. **`src/lib/matchers/reconciliadorRedeOfx.ts` [MODIFY]**:
   - No método `executarReconciliacao()`:
     - Extrair `brand` diretamente de `s.brand` ou inferir via regex do método/NSU.
     - No Estágio 2 (Bandeira), somar **todas** as vendas líquidas da bandeira e comparar com a soma dos créditos daquela bandeira.
     - Se bater ($\le R\$ 0,05$), marcar todas as vendas como `statusMatch = true`.

3. **`src/components/importacoes/CentralImportWizard.tsx` [MODIFY]**:
   - Ao executar a reconciliação e ao persistir em `pos_transactions`, repassar explicitamente `brand: (item as any).brand`.

4. **`src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` [MODIFY]**:
   - Repassar `brand` das transações do banco ao instanciar `ReconciliadorRedeOFX`.

---

## Cenários de Verificação (SCAN -> INFER -> VERIFY -> FIX)

### Cenário 1: Dom Pedro - DP (10/09/2026)
- **Estado Inicial:**
  - Vendas Rede: 3 Mastercard (R$ 10.911,47) + 2 Visa (R$ 9.539,20) = R$ 20.450,67.
  - Créditos OFX: REDE MAST (R$ 10.911,47) + REDE VISA (R$ 9.539,20) = R$ 20.450,67.
- **Ação:** Executar reconciliação da Spec 399.
- **Resultado Esperado:**
  - Mastercard: 3 vendas marcadas como `entrou`.
  - Visa: 2 vendas marcadas como `entrou`.
  - `totalCreditadoBanco` = R$ 20.450,67, `totalNaoEntrou` = R$ 0,00.
  - Saldo Consolidado de Dom Pedro no modal de saldos = **R$ 20.534,66** (sem os 40k).

### Cenário 2: Piraporinha - EMPORIO (10/09/2026)
- **Estado Inicial:**
  - Vendas Rede Visa: R$ 4.642,10.
  - Créditos OFX: R$ 0,00.
- **Ação:** Executar reconciliação.
- **Resultado Esperado:**
  - Vendas Visa marcadas como `nao_entrou` (A Compensar).
  - `totalNaoEntrou` = R$ 4.642,10 no Saldo do Pilar 1.
