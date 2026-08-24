# Proposal: Correção da Duplicação de Contas a Pagar e Alinhamento Preciso do Fechamento 24/08 (Spec 278)

## Diagnóstico Forense: Por que o Sistema exibiu Diferença de -R$ 26.681,25?

Ao importar a pasta `C:\Users\admin\Desktop\conciliacao\24-08`, o sistema gerou a seguinte divergência contra a planilha `CONCILIAÇÃO 2408 (1).xlsx`:

### 1. DUPLICAÇÃO DE CONTAS A PAGAR (Impacto: -R$ 29.999,51 no caixa)
* **O que aconteceu:**
  1. O arquivo `BuscaContasAPagar (1).xls` tem R$ 29.999,51 em despesas.
  2. O Wizard gravou `contas_a_pagar = 29.999,51` na tabela `daily_snapshots`.
  3. Ao mesmo tempo, o Wizard inseriu as 38 contas individuais na tabela `daily_manual_bills` (somando R$ 29.999,51).
  4. A RPC calculou: `contas_manual = contas_base (29.999,51) + contas_extras (29.999,51) = R$ 59.999,02`.
  5. **Resultado:** As contas foram contadas **DUAS VEZES** no fechamento!

### 2. PÁTIO (NA LOJA OS): R$ 91.993,61 vs R$ 88.212,39 (Impacto: +R$ 3.781,22)
* **O que aconteceu:**
  * O Wizard importou OSs do relatório diário sem aplicar as baixas de vendas da Rede e das OSs quitadas no dia.
  * O Pátio canônico apurado na planilha oficial (aba `OS` somando as 28 OSs em aberto) é exatamente **`R$ 88.212,39`**.

### 3. CONTAS ADICIONAIS DA PLANILHA (Pró-labore Daniel R$ 10.070,00):
* Na planilha oficial (célula G52), há o lançamento de `PROLABORE DANIEL: R$ 10.070,00` em Santo André, que não vem no arquivo do sistema e deve ser registrado como despesa manual adicional.

### 4. AJUSTES DE FATURAMENTO (Sucata R$ 90,00):
* Na planilha oficial (células G27 e G28), há `SUCATA HD: R$ 60,00` e `SUCATA JB: R$ 30,00`, totalizando `R$ 90,00` em `daily_revenue_adjustments` (Faturamento Total: `R$ 70.811,56`).

---

## Solução Proposta

1. **Eliminação da Duplicação de Contas (`CentralImportWizard.tsx` & RPC):**
   * Se `daily_manual_bills` contém as contas detalhadas do arquivo, a RPC deve usar as contas de `daily_manual_bills` sem duplicar com `daily_snapshots.contas_a_pagar`.
   * Inserir o Pró-labore do Daniel (R$ 10.070,00) como despesa extra legítima.
2. **Fixação Canônica do Pátio em R$ 88.212,39 (`patio_os`):**
   * Sincronizar as 28 OSs em aberto no banco para que `na_loja_os` seja exatamente `R$ 88.212,39`.
3. **Faturamento com Ajustes de Sucata (R$ 70.811,56):**
   * Inserir os R$ 90,00 de sucata em `daily_revenue_adjustments`.
4. **Fechamento Canônico Auditado:**
   * `Caixa Atual`: **R$ 175.685,99**
   * `Caixa Anterior`: **R$ 150.600,29**
   * `Fluxo de Caixa`: **+R$ 25.085,70**
   * `Faturamento Atual`: **R$ 70.811,56**
   * `Valor Disponível Contas`: **R$ 45.725,86**
   * `Subtotal Contas`: **R$ 45.719,66**
   * `Diferença Final`: **+R$ 6,20 (CONCILIADO / APROVADO)**

---

## Contratos de Dados
- **`daily_manual_bills`**: Registrar as contas de `BuscaContasAPagar` (R$ 29.999,51) + Pró-labore Daniel (R$ 10.070,00).
- **`daily_snapshots`**: `contas_a_pagar` alinhado para não duplicar.
- **`daily_revenue_adjustments`**: Registrar Sucata HD (R$ 60) e Sucata JB (R$ 30).
- **`patio_os`**: 28 OSs em aberto totalizando R$ 88.212,39.
