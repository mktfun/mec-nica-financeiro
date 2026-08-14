# Design Técnico: Normalização do Campo `type` em `ofx_transactions` (Spec 200)

## 1. Schema & Constraints
Tabela: `public.ofx_transactions`
- `store_id`: `TEXT`
- `bank_name`: `TEXT NOT NULL`
- `type`: `TEXT CHECK (type IN ('in', 'out'))`
- `amount`: `NUMERIC NOT NULL`
- `occurred_at`: `TIMESTAMPTZ NOT NULL`
- `fitid`: `TEXT NOT NULL`
- `target_date`: `DATE`

## 2. Fluxo de Dados e Sanitização
```mermaid
graph TD
    OFX[Arquivo OFX] --> Parser[ofxParser.ts: type 'in' | 'out']
    Parser --> Modal[ImportConciliacaoModal.tsx: type 'in' | 'out', Math.abs(amount)]
    Modal --> Hook[useTransactions.ts: Sanitização Defensiva in/out]
    Hook --> Supabase[PostgreSQL: ofx_transactions type IN ('in', 'out')]
```

## 3. Modificações de Código
- **`src/components/conciliacao/ImportConciliacaoModal.tsx`**:
  - Na iteração de `ofx.transactions`, enviar `type: t.type === 'in' || t.type === 'income' || t.amount > 0 ? 'in' : 'out'` e `amount: Math.abs(t.amount)`.
- **`src/hooks/useTransactions.ts`**:
  - No mapeamento do upsert de `ofx_transactions`, normalizar `type: (t.type === 'in' || t.type === 'income' || t.type === 'credit' || t.type === 'C' || t.amount > 0) ? 'in' : 'out'` e `amount: Math.abs(t.amount)`.
