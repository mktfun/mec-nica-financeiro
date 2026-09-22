# Proposal — Spec 427: Correção do Caixa Atual no Auto-Save do Wizard (Inclusão de Cartões a Compensar e Cofre)

## 1. Contexto & Diagnóstico Forense

Ao realizar a importação e fechamento do dia **18/09/2026** utilizando os 28 arquivos disponibilizados em `C:\Users\admin\Desktop\conciliacao\09-26\18-09`, o sistema concluiu todas as etapas de ingestão e conciliação, porém o **Motor Pericial de Auto-Healing** acusou divergência residual:

> `⚠️ Fechamento com divergência residual de R$ 32647.13` (conforme registrado no log `auditoria-logs-2026-09-18 (1).json`).

### Diagnóstico Matemático Centavo por Centavo

A inspeção detalhada no banco de dados (`daily_snapshots` e `pos_transactions`) e no código do `CentralImportWizard.tsx` (linhas 2062-2158) revelou a causa-raiz exata da discrepância:

1. **Fórmula Incompleta do Caixa Atual no Wizard (`CentralImportWizard.tsx:2062-2064`):**
   ```typescript
   const totalRecebiveis = manualDinheiroMp + manualAReceber;
   const caixaAtualCalculado = saldoBancosPositivo + totalRecebiveis + veiculosPatioValor - saldoNegativoItau;
   ```
   O cálculo do `caixaAtualCalculado` considerou apenas:
   - `saldoBancosPositivo`: R$ 127.466,80 (saldo positivo estrito das contas OFX)
   - `totalRecebiveis`: R$ 36.845,67 (`dinheiro_mp` R$ 28.316,00 + `a_receber_manual` R$ 8.529,67)
   - `veiculosPatioValor`: R$ 64.663,12 (saldo de OSs em aberto)
   - `saldoNegativoItau`: R$ 27.048,57 (cheque especial do Itaú)
   - **Total Calculado:** R$ 201.927,02.

2. **Omissão Contábil dos Ativos em Trânsito / A Compensar:**
   Conforme os princípios contábeis do SSOT definidos em `ResumoDiaPanel.tsx` (linhas 288-301), `useBackendConciliacao.ts` (linhas 448-482) e na migration canônica `20260917000001_redefine_daily_reconciliation_summary_ssot.sql` (linhas 304-337), o **Pilar 1 (Bancos e Ativos em Trânsito)** é composto por:
   $$\text{Total Positivo Consolidado} = \text{Saldo Bancos Positivo (OFX)} + \text{Dinheiro no Cofre das Lojas} + \text{Cartões a Compensar (REDE)} - \text{Devoluções REDE}$$
   
   No fechamento de 18/09:
   - **Cartões REDE a Compensar (Spec 426):** R$ 31.840,45 (20 vendas líquidas do dia)
   - **Dinheiro em Trânsito / Cofre:** R$ 806,68
   - **Soma Omitida:** $$31.840,45 + 806,68 = \mathbf{R\$\ 32.647,13}$$

3. **Efeito Cascata na Equação de Fechamento:**
   $$\text{Fluxo de Caixa} = \text{Caixa Atual} - \text{Caixa Anterior} = 201.927,02 - 260.114,65 = -58.187,63$$
   $$\text{Valor Disponível} = \text{Faturamento} - \text{Fluxo de Caixa} = 31.329,67 - (-58.187,63) = 89.517,30$$
   $$\text{Subtotal Contas} = 54.945,40 + 1.924,77 = 56.870,17$$
   $$\text{Diferença Final} = \text{Valor Disponível} - \text{Subtotal Contas} = 89.517,30 - 56.870,17 = \mathbf{R\$\ 32.647,13}!$$

4. **Por que a RPC de Auto-Healing falhou:**
   O snapshot foi persistido no banco com `is_closed: true` e `diferenca_final: 32647.13`. Quando a RPC `run_autonomous_reconciliation_loop('2026-09-18')` foi disparada, ela chamou `get_daily_reconciliation_summary('2026-09-18', false)`.
   Por já existir um snapshot fechado, a RPC leu a `diferenca_final` congelada no snapshot (`32647.13`), não encontrando nenhuma contrapartida não registrada de 32k para compensar, retornando status não conforme e alertando o usuário.

---

## 2. Objetivos da Spec 427

1. **Unificar o Cálculo do Caixa Atual no `CentralImportWizard.tsx`:**
   Incorporar no cálculo do auto-save os valores de `cartoesACompensarTotal` (apurados a partir das vendas líquidas da REDE) e `dinheiroLojaCofreTotal` (dinheiro em trânsito apurado das OSs/cofre).
2. **Persistir os Metadados Canônicos no `daily_snapshots`:**
   Gravar explicitamente `cartoes_a_compensar`, `dinheiro_lojas`, `dinheiro_em_lojas`, `devolucoes_rede` e `total_saldo_banco_positivo` no JSON `metadata` do snapshot.
3. **Equacionamento Matemático Perfeito:**
   Garantir que com a inclusão de `cartoes_a_compensar + cofre`:
   - `caixaAtualCalculado` passe de R$ 201.927,02 para **R$ 234.574,15**.
   - `fluxoCalculado` passe para **-R$ 25.540,50**.
   - `valorDispCalculado` passe para **R$ 56.870,17**.
   - `diferencaCalculada` convirja para **R$ 0,00**.
4. **Auto-Healing em Conformidade Total:**
   Garantir que a RPC `run_autonomous_reconciliation_loop` receba delta inicial **R$ 0,00** e aprove o fechamento imediatamente com `status: 'approved'`.
5. **Correção Retroativa do Snapshot de 18/09:**
   Ajustar o registro existente de 18/09 no Supabase para que a tela de conciliação já exiba o dia 18/09 100% conciliado e zerado.

---

## 3. Blast Radius

- **Arquivo Principal:** `src/components/importacoes/CentralImportWizard.tsx` (linhas 2060 a 2165)
- **Banco de Dados:** Tabela `daily_snapshots` (registro `date = '2026-09-18'`)
- **Impacto em Telas:**
  - `src/components/conciliacao/ResumoDiaPanel.tsx` (consome o snapshot fechado ou calcula dinâmico; passará a convergir sem discrepâncias)
  - `src/hooks/useBackendConciliacao.ts` (lê os metadados do snapshot congelado e reflete conformidade)
  - Modal de Auditoria Pericial (exibirá delta R$ 0,00 e selo Conforme)

---

## 4. Plano de Verificação

1. **Verificação de Compilação & Tipagem:** `npm run build` com código de retorno 0.
2. **Validação do Snapshot de 18/09 via Script Node:**
   - Verificar `caixa_atual = 234.574,15`
   - Verificar `valor_disp_contas = 56.870,17`
   - Verificar `subtotal_contas = 56.870,17`
   - Verificar `diferenca_final = 0,00`
3. **Validação da RPC `run_autonomous_reconciliation_loop('2026-09-18')`:**
   - Retorno esperado: `{ is_conforme: true, final_delta: 0 }`.
