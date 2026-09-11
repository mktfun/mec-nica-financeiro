# Design: Correção Card Saldo Bancos — SSOT (397)

## Arquitetura e Fluxo de Dados

```
RPC get_daily_reconciliation_summary (rawSummary)
    └── store_cash_vault (vault query ✅ funciona)
    └── pos_transactions (POS query ⚠️ posData fora de escopo)
        └── enrichedStores[].nao_entrou_valor = posSum OU 0
            └── summary.stores (passado ao ResumoDiaPanel)
                └── derivedBankTotals useMemo
                    └── Card principal + Sub-chips
```

## Correção 1: Escopo de posData (useBackendConciliacao.ts)

**ANTES (bugado):**
```typescript
// Linha 262-277
let extraPosEntries: any[] = [];
let totalPosUnsettled = 0;
try {
  const { data: posData } = await supabase  // ← block-scoped ao try!
    .from('pos_transactions')
    .select('id, store_id, net_amount, settlement_status')
    .eq('target_date', date)
    .in('settlement_status', ['nao_entrou', 'a_compensar']);
  if (posData && posData.length > 0) {
    extraPosEntries = posData;
    totalPosUnsettled = posData.reduce(...);
  }
} catch (err) { ... }

// Linha 289 (FORA do try)
const nao_entrou_valor = posData ? posSum : Number(s.nao_entrou_valor ?? 0);
//                       ^^^^^^^ ← UNDEFINED! Cai sempre no fallback = 0
```

**DEPOIS (corrigido):**
```typescript
let extraPosEntries: any[] = [];
let totalPosUnsettled = 0;
let posQuerySuccess = false;  // ← flag de escopo externo
try {
  const { data: posData } = await supabase
    .from('pos_transactions')
    .select('id, store_id, net_amount, settlement_status')
    .eq('target_date', date)
    .in('settlement_status', ['nao_entrou', 'a_compensar']);
  if (posData && posData.length > 0) {
    extraPosEntries = posData;
    totalPosUnsettled = posData.reduce(...);
    posQuerySuccess = true;
  }
} catch (err) { ... }

// Linha 289 (corrigido)
const nao_entrou_valor = posQuerySuccess ? posSum : Number(s.nao_entrou_valor ?? 0);
```

## Correção 2: Fallback chain do Card (ResumoDiaPanel.tsx)

**ANTES (confuso, cai em total_saldo_banco NET):**
```typescript
// Linha 240-242
const saldoBancosValor = derivedBankTotals.totalPositivoConsolidado > 0 
  ? derivedBankTotals.totalPositivoConsolidado 
  : (summary?.total_saldo_banco_positivo ?? summary?.total_saldo_banco ?? ...);

// Linha 667-669
<AnimatedNumber 
  value={derivedBankTotals.totalPositivoConsolidado > 0 
    ? derivedBankTotals.totalPositivoConsolidado 
    : (summary?.total_saldo_banco_positivo || saldoBancosValor || 0)} 
/>
```

**DEPOIS (direto, sem fallback para valores escalares errados):**
```typescript
// O derivedBankTotals já calcula a soma correta de OFX positivo + dinheiro + maquininhas.
// Se der 0, usar saldoBancosPositivo da RPC (apenas o OFX positivo) + dinheiro + maquininhas separados.
<AnimatedNumber value={derivedBankTotals.totalPositivoConsolidado} />
```

## Cenários de Verificação

### Cenário 1: Fluxo Normal
- **Estado:** RPC retorna stores com OFX correto, vault e POS pendentes disponíveis
- **Esperado:** Card = R$ 151.211,13 (146.160,23 + 880 + 4.170,90), sub-chips visíveis

### Cenário 2: Fallback (POS query falha)
- **Estado:** pos_transactions query dá erro
- **Esperado:** `posQuerySuccess = false`, card usa `s.nao_entrou_valor` da RPC (0), sub-chip rede não aparece
