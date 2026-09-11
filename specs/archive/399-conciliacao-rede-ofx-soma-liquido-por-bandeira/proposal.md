# Proposal: Conciliação Rede x OFX por Soma de Líquido por Bandeira (399)

## Problema
No extrato bancário de **Dom Pedro - DP** em 10/09/2026, entraram dois depósitos líquidos separados da adquirente Rede:
1. `REDE VISA AT0102553424`: **R$ 9.539,20**
2. `REDE MAST AT0102553424`: **R$ 10.911,47**
Total creditado na conta: **R$ 20.450,67** (Saldo em conta corrente: R$ 20.534,66).

No relatório da Rede de Dom Pedro (estab. `102553424`), as vendas líquidas foram:
- 3 vendas Mastercard: R$ 8.406,02 + R$ 754,89 + R$ 1.750,56 = **R$ 10.911,47** (Bate 100% no centavo com o crédito Mastercard)
- 2 vendas Visa: R$ 5.244,85 + R$ 4.294,35 = **R$ 9.539,20** (Bate 100% no centavo com o crédito Visa)

**O Bug:**
O sistema não somou as vendas líquidas por bandeira para cruzar com os créditos bancários por bandeira. Além disso, a tabela `pos_transactions` não possuía coluna física `brand`, perdendo a bandeira na persistência. Com isso, o motor considerou as vendas de Dom Pedro como `nao_entrou` ("A Compensar"), inflando indevidamente o saldo consolidado de Dom Pedro no modal de saldos para **R$ 40.985,33** (R$ 20.534,66 + R$ 20.450,67).

---

## Solução Proposta (Foco em Reuso e Correção)

1. **Adicionar Coluna `brand` em `pos_transactions` [EXTEND]:**
   - Executar migration via Supabase: `ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS brand TEXT;`.
   - Ajustar a trigger `insert_into_transactions_view` para repassar `brand` a `pos_transactions`.

2. **Garantir Persistência de `brand` na Ingestão [MODIFY]:**
   - Em `CentralImportWizard.tsx`, certificar que a inserção em `transactions` / `pos_transactions` grave a bandeira (`Visa`, `Mastercard`, `Elo`, etc.).

3. **Motor Determinístico de Soma por Bandeira (`ReconciliadorRedeOFX`) [MODIFY]:**
   - No `src/lib/matchers/reconciliadorRedeOfx.ts`:
     - Agrupar vendas da loja por bandeira e calcular a **Soma Líquida por Bandeira**.
     - Agrupar créditos bancários da loja por bandeira (`REDE MAST` $\rightarrow$ `Mastercard`, `REDE VISA` $\rightarrow$ `Visa`).
     - Se $|\sum \text{Vendas Líquidas}_{\text{bandeira}} - \sum \text{Créditos OFX}_{\text{bandeira}}| \le 0.05$:
       - Marcar **todas** as vendas daquela bandeira como `statusMatch = true` (`entrou`).
       - Vincular o FITID do crédito bancário correspondente.
     - Se a bandeira não tiver crédito correspondente no OFX (caso de Piraporinha):
       - As vendas da bandeira permanecem como `nao_entrou` (A Compensar).

4. **Persistência do Match no Banco [MODIFY]:**
   - Atualizar `pos_transactions` marcando as vendas conciliadas de Dom Pedro como `settlement_status = 'entrou'` e `settled_date = '2026-09-10'`.
   - Zerar o `nao_entrou_valor` de Dom Pedro, garantindo que o saldo consolidado de Dom Pedro permaneça estritamente em **R$ 20.534,66**.

---

## Investigação e Análise de Reuso (Relatório)
- **Tabelas e RPCs:** Reutilizar integralmente `pos_transactions`, `ofx_transactions`, `reconciliations` e `get_daily_reconciliation_summary`. Nenhuma tabela nova será criada.
- **Módulos Existentes:** Reaproveitar a classe `ReconciliadorRedeOFX` em `src/lib/matchers/reconciliadorRedeOfx.ts`, aprimorando seu Estágio 2 para agregação por bandeira com tolerância MDR.
- **Componentes de UI:** Reutilizar `CentralImportWizard.tsx`, `Step4FinalAuditAndClose.tsx` e `SaldoBancosDetailModal.tsx`.

---

## Contratos de Dados & SQL (Supabase)
```sql
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS brand TEXT;
CREATE INDEX IF NOT EXISTS idx_pos_transactions_store_target_brand 
ON public.pos_transactions (store_id, target_date, brand);
```

---

## Risco Principal e Mitigação
- **Risco:** Uma filial ter vendas de uma bandeira e créditos misturados que ultrapassem a tolerância de R$ 0,05 por variação de MDR.
- **Mitigação:** Tolerância adaptativa de MDR de até 3% para lotes que tenham pequena variação de desconto sobre o valor bruto/líquido.
