# Design: Rastreamento de Importações e Correções (008)

## 1. Banco de Dados (Supabase)

### Nova tabela: `import_logs`
```sql
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  target_date DATE NOT NULL,
  total_os NUMERIC DEFAULT 0,           -- Total bruto das OSs finalizadas no dia
  total_paid_all NUMERIC DEFAULT 0,     -- Total de TODOS os pagamentos (PIX + Cartão + Dinheiro)
  total_dinheiro NUMERIC DEFAULT 0,     -- Total apenas em Dinheiro físico
  os_count INTEGER DEFAULT 0,           -- Quantas OSs foram importadas
  receivables_count INTEGER DEFAULT 0,  -- Quantas entradas de recebíveis foram criadas
  imported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice + unique para evitar dupla importação do mesmo dia/loja
CREATE UNIQUE INDEX import_logs_store_date_idx ON import_logs (store_id, target_date);

-- RLS
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read import_logs" ON import_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert import_logs" ON import_logs FOR INSERT TO authenticated WITH CHECK (true);
```

### Correção de deduplicação em `receivables`
A nova lógica de idempotência usa `(store_id, type, date, value)` — uma combinação mais precisa — em vez da comparação aproximada de ponto flutuante que estava causando duplicatas.

Além disso, para não acumular dados de PIX por meses de importações repetidas, vamos adicionar um índice único:
```sql
CREATE UNIQUE INDEX receivables_dedup_idx ON receivables (store_id, type, date, ROUND(value::NUMERIC, 2));
```

## 2. Hooks (Frontend)

### Novo `useImportLogs.ts`
```typescript
// Busca lista de importações para o histórico
useImportLogs(filters?: { storeId?: string; startDate?: string; endDate?: string })

// Busca detalhe de uma importação (OSs + receivables do dia daquela loja)
useImportLogDetail(storeId: string, targetDate: string)
```

### Atualizações em `useImportProcessor.ts`
- Passar `totalPaid` (soma total todos os pagamentos) como parâmetro separado
- Gravar em `import_logs` após processar OSs e Recebíveis
- Usar `UPSERT` (ON CONFLICT DO UPDATE) na tabela `reconciliations` para evitar duplicatas

### Atualização em `useDashboardSummary` (useTransactions.ts)
```typescript
// ANTES: usa financial_total (dinheiro físico)
const totalIn = rows.reduce((s, r) => s + (r.financial_total ?? 0), 0);

// DEPOIS: usa os_total (faturamento bruto)
const totalIn = rows.reduce((s, r) => s + (r.os_total ?? 0), 0);
```

## 3. Nova UI: Histórico de Importações

### Rota: `/historico` (substituir a atual que usa `transactions`)
A tela atual de "Histórico de Transações" mostra dados de uma tabela `transactions` que na prática está vazia. Vamos **substituí-la** por um Histórico de Importações muito mais útil.

**Layout**:
```
┌─────────────────────────────────────────┐
│ 📥 Histórico de Importações             │
│ Filtros: [Loja v] [Data Início] [Data Fim] │
├─────────────────────────────────────────┤
│ 01/06/2026 - Rei do Módulo              │
│ Faturamento: R$ 8.500 | Dinheiro: R$ 2.000 │
│ OSs: 12 | Recebíveis: 8 | há 2h        │
│                              [Ver OSs →] │
├─────────────────────────────────────────┤
│ 31/05/2026 - Mecânica Central           │
│ Faturamento: R$ 12.300 | Dinheiro: R$ 4.100 │
│ OSs: 18 | Recebíveis: 14 | há 1d       │
│                              [Ver OSs →] │
└─────────────────────────────────────────┘
```

Ao clicar em "Ver OSs →", expande um painel inline com a lista das OSs daquele dia (`patio_os WHERE store_id = X AND closed_at = Y`).

## 4. Mapa de Dependências
```
ImportReportDialog.tsx
  └── useImportProcessor.ts (modificado)
       ├── upsert reconciliations
       ├── upsert receivables (nova lógica)
       └── insert import_logs (NOVO)

/historico (nova tela)
  └── useImportLogs.ts (NOVO hook)
       └── tabela import_logs (NOVA)

HeroBalance.tsx
  └── useDashboardSummary (modificado)
       └── lê os_total em vez de financial_total
```
