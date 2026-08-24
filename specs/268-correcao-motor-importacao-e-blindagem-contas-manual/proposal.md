# Proposal: Correção do Motor de Importação e Blindagem de Contas a Pagar (268)

## Problema
Após uma re-importação de arquivos no `CentralImportWizard`:
1. **Contas a Pagar Duplicadas (R$ 59.999,02 em vez de R$ 40.069,51):** O motor de importação salvava as contas da planilha em `daily_manual_bills` com `external_code` e atualizava `daily_snapshots.contas_a_pagar = 29.999,51`. A RPC e o card somavam a base com todas as linhas da tabela, duplicando a planilha.
2. **Saldo Bancário e Caixa Atual Inflados (Caixa R$ 243.637,49 vs Real R$ 175.685,99):** O Wizard usava a soma de créditos OFX (`t.type === 'in'`, R$ 88.716,23) como se fosse o `saldo_bancario`, e não subtraía o `saldo_negativo_itau` (R$ -39.498,51) na composição do `caixa_atual`.
3. **Duplicação de POS da Rede em Santo André:** Inserção de transação repetida de R$ 2.588,37 com datas internas ligeiramente diferentes gerando falso "A Compensar" de R$ 1.737,76 e inflando juros da Rede para R$ 6.148,50.

## Solução Proposta
1. **Blindagem de Contas a Pagar na RPC e no Wizard:**
   - Na RPC `get_daily_reconciliation_summary`, calcular `v_contas_extras` filtrando estritamente `WHERE date = v_target_date AND external_code IS NULL` (apenas lançamentos manuais autênticos como Pró-labore Daniel).
   - O `v_contas_base` permanece como `snapshot.contas_a_pagar` (Base da Planilha).
2. **Correção do Cálculo de Fechamento no `CentralImportWizard.tsx`:**
   - `saldo_bancario`: Usar a soma dos saldos finais dos extratos OFX (contas positivas R$ 102.999,61 - contas negativas Itaú R$ 39.498,51 = R$ 63.501,10).
   - `caixa_atual`: Calcular estritamente pela fórmula pericial:
     `caixa_atual = (saldo_bancario_positivo) + (dinheiro_mp) + (a_receber_manual) + (total_patio) - (saldo_negativo_itau)`.
3. **Limpeza e Deduplicação Estrita de POS:**
   - Limpar a transação duplicada de Santo André em `pos_transactions`.
   - Ajustar o snapshot e a sincronização para persistir `juros_rede = 5.650,15`, `total_patio = 88.212,39`, `dinheiro_mp = 13.278,00` e `a_receber_manual = 10.694,50`.

## Contratos de Dados
- **Tabela `daily_manual_bills`:**
  - `external_code IS NULL` → Despesas extras manuais adicionadas pelo usuário no modal.
  - `external_code IS NOT NULL` → Itens analíticos detalhados da planilha de contas a pagar.
- **Tabela `daily_snapshots`:**
  - `saldo_bancario`: R$ 63.501,10
  - `caixa_atual`: R$ 175.685,99
  - `contas_a_pagar`: R$ 29.999,51
  - `total_patio`: R$ 88.212,39
  - `juros_rede`: R$ 5.650,15
  - `dinheiro_mp`: R$ 13.278,00
  - `a_receber_manual`: R$ 10.694,50

## Features Existentes Impactadas
- `CentralImportWizard.tsx` (cálculo de snapshot final no fechamento da importação)
- RPC `get_daily_reconciliation_summary` (filtro `external_code IS NULL` para extras)
- `ResumoDiaPanel.tsx` (exibição de base vs extras)

## Risco Principal
- Re-importações futuras sobrescreverem o snapshot com fórmulas incorretas se o Wizard não for corrigido na raiz.
