# Design: Correção de Parâmetro da RPC de Maquininhas e Diagnóstico Contábil de Contas a Pagar (265)

## Arquitetura Técnica

```
Frontend: usePosTripleReconciliation(date)
    │
    └─► Supabase RPC: get_store_pos_triple_reconciliation(p_target_date: date)
            │
            ├─► pos_transactions (vendas da Rede do dia)
            ├─► transactions (lançamentos OFX com rede_*)
            └─► patio_os (pagamentos em cartão)
            │
            └─► Retorna tripla reconciliação sem erro PGRST202

Frontend: ResumoDiaPanel.tsx
    │
    ├─► Total Saldo Bancos: R$ 68.932,73 (OFX 61.456,10 + Cofre 4.888,26 + A Compensar 2.588,37)
    ├─► Caixa Atual: R$ 179.268,79 (Bancos 68.932,73 + Dinheiro MP 13.425,00 + A Receber 10.694,00 + Pátio 86.217,06)
    ├─► Caixa Anterior: R$ 151.685,17
    ├─► Fluxo de Caixa: +R$ 27.583,62
    ├─► Faturamento OI: R$ 70.721,56
    ├─► Valor Disponível p/ Contas: R$ 43.137,94 (70.721,56 - 27.583,62)
    │
    └─► Desdobramento de Contas:
          ├─ Contas da Planilha (Base): R$ 48.294,62 (36 contas)
          ├─ Despesas Avulsas (Manual): R$ 10.000,00 (1 item: prolabore daniel)
          ├─ Juros Rede: R$ 6.148,50
          └─ Subtotal Contas a Cobrir: R$ 64.443,12
          │
          └─► Diferença Final: 43.137,94 - 64.443,12 = -R$ 21.305,18
```

## Interfaces TypeScript

```typescript
export interface PosTripleReconciliationResult {
  target_date: string;
  total_rede_bruto: number;
  total_rede_taxas: number;
  total_rede_liquido: number;
  total_ofx_maquininhas: number;
  total_nao_entrou: number;
  total_devolucoes: number;
  stores: PosStoreTripleReconciliation[];
}

export interface PosStoreTripleReconciliation {
  store_id: string;
  store_name: string;
  rede_bruto: number;
  rede_taxas: number;
  rede_liquido: number;
  ofx_maquininha: number;
  nao_entrou: number;
  status: 'entrou' | 'parcial' | 'divergente';
}
```

## Componentes / Hooks / Funções

| Artefato | Localização | Responsabilidade |
|---|---|---|
| `useBackendConciliacao.ts` | `src/hooks/useBackendConciliacao.ts` | Corrigir parâmetro `{ p_target_date: date }` na RPC `get_store_pos_triple_reconciliation` |
| `ResumoDiaPanel.tsx` | `src/components/conciliacao/ResumoDiaPanel.tsx` | Detalhar no card de contas: Base Planilha + Extras Manuais + Juros = Subtotal |
| `ContasManualModal.tsx` | `src/components/conciliacao/ContasManualModal.tsx` | Gerenciar exclusão ou manutenção do pró-labore avulso de R$ 10.000,00 |

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Chamada da RPC `get_store_pos_triple_reconciliation`
- **Estado Inicial:** Usuário navega na tela de conciliação diária de 24/08/2026.
- **Ação:** Hook `usePosTripleReconciliation` executa a query.
- **Resultado Esperado:** Retorno `200 OK` com os dados da Rede (Bruto R$ 71.172,20, Líquido R$ 63.666,51, OFX R$ 64.838,82, A Compensar R$ 2.588,37) e zero erros PGRST202 no console.

### Cenário 2: Exibição Transparente do Subtotal de Contas
- **Estado Inicial:** `daily_snapshots.contas_a_pagar = 48.294,62`, `daily_manual_bills = 10.000,00`, `juros_rede = 6.148,50`.
- **Ação:** Visualizar card de Contas no `ResumoDiaPanel.tsx`.
- **Resultado Esperado:** O card exibe claramente: Contas Base R$ 48.294,62 + Avulsas R$ 10.000,00 + Juros R$ 6.148,50 = Subtotal R$ 64.443,12, justificando a diferença final de -R$ 21.305,18.

### Cenário 3: Exclusão/Ajuste do Pró-labore se não for Despesa a Pagar
- **Estado Inicial:** Conta avulsa `prolabore daniel` presente em `daily_manual_bills`.
- **Ação:** Se o usuário excluir o item no `ContasManualModal`, `contas_extras` volta a zero.
- **Resultado Esperado:** Subtotal de Contas volta para R$ 54.443,12 e a diferença final volta para -R$ 11.305,18 imediatamente.
