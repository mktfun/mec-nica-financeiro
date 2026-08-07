# Spec 039 - Design do Motor de Pagamentos Parciais

## 1. Arquitetura do Banco de Dados
A tabela `transactions` continuará intacta. A mudança ocorrerá estritamente na forma como o motor alimenta essas transações.
O conceito de **Idempotência por `os_number`** (onde uma OS só podia gerar 1 transaçÁo na vida toda) será substituído por **Cálculo de Delta (Pagamentos Fracionados)**.

## 2. RefatoraçÁo do Motor (`useImportProcessor.ts`)
O processador de importaçÁo deixará de ignorar carros `em_aberto`. O ciclo de vida será:
1. O motor lê a planilha do Pátio.
2. Para cada linha (OS), ele cruza com o banco `patio_os`.
3. Calcula o Delta: `delta_pago = novo_valor_pago - antigo_valor_pago_salvo_no_banco` (se for OS nova, `antigo = 0`).
4. **Se `delta_pago > 0`**: O cliente depositou/pagou dinheiro. O sistema gera uma TransaçÁo (`type: 'in'`) exata no valor desse `delta_pago`.
5. **Data da TransaçÁo:** A transaçÁo usará o `targetDate` (Data de Competência) do lote de importaçÁo. Isso garante que o valor caia na tela de ConciliaçÁo exata do dia em que a planilha foi submetida, resolvendo a contabilidade diária.

## 3. UI da ConciliaçÁo (`conciliacao.tsx`)
- Atualizar a frase de Divergência Global:
  - De: *"O total arrecadado no sistema nÁo confere com a soma de (Físico + Maquininha)."*
  - Para: *"O Saldo Líquido do Sistema (Entradas - Saídas) nÁo confere com o Extrato Bancário."*
- Atualizar os cards de loja para refletirem exatamente a mesma nomenclatura.
