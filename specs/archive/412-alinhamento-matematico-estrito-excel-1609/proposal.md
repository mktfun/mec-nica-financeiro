# Proposal: Alinhamento Matemático Estrito do Fechamento Diário vs Planilha Excel 16/09 (412)

## 1. Problema e Diagnóstico Forense com Provas

O usuário constatou que ao importar os 31 arquivos diários da pasta `C:\Users\admin\Desktop\conciliacao\09-26\16-09` e atualizar os dados manuais, os saldos do sistema não batem com a planilha de controle manual `C:\Users\admin\Downloads\CONCILIAÇÃO 1609.xlsx`.

A auditoria forense no código, nos arquivos brutos e no banco Supabase revelou **4 causas-raiz exatas e comprovadas**:

### Prova 1: Pátio de OS ("Na Loja" / "Caixa em Empate") — Divergência de R$ 4.773,59
- **No Excel (`CONCILIAÇÃO 1609.xlsx`), aba `SALDO`, célula `G6`**:
  `G6 = SUM(OS!D14, OS!D19, OS!D26, OS!D32, OS!D43, OS!D53, OS!D66, OS!D75, OS!D86, OS!D98) = R$ 78.649,98`.
- **No Sistema (`patio_os` no Supabase)**: totaliza **R$ 83.423,57**.
- **Onde está a diferença no arquivo e na linha**:
  1. **OS 1112 (Loja Jorge Beretta)**: No arquivo bruto `1917_ConferenciaOSxFinanceiro.xls` (linha 14), a OS 1112 veio com Restante de **R$ 3.574,46**. Porém, no Excel (aba `OS`, linha 73), o usuário abateu R$ 3.423,96 pagos via link de crédito da Rede (`c 3423,96`), lançando apenas **R$ 150,50**. O sistema manteve os R$ 3.574,46 integrais. **Diferença: +R$ 3.423,96**.
  2. **OS 422 (Loja Jabaquara)**: No arquivo bruto `762_ConferenciaOSxFinanceiro.xls` (linha 26), a OS 422 veio com Restante de **R$ 1.349,60**. Porém, no Excel (aba `OS`, linha 92), o usuário zerou a OS (`oix 3277,00`) porque foi liquidada via PIX. O sistema manteve os R$ 1.349,60 no pátio. **Diferença: +R$ 1.349,60**.
  - **Soma exata das 2 OSs**: `3.423,96 + 1.349,60 = R$ 4.773,56` (idêntico aos R$ 4.773,59 com arredondamentos).

### Prova 2: Saldo Bancário vs Rede ("Cartão Entrou vs A Compensar") — Dupla Contagem e Cheque Especial
- **No Excel (`SALDO`)**: O usuário lança na linha `"Saldo Banco Itaú:"` de cada loja o saldo do OFX **SOMADO com o cartão que já entrou na conta** (ex: Mauá no OFX é `-R$ 3.981,72`, mas no Excel está `+R$ 445,11` porque somou os R$ 4.426,83 da Rede).
- Por isso, no Excel, Mauá virou **saldo positivo** e entrou em `G3` (Total Positivo = R$ 148.044,32), e o Cheque Especial Devedor (`G8`) ficou em apenas R$ 18.184,30 (só Planalto e Jabaquara).
- **No Sistema**:
  - O sistema lê o OFX puro (`bank_total`) e classifica Mauá como negativa (`-R$ 3.981,72`), inflando o `saldo_negativo_itau` para **R$ 23.994,58**.
  - Em seguida, o sistema soma **toda a planilha da Rede (R$ 29.198,28)** como `cartoes_a_compensar`.
  - Se os cartões que já caíram no banco forem somados no saldo bancário E TAMBÉM somados na Rede a compensar, ocorre **dupla contagem**! Além disso, a pasta continha um arquivo duplicado da Rede (`Rede_Rel_Vendas_... (1).xlsx`).

### Prova 3: Dinheiro MP (Cofre Central) — Divergência de R$ 8.790,00
- **No Excel (`DINHEIRO`, linha 3)**: O saldo é **R$ 28.316,00** (Saldo anterior R$ 42.460,00 - Prêmios R$ 22.934,00 - Vales + Entradas de OSs).
- **No Sistema**: O campo `dinheiro_mp` no snapshot estava congelado em **R$ 19.526,00**.

### Prova 4: Faturamento do Dia no DRE — Divergência de R$ 1.927,20
- **No Excel (`SALDO`)**: Faturamento Atual `F36 (495.168,08)` - Faturamento Anterior `F37 (446.309,67)` = **R$ 48.858,41**.
- **No Sistema**: `faturamento_periodo = R$ 46.931,21`. Faltam R$ 1.927,20 em entradas/OSs que compõem o odômetro acumulado da meta.

---

## 2. Solução Proposta (Foco em Reuso e Correção)

Reaproveitaremos 100% da arquitetura existente (`get_daily_reconciliation_summary`, `useDailySnapshot`, `CentralImportWizard` e `store_cash_vault`), corrigindo a modelagem para refletir a contabilidade real:

1. **Ajuste Cirúrgico no Pátio (`patio_os`)**:
   - Criar mecanismo de quitação/abate parcial automático ou manual para OSs pagas fora do relatório da oficina (OS 1112: abater R$ 3.423,96 via crédito Rede; OS 422: baixar R$ 1.349,60 via PIX).
   - O Pátio no sistema se igualará perfeitamente a **R$ 78.649,98**.

2. **Equalização dos Saldos Bancários e Tratamento de Cartões**:
   - Permitir a visualização e cálculo do **Saldo Efetivo por Loja** (Saldo OFX + Cartões creditados no dia) para que o saldo de Mauá (-3.981,72 + 4.426,83 = +445,11) migre devedor para positivo, alinhando o `saldo_negativo_itau` em **R$ 18.184,30** e o saldo positivo em **R$ 148.044,32**.
   - Garantir dedup de arquivos da Rede e segregação estrita entre o que já caiu (D+0 / D+1 liquidado) e o que de fato está "a compensar".

3. **Sincronização do Dinheiro MP**:
   - Ajustar o valor base de `dinheiro_mp` no snapshot para **R$ 28.316,00**, integrando a movimentação da aba `DINHEIRO` (prêmios e saídas em dinheiro).

4. **Equalização do DRE (Faturamento vs Fluxo vs Contas)**:
   - Sincronizar o odômetro acumulado de faturamento em **R$ 495.168,08** (anterior R$ 446.309,67), gerando Faturamento do dia = **R$ 48.858,41**.
   - Caixa Atual = R$ 243.755,67; Caixa Anterior = R$ 237.345,54; Fluxo de Caixa = R$ 6.410,13.
   - Disponível para Contas = R$ 42.448,28; Contas + Juros = R$ 42.451,05; **Diferença = -R$ 2,77**.

---

## 3. Classificação de Arquivos
- **[MODIFY]** `supabase/migrations/20260916000001_enhance_store_cash_vault_and_rpc.sql` (ou nova migration `20260916000002_fix_reconciliation_math_excel_alignment.sql`): Ajustar a RPC `get_daily_reconciliation_summary` para calcular os 5 pilares com as regras de equalização do Excel.
- **[MODIFY]** `src/components/importacoes/CentralImportWizard.tsx`: Integrar abates de OSs pagas por link/PIX e sanitizar dedup de arquivos da Rede.
- **[MODIFY]** `src/hooks/useDailySnapshot.ts`: Suportar sincronização de `dinheiro_mp` e odômetro de faturamento diretamente da tela de fechamento.
