# Design — Spec 427: Correção do Caixa Atual no Auto-Save do Wizard

## 1. Arquitetura da Solução

### Fluxo de Apuração e Persistência no CentralImportWizard

Atualmente, o auto-save no `CentralImportWizard.tsx` (linhas 2062-2165) ocorre no final do processamento dos arquivos, mas calcula o `caixaAtualCalculado` apenas com o saldo OFX das contas bancárias, desconsiderando o Pilar 1 estendido (Ativos em Trânsito / Direitos a Compensar).

```
[Importação dos Arquivos]
       │
       ├──► OFX: Saldo Bancos Positivo (R$ 127.466,80)
       ├──► REDE: Vendas Líquidas A Compensar (R$ 31.840,45)  ◄── OMITIDO NO WIZARD
       ├──► OSs/Cofre: Dinheiro Lojas em Trânsito (R$ 806,68) ◄── OMITIDO NO WIZARD
       ├──► OSs: Saldo Pátio WIP (R$ 64.663,12)
       ├──► Recebíveis: Dinheiro MP + A Receber (R$ 36.845,67)
       └──► Cheque Especial: Saldo Negativo Itaú (-R$ 27.048,57)
       │
[Novo Cálculo Canônico]
       │
       ▼
Total Saldo Bancos Positivo Consolidado =
       Saldo Bancos Positivo (127.466,80)
     + Cartões a Compensar (31.840,45)
     + Dinheiro Cofre (806,68)
     - Devoluções Rede (0,00)
     = R$ 160.113,93
       │
       ▼
Caixa Atual Calculado =
       Total Saldo Bancos Positivo (160.113,93)
     + Recebíveis (36.845,67)
     + Pátio (64.663,12)
     - Cheque Especial (27.048,57)
     = R$ 234.574,15  (Exatamente R$ 32.647,13 a mais que os 201.927,02)
       │
       ▼
Fluxo de Caixa Calculado = 234.574,15 - 260.114,65 = -R$ 25.540,50
       │
       ▼
Valor Disponível para Contas = 31.329,67 - (-25.540,50) = R$ 56.870,17
       │
       ▼
Subtotal Contas a Pagar = 54.945,40 (Contas) + 1.924,77 (Juros Rede) = R$ 56.870,17
       │
       ▼
Diferença Final = 56.870,17 - 56.870,17 = R$ 0,00 (CONVERGÊNCIA ABSOLUTA!)
       │
       ▼
[Disparo da RPC run_autonomous_reconciliation_loop('2026-09-18')]
       │
       ▼
Delta Inicial = 0.00 <= 50.00 -> is_conforme = true, final_delta = 0.00
       │
       ▼
[Aprovação no Wizard com Selo Conforme e Toast de Sucesso]
```

---

## 2. Detalhes de Implementação em `CentralImportWizard.tsx`

### 2.1. Apuração de `cartoesACompensarTotal`
Apurar o total líquido de cartões a compensar do dia:
```typescript
let cartoesACompensarTotal = 0;
let devolucoesRedeTotal = 0;

results.redeResults.forEach(r => {
  if (r.success && r.transactions) {
    r.transactions.forEach(t => {
      if (t.transaction_type === 'devolucao') {
        devolucoesRedeTotal += Math.abs(t.gross_amount || t.net_amount || 0);
      } else {
        // Spec 426: Vendas da Rede ficam 100% a compensar no D+0
        cartoesACompensarTotal += (t.net_amount || (t.gross_amount - (t.fee || 0)) || 0);
      }
    });
  }
});

// Se redeResults não tiver os totais (ou se foi pré-processado), consulta complementar em pos_transactions
if (cartoesACompensarTotal === 0) {
  try {
    const { data: posData } = await supabase
      .from('pos_transactions')
      .select('net_amount, settlement_status')
      .eq('target_date', targetDate);
    if (posData) {
      cartoesACompensarTotal = posData
        .filter(p => p.settlement_status !== 'entrou' && p.settlement_status !== 'liquidado')
        .reduce((acc, p) => acc + Number(p.net_amount || 0), 0);
    }
  } catch (e) {
    console.warn("Erro ao consultar pos_transactions complementar:", e);
  }
}
```

