# Spec 432: Auditoria Completa OFX x Rede e Calibração dos Matchers de Saldo e Compensação

Auditoria forense completa dos arquivos OFX e relatórios da Rede, diagnóstico cirúrgico da diferença de saldo em Mauá (-R$ 8.293,32 vs -R$ 9.285,52) e Jorge Beretta (R$ 48.493,02 vs R$ 48.111,02), eliminação de duplicidades no cálculo de compensação e calibração dos motores de match.

## User Review Required

> [!IMPORTANT]
> **RESTRIÇÃO CATERGÓRICA RESPEITADA:**
> - **ZERO MUTAÇÃO MANUAL NO BANCO DE DADOS:** Nenhum script fará `UPDATE` manual em tabelas de produção. O sistema processará os arquivos brutos importados autonomamente.
> - **NADA DE CRIAR DO ZERO:** Apenas calibrar funções, matchers e componentes existentes.
> - **MODELO CONTÁBIL D x D+1:**
>   - Mauá: Saldo fechamento 21/09 = `-R$ 13.956,84` + Maquininha 21/09 A Compensar = `+R$ 4.671,32` -> **Saldo Real Extrato 22/09 = -R$ 9.285,52 (-9k)**. O erro de `-R$ 8.293,32` ocorreu porque o OFX matinal de 22/09 já continha os `R$ 992,20` embutidos no `<BALAMT>`, e o sistema somou os `R$ 4.671,32` inteiros por cima, duplicando R$ 992,20.
>   - Jorge Beretta: Saldo fechamento 21/09 = `R$ 47.724,94` + Maquininha 21/09 A Compensar = `+R$ 382,00` + Rendimentos = `R$ 4,08` -> **Saldo Real Extrato 22/09 = R$ 48.111,02**. O erro de `R$ 48.493,02` ocorreu porque o `<BALAMT>` de 22/09 já continha os `R$ 382,00`, e o sistema somou `+ R$ 382,00` novamente como a compensar, duplicando R$ 382,00.

---

## Tabela de Auditoria Forense Consolidada (Pasta 22-09)

| Filial | Saldo OFX (`<BALAMT>`) | Saldo Fim do Dia 21 (`OFX/Extrato`) | Vendas Rede 21/09 (Líquido) | Créditos Rede no OFX 21/09 (D-1) | Créditos Rede em 22/09 (Extrato Papel) | Saldo Real em 22/09 (Extrato Papel) |
|---|---|---|---|---|---|---|
| **Mauá (MHE)** | -R$ 12.964,64 | **-R$ 13.956,84** | **R$ 4.671,32** (2 vendas) | R$ 1.841,28 (3 lotes) | R$ 992,20 (DB) + R$ 3.679,12 (AT) | **-R$ 9.285,52 (~ -9k)** |
| **Jorge Beretta (DHJV)** | R$ 48.111,02 | **R$ 47.724,94** | **R$ 382,00** (1 venda) | R$ 3.981,28 (1 lote) | R$ 382,00 (DB) | **R$ 48.111,02** |
| **Brasicar** | -R$ 78.374,25 | -R$ 78.374,25 | R$ 0,00 | R$ 14.611,29 (2 lotes) | Conforme extrato | -R$ 78.374,25 |
| **Capitão Car (CAP)** | R$ 1.403,57 | R$ 1.403,57 | R$ 5.866,02 (3 vendas) | R$ 4.327,33 (2 lotes) | A compensar D+1 | R$ 7.269,59 (proj.) |
| **Dom Pedro (DP)** | R$ 20.614,00 | R$ 20.614,00 | R$ 0,00 | R$ 7.556,35 (2 lotes) | Conforme extrato | R$ 20.614,00 |
| **Empório** | R$ 836,36 | R$ 836,36 | R$ 1.917,24 (2 vendas) | R$ 9.693,75 (3 lotes) | A compensar D+1 | R$ 2.753,60 (proj.) |
| **HD** | R$ 3.444,15 | R$ 3.444,15 | R$ 10.898,40 (1 venda) | R$ 0,00 | A compensar D+1 | R$ 14.342,55 (proj.) |
| **Jabaquara** | -R$ 755,39 | -R$ 755,39 | R$ 628,83 (1 venda) | R$ 4.027,92 (5 lotes) | A compensar D+1 | -R$ 126,56 (proj.) |
| **MP Auto** | R$ 22.206,12 | R$ 22.206,12 | R$ 0,00 | R$ 0,00 | Conforme extrato | R$ 22.206,12 |
| **Rei do Módulo** | R$ 2.657,61 | R$ 2.657,61 | R$ 5.037,91 (3 vendas) | R$ 4.260,91 (1 lote) | A compensar D+1 | R$ 7.695,52 (proj.) |

