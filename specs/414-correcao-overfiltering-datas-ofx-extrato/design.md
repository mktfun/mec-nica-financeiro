# 📐 Technical Design — Spec 414: Correção do Over-filtering de Datas do OFX (Cards e Extrato Zerados no Fechamento do Dia 17)

## 1. Arquitetura de Fluxo de Dados e Pontes de Vinculação

```
[Importação do Dia (targetDate: 17/09)]
      │
      ├─► import_batches (id: ba78..., target_date: '2026-09-17')
      ├─► reconciliations (date: '2026-09-17', bank_total: ...)
      ├─► daily_manual_bills (date: '2026-09-17', amount: ...)
      │
      ▼
[ofx_transactions]
      │
      ▼ (target_date alinhado ao lote da conciliação: 2026-09-17)
[RPC get_daily_reconciliation_summary('2026-09-17')]
  CTEs filtram por (target_date = '2026-09-17' OR import_batch_id = batch_do_dia)
      │
      ▼
[StoreCardModulo1]
  OFX Entradas: R$ 1.658,37 | Conciliado: R$ 1.658,37 | Dif: R$ 0,00
  Saídas OFX:   R$ 440,00   | Contas Loja: R$ 440,00   | Dif: R$ 0,00
  (100% Batido ao centavo!)
```

---

## 2. Padrões de Design System & UI
- Cards fiduciários Zinc-950 preservam o layout do Split Dual sem alterações de CSS.
- Seletor de visualização de extrato em `StoreExtratoBancarioView.tsx` lista as transações do dia com badges fiduciárias corretas.

---

## 3. Interfaces & Implementação Detalhada

### A. Saneamento no Banco de Dados (Migration SQL)
```sql
-- 1. Realinhar as transações do batch de fechamento de 17/09
UPDATE ofx_transactions 
SET target_date = '2026-09-17'::date 
WHERE import_batch_id = 'ba78e983-1222-4839-94e5-2521eee4f7ba' 
  AND occurred_at >= '2026-09-16 00:00:00+00';

-- 2. Atualizar a RPC com a cláusula de lote fiduciário
-- (target_date = v_target_date::date OR import_batch_id IN (SELECT id FROM import_batches WHERE target_date = v_target_date::date) ...)
```

### B. Ingestão no Wizard (`CentralImportWizard.tsx`)
```typescript
// Quando a transação for a mais recente do extrato vinculada ao fechamento atual:
const effectiveOfxDate = targetDate; // Herda a data oficial do fechamento
```

### C. Hook `useTransactions.ts`
```typescript
// Em useBulkInsertTransactions:
target_date: t.target_date || explicitTargetDate || (t.occurred_at ? t.occurred_at.split('T')[0] : defaultDate)
```

---

## 4. Cenários de Teste

### Happy Path (Fechamento do Dia 17)
- Usuário abre `/conciliacao?date=2026-09-17`.
- A RPC retorna todas as 10 filiais com entradas e saídas preenchidas.
- Filial Dom Pedro bate R$ 440,00 de saídas com R$ 440,00 de contas.
- Filial Jabaquara bate R$ 829,80 de saídas com R$ 829,80 de contas.
- Filial Jorge Beretta bate R$ 275,38 de saídas com R$ 275,38 de contas.
- Aba de extrato exibe os 3 lançamentos do dia 17 para Dom Pedro.

---

## 5. Critérios de Aceitação Verificáveis
1. Script de terminal verifica que as 10 lojas em `2026-09-17` retornam movimentação ativa diferente de zero.
2. Nenhuma transação com `fitid` legítimo é perdida.
3. `npm run build` passa com código 0.
