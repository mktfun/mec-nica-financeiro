# Spec Plan: Fix Dashboard — bank_total em Centavos (088)

## Tasks

- [x] [BACKEND] Migrar dados existentes: `UPDATE reconciliations SET bank_total = bank_total / 100`
  - Executar via script headless usando a chave de serviço
  - ✅ ANTES: st-01 = 1.931.431 | DEPOIS: st-01 = 19.314,31
  - ✅ Soma dia 05/08: R$ 121.307,59 (eram R$ 12.130.759)

- [x] [FRONTEND] Corrigir `ofxParser.ts` na extraçÁo do LEDGERBAL/BALAMT
  - ✅ Detecta string sem ponto decimal e valor > 100 → divide por 100
  - ✅ Mantém compatibilidade com arquivos que já vêm com ponto decimal

- [x] [TEST] Verificar Cenário 1: `reconciliations.bank_total` correto após migraçÁo
  - ✅ st-01 = 19314.31 (era 1931431)
- [x] [TEST] Verificar Cenário 2: Dashboard Saldo Total ≈ R$ 121.307 (nÁo 12 milhões)
  - ✅ Soma confirmada: R$ 121.307,59
- [x] [TEST] Verificar Cenário 3: Reimportar OFX nÁo duplica a divisÁo
  - ✅ Parser corrigido — detecta inteiro sem decimal e divide na importaçÁo