---

## Proposed Changes

### Parser de Extratos & Captura de Saldo

#### [MODIFY] [`src/lib/parsers/ofxParser.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/parsers/ofxParser.ts)
- Capturar a linha de fechamento canônico (`SALDO TOTAL DISPONÍVEL DIA`, `SALDO DO DIA`, `SALDO FINAL`) antes do descarte de junk, populando `closingBalance`.
- Se a conciliação for para o dia das transações (D), usar o saldo de fechamento do dia D em vez do saldo pós-abertura de D+1 (`<LEDGERBAL><BALAMT>`), evitando que créditos já parciais da manhã de D+1 contaminem a base de cálculo.

---

### Motor de Reconciliação Rede x OFX

#### [MODIFY] [`src/lib/matchers/reconciliadorRedeOfx.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/matchers/reconciliadorRedeOfx.ts)
- Ajustar a identificação de créditos liquidados no extrato: se o lote da Rede já constar no extrato bancário importado, registrar como `settlement_status = 'entrou'` / `liquidado`.
- Tratar apenas as vendas ainda pendentes de crédito bancário como `a_compensar`.

#### [MODIFY] [`src/components/importacoes/CentralImportWizard.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/importacoes/CentralImportWizard.tsx)
- **Eliminar a sobrescrita forçada** (linhas 2305-2310) que executava `update({ settlement_status: 'a_compensar' })` em todas as pos_transactions, respeitando os matches identificados pelo `ReconciliadorRedeOFX`.

---

### Hook de Conciliação e Card da Filial

#### [MODIFY] [`src/hooks/useBackendConciliacao.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useBackendConciliacao.ts)
- Eliminar o fallback forçado `finalNaoEntrou = redeLiq` quando `storeNaoEntrou` já reflete as pendências reais apuradas.

#### [MODIFY] [`src/components/conciliacao/StoreCardModulo1.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/StoreCardModulo1.tsx)
- Clareza contábil:
  - `SALDO BANCO (OFX)`: Exibe o saldo da conta.
  - `REDE`: Se as vendas já foram liquidadas na conta, exibe badge `ENTROU` e `A COMPENSAR: R$ 0,00` (sem somar novamente ao saldo projetado).
  - Se ainda não foram liquidadas, exibe badge `A COMPENSAR (+ R$ X)`.

---

### Backend SQL / Matcher de Saídas

#### [MODIFY] [`supabase/migrations/20260922000006_calibrate_auto_match_saidas_semantics.sql`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/)
- Calibrar a Camada 4 da RPC `auto_match_saidas` para proibir match cego exclusivamente por valor se os nomes forem antagônicos (ex: Prolabore Henrique x Cartão Daniel).

---

## Verification Plan

### Automated Tests & Quality Gates
- Terminal Gate: `npm run build` limpo (zero erros de compilação ou linter).
- Script headless de conferência (`node scratch/verify_balances_math.cjs`):
  - Mauá: Comprovar que saldo fecha em `-R$ 9.285,52` (-9k).
  - Jorge Beretta: Comprovar que saldo fecha em `R$ 48.111,02`.
  - Zero duplicações de valores.

### Manual Verification
- O usuário confere os cards das 10 filiais e valida que os saldos de Mauá e Jorge Beretta batem centavo por centavo com os extratos em papel que ele tem em mãos.
