# Design: Fix Breakdown Types and Regressions (156)

## Arquitetura Técnica
A camada RPC do banco (`get_conciliation_breakdown`) entrega dados aninhados para estruturar melhor a origem.
A requisição HTTP da UI via React Query chama o Hook e esse entrega o payload agrupado para o Modal.
O fluxo de alteração é 100% Client-Side React (Consumo e Renderização):
`RPC Supabase` -> `useConciliationBreakdown (Parser Types)` -> `BreakdownModal (Render .map)`

## Interfaces TypeScript
```typescript
export interface BreakdownSection<T> {
  total: number;
  transactions: T[];
}

export interface NaLojaSection {
  total: number;
  current_month: number;
  previous_month: number;
  source?: string;
  transactions: any[];
}

export interface ConciliationBreakdownData {
  bank_total: number;
  ofx_in: BreakdownSection<OfxTransactionDetail>;
  ofx_out: BreakdownSection<OfxTransactionDetail>;
  na_loja: NaLojaSection;
  juros_rede: number;
  rede_transactions: any[];
}
```

## Componentes / Hooks / Funções
1. **src/hooks/useConciliationBreakdown.ts**
   - Responsabilidade: Atualizar a definição global da tipagem para bater com a migration instalada e evitar `undefined`.
2. **src/components/conciliacao/BreakdownModal.tsx**
   - Responsabilidade: Redirecionar os acessores de variáveis (`data.ofx_in` vira `data.ofx_in.transactions`, e `data.ofx_in_total` vira `data.ofx_in.total`).

## Fluxo de UI
Nenhuma restrição ou mudança visual nova, mantendo o padrão visual e Zinc-950 atual. O objetivo único é fazer a tabela voltar a renderizar ao clicar no botão "Raio-X de Lotes" da conciliação diária.

## Infra / Deploy
Sem necessidade de intervenção em variáveis de ambiente ou deploy de infra.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Renderização OFX IN → Abrir o modal → Tabela de Créditos OFX deve mapear `data.ofx_in.transactions` perfeitamente, listando os itens.
- **Cenário 2:** Renderização Pátio OS → Tabela de Pátio listando carros pendentes via `data.na_loja.transactions`.