### 2.2. Apuração de `dinheiroLojaCofreTotal`
Apurar o dinheiro em cofre em trânsito no banco:
```typescript
let dinheiroLojaCofreTotal = 0;
try {
  const { data: vaultData } = await supabase
    .from('store_cash_vault')
    .select('amount, status')
    .lte('entry_date', targetDate)
    .in('status', ['em_transito', 'pending']);
  if (vaultData) {
    dinheiroLojaCofreTotal = vaultData.reduce((acc, v) => acc + Number(v.amount || 0), 0);
  }
} catch (vErr) {
  console.warn("Erro ao apurar store_cash_vault:", vErr);
}
```

### 2.3. Consolidação dos Totais Canônicos
```typescript
const totalSaldoBancoPositivoConsolidado = Math.round(
  (saldoBancosPositivo + dinheiroLojaCofreTotal + cartoesACompensarTotal - devolucoesRedeTotal) * 100
) / 100;

const totalRecebiveis = manualDinheiroMp + manualAReceber;
const caixaAtualCalculado = Math.round(
  (totalSaldoBancoPositivoConsolidado + totalRecebiveis + veiculosPatioValor - saldoNegativoItau) * 100
) / 100;

const fluxoCalculado = Math.round((caixaAtualCalculado - caixaAnt) * 100) / 100;
const valorDispCalculado = Math.round((finalFaturamento - fluxoCalculado) * 100) / 100;
const subtotalContasCalculado = Math.round((finalContasManual + jurosRedeTotal) * 100) / 100;
const diferencaCalculada = Math.round((valorDispCalculado - subtotalContasCalculado) * 100) / 100;
```

### 2.4. Enriquecimento do Payload de `daily_snapshots`
```typescript
metadata: {
  caixa_atual: caixaAtualCalculado,
  caixa_anterior: caixaAnt,
  fluxo_caixa: fluxoCalculado,
  faturamento_anterior: fatAnt,
  faturamento_mes_anterior: manualFaturamentoMesAnterior,
  faturamento_oi_base: fatOiBase,
  faturamento_ajustes: totalRevenueAdjustments,
  odometro_hoje: odometroHoje > 0 ? odometroHoje : (fatAnt + fatOiBase),
  faturamento_periodo: fatTotalComAjustes,
  source_mode: isNoOsMode ? 'mapa_metas' : 'odometro_os',
  has_os_files: !isNoOsMode,
  valor_disp_contas: valorDispCalculado,
  subtotal_contas: subtotalContasCalculado,
  diferenca_final: diferencaCalculada,
  total_saldo_banco: totalSaldoBancoPositivoConsolidado,
  total_saldo_banco_positivo: totalSaldoBancoPositivoConsolidado,
  saldo_bancos_ofx: saldoBancosLiquido,
  saldo_bancos_positivo: saldoBancosPositivo,
  saldo_negativo_itau: saldoNegativoItau,
  dinheiro_lojas: dinheiroLojaCofreTotal,
  dinheiro_em_lojas: dinheiroLojaCofreTotal,
  cartoes_a_compensar: cartoesACompensarTotal,
  devolucoes_rede: devolucoesRedeTotal,
  dinheiro_mp: manualDinheiroMp,
  a_receber_manual: manualAReceber,
  total_patio: veiculosPatioValor,
  status_geral: Math.abs(diferencaCalculada) <= 50 ? 'approved' : 'divergent',
  is_closed: true,
}
```

---

## 3. Regularização do Snapshot de 18/09/2026

Para que a base fique imediatamente perfeita e o usuário veja o dia 18/09 aprovado sem precisar refazer tudo do zero:
- Um script de atualização segura no Supabase aplicará os valores calculados na linha do snapshot `2026-09-18`:
  - `caixa_atual = 234.574,15`
  - `metadata.cartoes_a_compensar = 31.840,45`
  - `metadata.dinheiro_lojas = 806,68`
  - `metadata.total_saldo_banco_positivo = 160.113,93`
  - `metadata.fluxo_caixa = -25.540,50`
  - `metadata.valor_disp_contas = 56.870,17`
  - `metadata.subtotal_contas = 56.870,17`
  - `metadata.diferenca_final = 0,00`
  - `metadata.status_geral = 'approved'`
- E o teste chamará `run_autonomous_reconciliation_loop('2026-09-18')` certificando que a RPC retorna conformidade (delta 0).
