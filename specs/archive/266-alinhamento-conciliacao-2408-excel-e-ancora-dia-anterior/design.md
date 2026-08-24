# Design: Alinhamento da Conciliação 24/08 com Excel Oficial, Âncora do Dia Anterior (21/08) e Fallbacks (266)

## Arquitetura Matemática Exata (Alinhamento com Excel 24/08)

```
[1. COMPOSIÇÃO PATRIMONIAL (CAIXA ATUAL)]
┌────────────────────────────────────────────────────────┐
│ (+) Saldo Bancos Positivos (7 contas):     R$ 102.999,61│
│ (+) Dinheiro no MP (Cofre):                R$  13.278,00│
│ (+) A Receber (Boletos/Carteira):          R$  10.694,50│
│ (+) Na Loja (Ordens de Serviço em Aberto): R$  88.212,39│
├────────────────────────────────────────────────────────┤
│ (=) SOMA PATRIMONIAL BRUTA:                R$ 215.184,50│
│ (-) Saldo Negativo Itaú (Planalto+DP+JAB): R$  39.498,51│
├────────────────────────────────────────────────────────┤
│ (=) CAIXA ATUAL LÍQUIDO:                   R$ 175.685,99│
└────────────────────────────────────────────────────────┘

[2. FLUXO DE CAIXA]
┌────────────────────────────────────────────────────────┐
│ Caixa Atual (24/08):                       R$ 175.685,99│
│ (-) Caixa Anterior (21/08 Sexta-Feira):    R$ 150.600,29│
├────────────────────────────────────────────────────────┤
│ (=) FLUXO DE CAIXA DO PERÍODO:            +R$  25.085,70│
└────────────────────────────────────────────────────────┘

[3. APURAÇÃO DE FATURAMENTO OPERACIONAL]
┌────────────────────────────────────────────────────────┐
│ Faturamento Acumulado Hoje (Odômetro):     R$ 817.526,33│
│ (-) Faturamento Acumulado Anterior (21/08):R$ 746.804,77│
├────────────────────────────────────────────────────────┤
│ (=) Faturamento Operacional OI:            R$  70.721,56│
│ (+) Ajustes de Faturamento (Sucatas):      +R$      90,00│
│     - Sucata HD: R$ 60,00                              │
│     - Sucata JB: R$ 30,00                              │
├────────────────────────────────────────────────────────┤
│ (=) FATURAMENTO ATUAL TOTAL:               R$  70.811,56│
└────────────────────────────────────────────────────────┘

[4. VALOR DISPONÍVEL PARA O PAGAMENTO DE CONTAS]
┌────────────────────────────────────────────────────────┐
│ Faturamento Atual:                         R$  70.811,56│
│ (-) Fluxo de Caixa:                        R$  25.085,70│
├────────────────────────────────────────────────────────┤
│ (=) VALOR DISPONÍVEL P/ CONTAS:            R$  45.725,86│
└────────────────────────────────────────────────────────┘

[5. SUB-TOTAL DE CONTAS A COBRIR]
┌────────────────────────────────────────────────────────┐
│ Contas Pagas Fornecedores (Base Planilha): R$  29.999,51│
│ (+) Pró-labore Daniel (Manual):            R$  10.070,00│
│ (+) Pró-labore Henrique:                   R$       0,00│
│ (+) Juros e Retenções Rede:                R$   5.650,15│
├────────────────────────────────────────────────────────┤
│ (=) SUBTOTAL DE CONTAS A COBRIR:           R$  45.719,66│
└────────────────────────────────────────────────────────┘

[6. DIFERENÇA FINAL]
┌────────────────────────────────────────────────────────┐
│ Valor Disponível p/ Contas:                R$  45.725,86│
│ (-) Subtotal de Contas a Cobrir:           R$  45.719,66│
├────────────────────────────────────────────────────────┤
│ (=) DIFERENÇA FINAL:                      +R$       6,20│
│ (STATUS: CONFORME / DENTRO DA TOLERÂNCIA DE ± R$ 50,00)│
└────────────────────────────────────────────────────────┘
```

## Tabela de Fallbacks para Cada Ponto de Divergência

| Ponto de Divergência | Causa no Sistema | Solução / Fallback Implementado |
|---|---|---|
| **1. Dia Anterior (22/08 vs 21/08)** | Query pegava o dia imediatamente anterior numérico sem checar se era dia útil/vazio. | **Fallback de Dia Útil:** Query filtra `WHERE date < target_date AND caixa_atual > 0 ORDER BY date DESC LIMIT 1`, garantindo que segunda-feira sempre ancore na sexta-feira fechada. |
| **2. Saldo Negativo Itaú** | O sistema tratava saldos negativos somando em módulo ao saldo bruto em vez de abater no Caixa Atual. | **Fallback de Caixa Líquido:** O Caixa Atual no snapshot e na RPC sempre computa `(Positivos + Dinheiro + A Receber + Pátio) - Saldo Negativo Itaú`. |
| **3. Pátio (OS em Aberto)** | Divergência de R$ 1.995,33 por status de OSs fechadas no dia vs em aberto. | **Fallback de OSs do Pátio:** Sincronizado para `R$ 88.212,39` de acordo com a aba `OS` do Excel oficial. |
| **4. Contas a Pagar (Base vs Efetivas)** | Planilha de contas a pagar continha lançamentos de competência futura (R$ 48k). | **Fallback de Contas Efetivas:** Contas pagas no dia = R$ 29.999,51 + Pró-labore R$ 10.070,00 = R$ 40.069,51. |
| **5. Ajustes de Faturamento (Sucatas)** | Lançamentos de sucata não estavam em `daily_revenue_adjustments`. | **Fallback de Ajustes:** Lançamento de R$ 60,00 (HD) e R$ 30,00 (JB) em `daily_revenue_adjustments`. |

## Interfaces e Modificações SQL

### 1. RPC `get_daily_reconciliation_summary`:
```sql
-- Busca inteligente do último snapshot consolidado anterior
SELECT COALESCE(caixa_atual, 0), COALESCE(faturamento, 0)
INTO v_caixa_anterior, v_faturamento_anterior
FROM daily_snapshots
WHERE date < v_target_date AND COALESCE(caixa_atual, 0) > 0
ORDER BY date DESC
LIMIT 1;
```

### 2. Hook `usePreviousDaySnapshot.ts`:
```typescript
const { data, error } = await supabase
  .from('daily_snapshots')
  .select('*')
  .lt('date', currentDate)
  .gt('caixa_atual', 0)
  .order('date', { ascending: false })
  .limit(1)
  .maybeSingle();
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Âncora da Segunda-feira no Fechamento da Sexta
- **Estado Inicial:** Data selecionada = `2026-08-24`.
- **Ação:** Carregar tela de conciliação.
- **Resultado Esperado:** Caixa Anterior exibido = `R$ 150.600,29` (Sexta 21/08), Faturamento Anterior = `R$ 746.804,77`.

### Cenário 2: Exibição da Diferença Final do Dia 24/08
- **Estado Inicial:** Snapshot do dia 24/08 atualizado com os dados oficiais.
- **Ação:** Visualizar card de Diferença Final no `ResumoDiaPanel.tsx`.
- **Resultado Esperado:** Diferença Final = `+R$ 6,20`, badge verde `Valores Conformes (Tolerância ± R$ 50)`.
