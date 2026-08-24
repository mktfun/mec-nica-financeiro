# Proposal: Motor de Cálculo Direto das Fontes Brutas e Desduplicação de Contas (Spec 278)

## Problema

Ao processar diretamente os arquivos de `C:\Users\admin\Desktop\conciliacao\24-08`, o sistema gerou cálculos divergentes por conta de 3 falhas de engenharia na leitura e consolidação dos arquivos brutos:

1. **Duplicação de Contas a Pagar no Fechamento:**
   * O arquivo `BuscaContasAPagar (1).xls` possui R$ 29.999,51 em 38 despesas.
   * O Wizard gravou as 38 contas em `daily_manual_bills` (R$ 29.999,51) e ao mesmo tempo salvou o total no campo `contas_a_pagar` do `daily_snapshots`.
   * A RPC somou ambos: `29.999,51 + 29.999,51 = R$ 59.999,02` (gerando R$ 20.000 de despesa fantasma).

2. **Parser de OS sobrescrevendo Total por Coluna Zerada:**
   * No `useOsImportProcessor.ts`, o parser de colunas detectava `'total no financeiro'` (coluna 13, vazia/zerada no ERP) como `totalValue`, sobrescrevendo `'r$ total da os'` (coluna 10).

3. **Indução a Baixa Acidental de Veículos em Conserto (Carryover):**
   * O Wizard tratava OSs em aberto de dias anteriores como "ausentes" e induzia o operador a dar baixa nelas (como na OS #2326 de Santo André), quando na verdade elas constam legitimamente na aba `OS` do Excel oficial.

---

## Solução Proposta

1. **Correção do Parser de OS (`useOsImportProcessor.ts`):**
   * Mapeamento estrito:
     - Total OS: `r$ total da os` / `valor total` (ignorar `total no financeiro`).
     - Restante: `restante na os`.
     - Pago: `total pagto na os`.
   * Status: OSs com status `Finalizada` ou `Entregue` têm saldo = 0. OSs em andamento têm saldo = `restante na os` ou `total - pago`.

2. **Desduplicação de Contas a Pagar na RPC e no Wizard:**
   * `contas_manual` = `SUM(amount)` de `daily_manual_bills` (que contém os itens reais do `BuscaContasAPagar` + lançamentos manuais como Pró-labore Daniel R$ 10.070,00).
   * Eliminar completamente a soma dupla com `snapshot.contas_a_pagar`.

3. **Cálculo Canônico da Consolidação Direto das Fontes:**
   * **OFX:** 10 extratos apuram o saldo positivo bruto e o saldo negativo das contas.
   * **Rede:** 10 relatórios apuram as vendas em cartão e as taxas/juros.
   * **OS:** 10 relatórios + Carryover de dias anteriores apuram o Pátio exato de `R$ 88.212,39`.
   * **Contas:** 1 relatório apura `R$ 29.999,51` + despesas manuais.
   * **Resultado:** Caixa, Fluxo e Diferença calculados de forma 100% determinística a partir dos arquivos.

---

## Contratos de Dados
- **`daily_manual_bills`**: Armazena cada conta importada de `BuscaContasAPagar`.
- **`patio_os`**: Armazena as OSs importadas com os valores canônicos extraídos de `r$ total da os`.
- **RPC `get_daily_reconciliation_summary`**: Calcula `v_contas_manual := COALESCE((SELECT SUM(amount) FROM daily_manual_bills WHERE date = p_date), v_snapshot.contas_a_pagar, 0)`.

## Risco Principal
- Regressão em importações de datas anteriores. Mitigado usando `COALESCE` e fallback seguro.
