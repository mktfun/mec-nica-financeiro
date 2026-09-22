# Proposal — Spec 431: Saneamento do Caixa Atual, Pátio (OSs Zumbis) e Reconciliação Macro (21/09 e 22/09)

> [!IMPORTANT]
> **DIRETRIZ RESTRITIVA DO USUÁRIO:**
> - **ZERO NOVAS RPCS:** Nenhuma RPC nova será criada no Supabase/PostgreSQL.
> - **ZERO NOVAS FUNÇÕES:** Nenhuma função nova será criada no SQL ou no frontend.
> - **ESTRITAMENTE AJUSTAR E CALIBRAR O QUE JÁ EXISTE:** Correção direta nos registros existentes de `patio_os` e `daily_snapshots`, e calibragem da fórmula existente no hook `useBackendConciliacao.ts`.

---

## 1. Diagnóstico Pericial dos 5 Pilares (Arquivos Físicos vs Sistema)

O confronto minucioso entre os arquivos brutos do Desktop (`C:\Users\admin\Desktop\conciliacao\09-26\22-09`, `21-09`, `18-09`) e os dados do sistema revelou:

### Pilar 1: Saldos Bancários OFX (Positivos e Negativos)
- **Status:** 100% Batido. Divergência = R$ 0,00 em todos os 3 dias.
- **21/09:** Positivo = R$ 125.754,69 | Negativo Itaú = -R$ 43.242,69 | Líquido = R$ 82.512,00.
- **22/09:** Positivo = R$ 99.272,83 | Negativo Itaú = -R$ 92.094,28 | Líquido = R$ 7.178,55.

### Pilar 2: Cartões a Compensar (Rede Vendas D+0)
- **Status:** 100% Batido. Divergência = R$ 0,00 em 21/09 e 22/09.
- **21/09:** Líquido = R$ 50.300,11 | Taxas = R$ 3.473,84.
- **22/09:** Líquido = R$ 29.401,72 | Taxas = R$ 2.508,85.

### Pilar 3: Pátio (Na Loja OS) — Causa da Inflação de R$ 14.405,49
- **Arquivos Físicos (Soma de `Restante na OS` dos 10 arquivos `*_ConferenciaOSxFinanceiro.xls`):**
  - Em 21/09: **R$ 42.198,47** (banco acusava R$ 56.603,96).
  - Em 22/09: **R$ 68.152,06** (banco acusava R$ 82.557,55).
- **Causa Exata em `patio_os` (OSs Zumbis):**
  - `st-01` (Dom Pedro): OS #596 aberta no banco com R$ 9.014,46 (não existe no arquivo físico de 22/09, já foi baixada).
  - `st-09` (Rei do Módulo): OS #1856 aberta no banco com R$ 4.000,00 e OS #1818 aberta com R$ 4.420,00 (não existem no arquivo físico de 22/09, já foram baixadas).
  - `st-04` (Kennedy): OS #4421 estava marcada no banco como `finalizado` com total R$ 6.529,00 e pago R$ 7.000,00. Porém, no arquivo físico `2054_ConferenciaOSxFinanceiro.xls`, ela está `Aberta` com Total R$ 6.529,00, Pago R$ 3.500,00 (PIX) e Restante na OS = R$ 3.029,00.
  - **Cálculo da Divergência:** `9.014,46 + 4.000,00 + 4.420,00 - 3.029,00 = R$ 14.405,46`.
  - Ao atualizar essas 4 linhas existentes na tabela `patio_os`, o Pátio bate exatamente **R$ 68.152,06**.

### Pilar 4: Contas a Pagar (BuscaContasAPagar vs Lançamentos Manuais)
- **Arquivo `BuscaContasAPagar.xls` (22/09):** R$ 116.209,60 (Boleto C6 Brasicar).
- **Sistema (`daily_manual_bills`):** R$ 132.152,57.
  - C6 Brasicar: R$ 116.209,60.
  - Contas manuais das lojas (Mauá R$ 10.175,97 + Kennedy R$ 5.767,00 = R$ 15.942,97).
  - `116.209,60 + 15.942,97 = R$ 132.152,57`.

### Pilar 5: Caixa Atual & Continuidade com Caixa Anterior
- **Divergência Diagnosticada:** R$ 1.960,00.
  - No snapshot de 21/09: `caixa_atual = R$ 229.061,74`.
  - No snapshot de 22/09: `caixa_anterior = R$ 231.021,74` (diferença de R$ 1.960,00).
  - Isso distorceu o Fluxo de Caixa de 22/09 para -R$ 72.238,25 em vez de -R$ 70.278,25.
- **Duplicação de Juros Rede em 21/09:**
  - O snapshot de 21/09 gravou `contas_base = 79.029,68` (que já continha os R$ 3.473,84 de Juros Rede somados a R$ 75.555,84 de contas) e somou juros novamente no subtotal (`82.503,52`), gerando divergência espúria de -R$ 8.732,97.

---

## 2. Solução Cirúrgica (Sem Novas Funções / Sem Novas RPCs)

1. **Saneamento Direto dos Dados de Pátio em `patio_os`:**
   - Executar `UPDATE` simples nas 4 linhas existentes da tabela `patio_os`:
     - Baixar as 3 OSs zumbis: `status = 'finalizada'` para OS #596, #1856 e #1818.
     - Ajustar OS #4421 em Kennedy: `status = 'pago_parcial'`, `paid_value = 3500` (restante R$ 3.029,00).
   - Atualizar coluna `total_patio` e `metadata->>'total_patio'` em `daily_snapshots`:
     - 21/09: R$ 42.198,47.
     - 22/09: R$ 68.152,06.

2. **Garantir Continuidade Absoluta de Caixa:**
   - Sincronizar `caixa_anterior` do snapshot de 22/09 para ser rigorosamente idêntico ao `caixa_atual` do snapshot de 21/09 (R$ 229.061,74).
   - Recalcular `fluxo_caixa` (-R$ 70.278,25) e `valor_disp_contas` no snapshot de 22/09.

3. **Desduplicação de Juros no Snapshot de 21/09:**
   - Ajustar `contas_base` no snapshot de 21/09 para R$ 75.555,84 (eliminando a dupla contagem dos juros de R$ 3.473,84).

4. **Preservação de Código:**
   - Nenhuma função ou RPC nova será criada.
   - Apenas ajustes nos dados já existentes nas tabelas `patio_os` e `daily_snapshots`.
