# Proposta: Correção do Somatório de Restante na OS (Pátio) e Sincronização Estrita com os Relatórios Importados (Spec 236)

## 1. Diagnóstico do Problema (Causa Raiz)

Identificamos com precisão a causa da divergência de **R$ 92k no sistema vs R$ 77k / R$ 88k nos relatórios**:

1. **Acúmulo de OSs Residuais de Importações Anteriores no Banco (`patio_os`):**
   - No dia 14/08 (Marco Zero), foram inseridas no banco 4 OSs legadas com placa `'N/I'` e nomes de loja antigos (`'Planalto - BRASICAR'`, `'Rudge Ramos - CAP'`, `'Santo André - HD'`), totalizando **R$ 14.995,33** em saldo pendente:
     - Planalto: OS #18412 = R$ 436,60
     - Rudge Ramos: OS #8659 (R$ 1.200,00) e OS #8689 (R$ 4.140,00) = R$ 5.340,00
     - Santo André: OS #2326 = R$ 9.218,73
   - Quando o operador importou o novo lote de 17/08 (`CAP 1708.xls`, `DP 1708.xls`, etc.), o sistema inseriu as novas OSs mas **manteve as OSs legadas antigas ativas no banco**.
   - Resultado: A consulta do banco somou **R$ 77.751,44 (Relatórios do dia 17)** + **R$ 14.995,33 (Resíduo de 14/08)** = **R$ 92.746,71 (~92k)**.

2. **Regra Real da Planilha (`CONCILIAÇÃO 1408.xlsx` / Célula G16 da aba SALDO):**
   - Na planilha real do financeiro, o valor de **NA LOJA (G16)** é calculado estritamente como:
     $$\text{NA LOJA} = \sum_{i=1}^{10} \text{Total da coluna 'Restante na OS' do relatório da Filial } i$$
   - Cada importação de OS de uma filial representa o **retrato fiel e atualizado do pátio daquela loja naquela data**. As OSs que não estão mais no relatório foram entregues/faturadas e não podem continuar inflando o saldo do pátio.

---

## 2. Solução Proposta

### 🧮 2.1 Sincronização Ativa por Lote / Loja no Importador (`useImportProcessor.ts` & `CentralImportWizard.tsx`)
- Ao importar o relatório de OS de uma loja em uma data $D$:
  1. O sistema lê diretamente a coluna **`Restante na OS`** (`colMap.openValue`), garantindo que o valor remanescente de cada ordem seja **exatamente o valor oficial do relatório** (`total_value - paid_value = Restante na OS`).
  2. Para a loja que está sendo importada, qualquer OS antiga no banco que **não conste mais no relatório oficial mais recente** tem seu status atualizado para `'finalizado'` (ou é desativada do pátio ativo), garantindo que o somatório da loja no banco coincida **centavo por centavo com o rodapé 'TOTAL' do arquivo `.xls`**.

### 🗄️ 2.2 Limpeza dos Resíduos Órfãos no PostgreSQL
- Remover/finalizar os 4 registros legados sem placa (`'N/I'`) do Marco Zero que ficaram duplicados em `patio_os`.

### ⚡ 2.3 Atualização da RPC `get_daily_reconciliation_summary`
- Garantir que a RPC agrupe e some exclusivamente as OSs com saldo pendente (`(total_value - paid_value) > 0`) pertencentes ao backlog ativo da data selecionada, retornando para cada filial exatamente o total do seu relatório.

---

## 3. Critérios de Aceite

1. ✅ A soma de **Na Loja OS** de cada uma das 10 filiais no sistema bate **centavo por centavo** com a soma da coluna `Restante na OS` do arquivo `.xls` importado.
2. ✅ Para o dia 17/08, a soma de Na Loja OS no sistema é exatamente **R$ 77.751,44** (ou o valor exato dos relatórios ativos), eliminando os 15k de resíduos órfãos.
3. ✅ O Card 4 do Pilar ("NA LOJA OS") em `ResumoDiaPanel.tsx` e a coluna `Na Loja OS` da tabela de lojas exibem os valores 100% fiéis aos relatórios.
