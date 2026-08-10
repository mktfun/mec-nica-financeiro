# Proposal: Raio-X da Conciliação — Visão Transação por Transação (151)

## Problema

Os saldos na tela de conciliação não batem, e o usuário não tem como entender **o que exatamente** está compondo cada número. Não é só saber o total — é preciso ver **cada transação individual** que entrou em cada conta, para poder auditar linha por linha onde está o buraco.

Há 4 raízes de problema confirmadas no código:

### Questão 1 — Saldo Banco Itaú: de onde vem e quais transações?

O campo **"SALDO BANCO ITAÚ"** é `reconciliations.bank_total`, populado por um **trigger** na tabela `transactions` (legada). Se as importações OFX foram para `ofx_transactions` e não espelharam em `transactions`, o `bank_total` fica **zero** — e não há como ver qual transação faltou.

Precisa-se ver: **cada lançamento OFX de entrada (tipo='in') do dia, com descrição, valor e horário.**

### Questão 2 — Despesas / Juros: o que está zerado?

- `contasAPagarAutomatico` = soma de `transactions WHERE type='out' AND source='ofx'` — mesma tabela legada, mesma dessincronização
- `juros_atual` = **hard-coded como `0`** em `conciliacao.index.tsx` linha 76. Nunca conectado a `pos_transactions.fee_amount`

Precisa-se ver: **cada lançamento OFX de saída (tipo='out') do dia com valor, e cada taxa da maquininha com percentual.**

### Questão 3 — Na Loja OS inclui meses passados sem aviso

O cálculo inclui OSs de meses anteriores que fecharam naquele dia. O número inflado aparece sem nenhuma indicação de que parte do valor vem de julho.

Precisa-se ver: **cada OS individualmente, com data de abertura, valor total, pago, restante — e destacar visualmente as que são de meses anteriores.**

## Raiz Real dos Problemas

| Métrica | Fonte Real | Causa do Erro |
|---|---|---|
| **Saldo Banco Itaú** | `reconciliations.bank_total` ← trigger em `transactions` | `transactions` desatualizada vs `ofx_transactions` |
| **Despesas OFX** | `transactions WHERE type=out AND source=ofx` | Mesma dessincronização — saídas OFX invisíveis |
| **Juros/Maquininha** | `storesState.juros_atual = 0` (hardcode) | Campo nunca foi conectado às `pos_transactions.fee_amount` |
| **Na Loja OS** | Snapshot ou cálculo ao vivo (sem distinção) | OSs do mês passado entram sem destaque |

## Solução Proposta

Uma nova tela/modal de **"Raio-X por Conta"** — acessada via botão `🔍` em cada loja na tabela de conciliação — que expõe **todas as transações individuais** que compõem cada métrica:

### 4 Seções de Transações

**1. Entradas do Banco (OFX tipo=in)**
Tabela com cada transação de entrada do extrato OFX da loja no dia:
- Data/hora, descrição/nome da contraparte, FITID, valor
- Subtotal ao final
- Badge de fonte: `📸 Snapshot bank_total` ou `⚡ Leitura direta ofx_transactions`
- Se `bank_total=0` e `ofx_transactions` tem dados → alerta "Trigger desatualizado"

**2. Saídas / Despesas (OFX tipo=out)**
Tabela com cada lançamento de saída do extrato OFX do dia:
- Data/hora, descrição, valor (absoluto)
- Subtotal ao final

**3. Na Loja OS (Pátio)**
Tabela com cada OS que compõe o total "Na Loja OS":
- Nº OS, data abertura, data fechamento, status, total, pago, restante, forma de pagamento
- Linhas do **mês passado** destacadas em âmbar com badge `📅 Mês Anterior`
- Subtotal separado: "Mês atual: R$ X | Mês anterior: R$ Y"

**4. Taxas da Maquininha (Rede)**
Tabela com cada transação de maquininha do dia que gerou taxa:
- Hora, forma de pagamento, bruto, taxa (R$), taxa (%), líquido
- Subtotal de taxas ao final

### Fix Automático: Juros Hard-coded
Junto com a transparência, corrigir o `juros_atual: 0` hardcode para buscar real de `pos_transactions.fee_amount` agrupado por loja/data.

## Contratos de Dados

### Nova RPC: `get_conciliation_breakdown(p_store_id text, p_date date) RETURNS json`

```json
{
  "bank_total": 12500.00,
  "bank_total_source": "snapshot_reconciliations | realtime_ofx",
  "bank_total_warning": "trigger_desatualizado | ok",
  "ofx_in": [
    { "id": "...", "occurred_at": "...", "description": "PIX FULANO", "fitid": "...", "amount": 350.00 }
  ],
  "ofx_out_total": 980.50,
  "ofx_out": [
    { "id": "...", "occurred_at": "...", "description": "TED FORNECEDOR", "fitid": "...", "amount": 980.50 }
  ],
  "na_loja_os": 3200.00,
  "na_loja_os_source": "snapshot | realtime",
  "na_loja_os_current_month": 1800.00,
  "na_loja_os_previous_months": 1400.00,
  "os_detail": [
    {
      "os_number": "12345", "opened_at": "2026-07-20T10:00:00Z", "closed_at": null,
      "status": "aberto", "total_value": 800.00, "paid_value": 0.00, "remaining": 800.00,
      "payment_method": "cartao", "is_previous_month": true
    }
  ],
  "juros_rede": 450.00,
  "rede_transactions": [
    { "occurred_at": "...", "payment_method": "credito", "gross_amount": 1500.00, "fee_amount": 45.00, "fee_pct": 3.00 }
  ]
}
```

### Tabelas envolvidas (read-only)
- `reconciliations` (`bank_total`, `na_loja_os`, `previous_balance`)
- `ofx_transactions` (`type`, `amount`, `target_date`, `store_id`, `counterpart_name`, `bank_name`, `fitid`)
- `patio_os` (`os_number`, `total_value`, `paid_value`, `payment_method`, `opened_at`, `closed_at`, `store_id`)
- `pos_transactions` (`fee_amount`, `gross_amount`, `payment_method`, `target_date`, `store_id`, `occurred_at`)

### Fix no Frontend (sem nova tabela)
- `conciliacao.index.tsx` L76: `juros_atual: 0` → soma real de `pos_transactions.fee_amount` por loja/data

## API / Interface

### Nova RPC
```sql
get_conciliation_breakdown(p_store_id text, p_date date) RETURNS json
```

### Novos Artefatos Frontend
- `src/hooks/useConciliationBreakdown.ts` — lazy query (enabled quando modal abre)
- `src/components/conciliacao/BreakdownModal.tsx` — modal com 4 tabelas de transações
- Botão `🔍` em cada linha de loja na tabela `conciliacao.index.tsx`

## Features Existentes Impactadas
- `conciliacao.index.tsx` — linha `juros_atual: 0` corrigida, botão `🔍` adicionado por loja
- `ResumoDiaPanel.tsx` — `juros_rede` agora virá com valor real

## Risco Principal

**Probabilidade: Baixa**
**Impacto: Reversível** — RPC read-only, nenhum dado é alterado.
**Mitigação:** Se a RPC retornar dados incorretos, o modal mostra mas não afeta a conciliação. O fix de `juros_atual` é aditivo — no pior caso, passa a mostrar um valor que antes era zero.

O cenário mais crítico é o diagnóstico revelar que `reconciliations.bank_total` está zerado porque o trigger dispara em `transactions` (legado) desatualizado — aí será necessária uma spec separada de migração de trigger.
