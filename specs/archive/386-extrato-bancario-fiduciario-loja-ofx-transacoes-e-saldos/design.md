# Design: Extrato Bancário Fiduciário Completo da Filial (386)

## Arquitetura e Fluxo de Dados
```
[Banco de Dados]
  ├── transactions (View / ofx_transactions) -> Transações com import_batch_id, occurred_at, title, amount
  └── reconciliations (Tabela) -> previous_balance (Saldo Inicial), bank_total (<LEDGERBAL>)
        │
        ▼
[Hook: useStoreExtratoBancario(storeId, date)]
  ├── Consulta 1: reconciliations -> extrai previous_balance e bank_total
  ├── Consulta 2: transactions (filial + data alvo ou import_batch_id correspondente ao extrato)
  └── Computa: totais do dia, totais do lote, marcadores de saldo e reconciliação matemática
        │
        ▼
[Componente: StoreExtratoBancarioView.tsx]
  ├── Hero Summary Cards: Saldo Anterior | Entradas | Saídas | Líquido | Saldo Final Oficial (<LEDGERBAL>)
  ├── View Mode Segmented Control: [Extrato Completo do OFX] vs [Apenas Fechamento do Dia (09/09)]
  └── Tabela Canônica:
        ├── Linha Especial Topo: SALDO ANTERIOR (05/09/2026: +R$ 412,78)
        ├── Linhas de Transações (Data, Tipo, Memo/Favorecido Completo, Valor, Badge de Status, Ações)
        ├── Marcador de Virada de Dia (ex: Saldo 08/09: -R$ 8.150,02)
        └── Linha Especial Rodapé: SALDO FINAL CONTA CORRENTE (<LEDGERBAL>: -R$ 5.659,95)
```

## Interfaces TypeScript
```typescript
export type ExtratoViewMode = 'lote_ofx' | 'dia_fechamento';

export interface StoreExtratoSummary {
  previousBalance: number;
  bankTotal: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoLiquido: number;
  dataSaldoAnterior?: string;
  dataSaldoFinal?: string;
  isBatido: boolean;
}

export interface EnrichedExtratoTransaction {
  id: string;
  occurred_at: string;
  target_date: string;
  title: string;
  subtitle?: string | null;
  counterpart_name?: string | null;
  cnpj_cpf?: string | null;
  fitid?: string | null;
  amount: number;
  type: 'in' | 'out';
  source?: string | null;
  isRede: boolean;
  osNum?: string | null;
  manual_category?: string | null;
  manual_justification?: string | null;
  isMatchedExpense: boolean;
  isLockedFromOtherDate: boolean;
  isPending: boolean;
  isBalanceMarker?: boolean; // Para linhas como SALDO TOTAL DISPONÍVEL DIA
}
```

## Mutações em Arquivos Existentes

### 1. [EXTEND] `src/hooks/useTransactions.ts`
- Adicionar hook `useStoreExtratoBancario`:
  ```typescript
  export function useStoreExtratoBancario(date: string, storeId: string) {
    return useQuery({
      queryKey: ['store-extrato-bancario', storeId, date],
      queryFn: async () => {
        // 1. Busca reconciliação para a data
        const { data: recon } = await supabase
          .from('reconciliations')
          .select('previous_balance, bank_total, date')
          .eq('store_id', storeId)
          .eq('date', date)
          .maybeSingle();

        // 2. Busca todas as transações da loja nas datas relevantes (D-7 a D) ou lote recente
        const { data: txs } = await supabase
          .from('transactions')
          .select('*')
          .eq('store_id', storeId)
          .gte('target_date', getPastDate(date, 7))
          .lte('target_date', date)
          .order('occurred_at', { ascending: true });

        return { recon, transactions: txs || [] };
      }
    });
  }
  ```

### 2. [MODIFY] `src/components/conciliacao/StoreExtratoBancarioView.tsx`
- Integrar `useStoreExtratoBancario` para abastecer os Cards com `previous_balance` e `bank_total`.
- Implementar Segmented Control `[📄 Extrato Completo do OFX]` / `[🎯 Apenas Fechamento do Dia]`.
- Adicionar a linha de **Saldo Anterior** no início da tabela e a linha de **Saldo Final (<LEDGERBAL>)** no rodapé.
- Tratar e destacar linhas de saldo diário (ex: `SALDO TOTAL DISPONÍVEL DIA`) com visual de marcador bancário sem somar duplicado no total de entradas/saídas.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Modo Extrato Completo do OFX — Planalto 09/09):**
  - **Estado Inicial:** Operador seleciona Planalto em 09/09 e aba "2. Extrato Bancário".
  - **Ação:** No modo "Extrato Completo do OFX", a tabela exibe:
    - Saldo Anterior: +R$ 412,78
    - 11 transações de 08/09 (boletos, juros limite, PIXs, recebimentos)
    - Marcador de Saldo Disponível de 08/09 (-R$ 8.150,02)
    - 3 transações de 09/09 (+R$ 5.490,07 Rede e 2 saques de -R$ 1.500,00)
    - Saldo Final Oficial: -R$ 5.659,95
  - **Resultado Esperado:** Os 14 lançamentos batem centavo por centavo com o extrato oficial Itaú (`brasicar.ofx`).

- **Cenário 2 (Modo Fechamento do Dia):**
  - **Estado Inicial:** Operador clica em "Apenas Fechamento do Dia (09/09)".
  - **Ação:** A tabela filtra apenas os 3 lançamentos que afetam o caixa de 09/09.
  - **Resultado Esperado:** A conciliação do dia exibe +R$ 2.490,07 de movimentação do dia sem poluição de dias anteriores, preservando 100% da integridade da conciliação diária.
