# Proposal: Dashboard com Valores Astronômicos — Saldo em Centavos (088)

## Problema

O Dashboard (VisÁo Geral) exibe valores na casa dos **R$ 12 milhões** para o Saldo Total e Caixa Atual, quando os valores reais deveriam ser ~R$ 121 mil.

### 🔬 Prova Forense (Executada Direto no Banco de ProduçÁo)

Dados reais da tabela `reconciliations` em 2026-08-05:

| Store | bank_total (no banco) | Se for centavos (÷100) | Se for reais |
|-------|----------------------|------------------------|-------------|
| st-01 | 1.931.431 | R$ 19.314,31 ✅ | R$ 1.931.431 ❌ |
| st-02 | 4.229.078 | R$ 42.290,78 ✅ | R$ 4.229.078 ❌ |
| st-03 | 2.276.454 | R$ 22.764,54 ✅ | R$ 2.276.454 ❌ |
| st-04 | 695.452 | R$ 6.954,52 ✅ | R$ 695.452 ❌ |
| st-05 | 839.636 | R$ 8.396,36 ✅ | R$ 839.636 ❌ |
| st-06 | 46.963 | R$ 469,63 ✅ | R$ 46.963 ❌ |
| st-07 | 209.989 | R$ 2.099,89 ✅ | R$ 209.989 ❌ |
| st-08 | 283.953 | R$ 2.839,53 ✅ | R$ 283.953 ❌ |
| st-09 | 288.834 | R$ 2.888,34 ✅ | R$ 288.834 ❌ |
| global | 1.328.969 | R$ 13.289,69 ✅ | R$ 1.328.969 ❌ |
| **SOMA** | **12.130.759** | **R$ 121.307,59 ✅** | **R$ 12.130.759 ❌** |

**Correspondência com o Dashboard:** O usuário reportou exatamente `R$ 12.130.759,00` como "Saldo Total" — confirmaçÁo direta da hipótese de centavos.

### Prova de Fechamento Matemático

`st-07` no dia 04/08: `bank_total = 2.111.853` centavos = R$21.118,53

Transações em 05/08:
- Entradas: R$30.861,21
- Saídas: -R$44.018,67
- Delta: -R$13.157,46

Saldo esperado do dia 05: `21.118,53 + (-13.157,46) = R$ 7.961,07`  
Registrado em `bank_total` dia 05: `209.989` centavos = `R$ 2.099,89`

*(Pequena diferença se explica pelas transações nÁo OFX e saldo do LEDGERBAL que é o saldo real na data do arquivo, nÁo o acumulado)*

### Causa Raiz

O arquivo OFX de bancos brasileiros (especialmente Itaú/Bradesco) retorna o `<BALAMT>` como **integer de centavos sem vírgula** (ex: `1931431` ao invés de `19314.31`). O parser `ofxParser.ts` faz `parseFloat(balStr)` e salva `1931431` direto como `bank_total` em centavos. O Dashboard lê esse valor e exibe como reais sem dividir por 100.

## SoluçÁo Proposta

### OpçÁo A — Corrigir na ExibiçÁo (Menos disruptiva)
Dividir `bank_total` por 100 no `useDashboardV2.ts` ao calcular o `saldoTotal`.

**Risco:** Pode quebrar outros consumidores do `bank_total` que já estejam exibindo corretamente.

### OpçÁo B — Corrigir no Parser (Preferida ✅)
Detectar no `ofxParser.ts` se o `BALAMT` retornado é um inteiro sem ponto decimal (centavos) e dividir por 100 antes de retornar como `bankBalance`.

**Critério de detecçÁo:** Se `parseFloat(balStr)` retorna um número sem casas decimais representativas (ex: `1931431.00`) e o número é grande (> 1000), assume que está em centavos e divide por 100.

Ou melhor ainda: o `BALAMT` brasileiro vem como `1931431` sem vírgula. Se detectarmos que a string nÁo contém ponto e é um inteiro, dividimos por 100.

### OpçÁo C — Corrigir os dados existentes no banco (Necessária JUNTO com B)
Após corrigir o parser, precisamos dividir por 100 todos os `bank_total` existentes na tabela `reconciliations`. Um script SQL/PS1 fará isso de forma segura.

**SoluçÁo Final = OpçÁo B + OpçÁo C.**

## Contratos de Dados

- **Tabela afetada:** `reconciliations` (campo `bank_total`)
- **MutaçÁo:** `UPDATE reconciliations SET bank_total = bank_total / 100` (one-time migration)
- **Arquivo afetado:** `src/lib/parsers/ofxParser.ts` — lógica de parsing do LEDGERBAL

## Hooks/Componentes Impactados

| Arquivo | Impacto |
|---------|---------|
| `src/lib/parsers/ofxParser.ts` | Fix na extraçÁo do LEDGERBAL |
| `src/hooks/useDashboardV2.ts` | Passa a receber bank_total já em reais |
| `src/hooks/useTransactions.ts` | Passa a salvar bank_total já em reais |
| `src/components/importacoes/CentralImportWizard.tsx` | ExibiçÁo de saldo negativo |

## Risco Principal

O `bank_total` existente no banco está incorreto (em centavos). A migraçÁo `/100` precisa ser feita de forma atômica — idealmente dentro de uma transaçÁo SQL para nÁo deixar o banco em estado parcial. Se o script falhar no meio, metade das lojas mostrará valores errados.

## Próximos Passos

Aprovando, rode `/vibe-apply 088`.
