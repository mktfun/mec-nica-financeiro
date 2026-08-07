# Design: Fix Dashboard — bank_total em Centavos (088)

## Arquitetura Técnica

```
OFX File → ofxParser.ts (parseFloat do BALAMT) → bankBalance (centavos, ERRADO)
→ CentralImportWizard.tsx → storeBankBalances[store_id] = bankBalance
→ useBulkInsertTransactions() → reconciliations.bank_total (salvo em centavos)
→ useDashboardV2.ts → lê bank_total e soma como se fosse reais → ASTRONÔMICO
```

**Fluxo corrigido:**
```
OFX File → ofxParser.ts (parse + detectar centavos → ÷100) → bankBalance (reais, CORRETO)
→ reconciliations.bank_total (reais) → useDashboardV2.ts (valores corretos)
```

## Fix 1: ofxParser.ts — DetecçÁo de Centavos no LEDGERBAL

```typescript
// ANTES (linha 136-142):
const balStr = ledgerMatch[1].trim();
let balNum = parseFloat(balStr.replace(',', '.'));
if (isNaN(balNum)) balNum = parseInt(balStr, 10);
if (!isNaN(balNum)) {
  bankBalance = balNum;
}

// DEPOIS — detectar se é inteiro (centavos) sem decimais reais:
const balStr = ledgerMatch[1].trim();
let balNum = parseFloat(balStr.replace(',', '.'));
if (isNaN(balNum)) balNum = parseInt(balStr, 10);
if (!isNaN(balNum)) {
  // Se o valor é grande (>1000) e nÁo contém ponto/vírgula na string original
  // → provável representaçÁo em centavos (padrÁo de alguns bancos brasileiros)
  const hasDecimalPoint = balStr.includes('.') || balStr.includes(',');
  if (!hasDecimalPoint && Math.abs(balNum) > 100) {
    balNum = balNum / 100;
  }
  bankBalance = balNum;
}
```

## Fix 2: Script de MigraçÁo dos Dados Existentes

```sql
-- Executar no Supabase SQL Editor (atômico)
BEGIN;
  UPDATE reconciliations SET bank_total = bank_total / 100;
COMMIT;
```

Equivalente em PowerShell via REST API (para execuçÁo headless):
```powershell
# Via RPC ou SQL direto — usaremos o endpoint /rpc ou SQL raw via service role
```

## Cenários de VerificaçÁo

- **Cenário 1:** Após migraçÁo SQL, `bank_total` da `st-01` deve ser `19314.31` (antes era `1931431`).
- **Cenário 2:** Após migraçÁo SQL, Dashboard deve exibir `Saldo Total ≈ R$ 121.307,59` (era R$12.130.759).
- **Cenário 3:** Reimportar OFX com mesmo arquivo — novo `bank_total` deve continuar em reais (nÁo duplicar a divisÁo).
- **Cenário 4:** `CentralImportWizard` exibindo saldo negativo (Itaú) — continua funcionando após fix.
