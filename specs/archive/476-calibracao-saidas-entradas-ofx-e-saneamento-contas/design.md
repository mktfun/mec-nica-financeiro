# 📐 Design Técnico — Spec 476: Calibração de Saídas/Entradas OFX e Saneamento de Contas

## 1. Arquitetura de Dados & Fluxo Contábil
```
[Extrato Bancário OFX (Saídas)] ---> saidas_checks_cte ---> saidas_orfas (Débitos Órfãos Reais)
                                                                 │
                                                                 ▼
[Contas a Pagar (daily_manual_bills)] ---> Contas da Filial      dif_saidas = saidas_orfas
   (Despesas previstas / C6 / Aberto)      (Informativo)         (Se saidas_ofx == 0 -> dif_saidas = 0)
                                                                 │
                                                                 ▼
                                                        Status da Filial
                                            (Conciliado se saidas_orfas <= 0.05
                                             e entradas_orfas <= 0.05
                                             e nao_entrou_valor <= 0.05)
```

---

## 2. Ajuste Matemático na RPC `get_daily_reconciliation_summary`
### 2.1 Linhas de Saídas (Dual-Split Linha 2):
```sql
-- DUAL-SPLIT: LINHA 2 (SAÍDAS)
'ofx_saidas_total', COALESCE(sofx.ofx_saidas_total, 0),
'saidas_ofx', COALESCE(sofx.ofx_saidas_total, 0),
'saidas_justificadas', COALESCE(sofx.saidas_justificadas, 0),
'saidas_orfas', COALESCE(sofx.saidas_orfas, 0),
'contas_conciliadas', COALESCE(bst.contas_loja_total, 0),
'contas_loja_total', COALESCE(bst.contas_loja_total, 0),
'contas_loja', COALESCE(bst.contas_loja_total, 0),
'dif_saidas', COALESCE(sofx.saidas_orfas, 0),
'diferenca_saidas', COALESCE(sofx.saidas_orfas, 0),
```

### 2.2 Status da Filial:
```sql
'status', CASE 
    WHEN COALESCE(sofx.saidas_orfas, 0) <= 0.05 
     AND COALESCE(efx.entradas_orfas, 0) <= 0.05 
     AND COALESCE(rd.nao_entrou_valor, 0) <= 0.05 THEN 'conciliado'
    WHEN COALESCE(sofx.saidas_orfas, 0) <= 0.05 
     AND COALESCE(efx.entradas_orfas, 0) <= 0.05 THEN 'approved' 
    ELSE 'divergence' 
END,
'diferenca', (COALESCE(efx.entradas_orfas, 0) - COALESCE(sofx.saidas_orfas, 0)),
```

---

## 3. Design System & UI Guardrails (`StoreCardModulo1.tsx`)
### 3.1 Tratamento Semântico da Linha de Saídas:
```tsx
const isDifSaidasOk = Math.abs(data.diferencaSaidas || 0) <= 0.05;
const hasSaidasBanco = saidasOfxValor > 0;
const hasContasLoja = contasLojaValor > 0;

// Rótulo da Diferença de Saídas:
let saidasBadgeLabel = '100% Conciliado';
let saidasBadgeColor = 'text-emerald-400';

if (isSemMovimento || (!hasSaidasBanco && !hasContasLoja)) {
  saidasBadgeLabel = 'Sem Mov. Saídas';
  saidasBadgeColor = 'text-zinc-500';
} else if (!hasSaidasBanco && hasContasLoja) {
  saidasBadgeLabel = 'Sem Débito no Banco';
  saidasBadgeColor = 'text-zinc-400';
} else if (hasSaidasBanco && !isDifSaidasOk) {
  saidasBadgeLabel = 'Débito Órfão';
  saidasBadgeColor = 'text-rose-400';
}
```

### 3.2 Cor da Barra Lateral de Status:
- Barra **Verde** (`bg-[var(--color-accent-teal)]`): quando `isDiferencaOk` for verdadeiro e não houver `hasACompensar` pendente nem débito/crédito órfão.
- Barra **Âmbar** (`bg-amber-500`): quando houver valores da Rede a compensar.
- Barra **Vermelha** (`bg-[var(--color-accent-danger)]`): apenas quando houver débito órfão real ou crédito órfão real.

---

## 4. Cenários Obrigatórios de Verificação
### Happy Path (Mauá / Piraporinha / Planalto / Jorge Beretta com Saídas = 0):
- Saídas OFX: R$ 0,00
- Contas / Boletos: R$ 844,73 (com sub-rótulo "Sem Débito no Banco")
- Dif. a Justificar: R$ 0,00 ("Sem Débito no Banco" em tom neutro, zero badges vermelhos de Débito Órfão).
- Barra lateral do Card: Verde (100% Conciliado / Aprovado).

### Edge Case (Saída Bancária Real sem Justificativa):
- Saídas OFX: R$ 500,00
- Contas Conciliadas: R$ 0,00
- Dif. a Justificar: R$ 500,00 ("Débito Órfão" em vermelho, barra lateral vermelha DIVERGÊNCIA).
- O sistema mantém 100% de rigor pericial para dinheiro que realmente saiu da conta.

---

## 5. Critérios de Aceitação Verificáveis
1. `get_daily_reconciliation_summary('2026-08-25')` retorna `dif_saidas = 0` e `status = 'conciliado'` para Mauá, Jorge Beretta, Planalto e Piraporinha.
2. Nenhuma loja com `ofx_saidas_total = 0` exibe o texto "Débito Órfão" ou valores negativos vermelhos em `StoreCardModulo1.tsx`.
3. Observações históricas de Pátio anteriores a 25/08 saneadas com `baseline_source = 'historical_patio_carryover'`, reduzindo os falsos alarmes de `os_payments.pending` a 0.
4. `npm run build` passa limpo com exit code 0 sem nenhum erro de tipo.
