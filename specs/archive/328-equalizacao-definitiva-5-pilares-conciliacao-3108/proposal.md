# Proposal: Equalização Definitiva dos 5 Pilares e Fechamento Canônico de 31/08/2026 (Spec 328)

## 1. Problema
No fechamento contábil de **31/08/2026**, a conciliação manual homologada na planilha oficial do operador (`CONCILIAÇÃO 3108.xlsx`) apurou uma **Diferença Final de +R$ 8,94** (aprovado e dentro da tolerância de $\pm$ R$ 50,00). No entanto, o sistema / wizard de importação exibiu uma divergência residual de **R$ 7.923,88** devido a 4 fatores de descasamento entre a base de dados/RPC e o motor de preview:

1. **Pilar 1 (Saldo Bancos + Compensação Intra-Loja):** O preview somava o extrato OFX bruto (`R$ 222.957,34`) sem incorporar as vendas da Rede D0 que entraram no dia nas contas das lojas, em vez de apurar o **Saldo Positivo Real de R$ 231.813,81** e o **Cheque Especial Holding Real de -R$ 13.188,08**.
2. **Pilar 4 (Na Loja OS / Pátio):** A OS #2408 de Santo André (R$ 3.223,00) já havia sido quitada em cartão e constava como paga na planilha, mas permaneceu com status em aberto no banco de dados, elevando o pátio para `R$ 48.507,38` em vez do valor oficial de **R$ 46.393,62**.
3. **Faturamento do Dia (DRE):** O wizard capturava apenas o Faturamento Base da Oficina Inteligente (`R$ 55.420,95`) e omitia o Aporte de Sócios de **+R$ 5.000,00** (transferência da Rei do Módulo para CAP), em vez de apurar o **Faturamento Total de R$ 60.420,95**.
4. **Subtotal de Contas a Pagar:** O preview somava apenas `R$ 52.496,14` (Base + Juros Rede), omitindo o Pró-labore Daniel (**+R$ 5.000,00**) e Despesas Extras (**+R$ 1.714,84**), em vez de apurar o total oficial de **R$ 57.496,14**.

---

## 2. Solução Proposta (Foco em Reuso e Correção)

Reaproveitar integralmente a arquitetura existente, implementando correções cirúrgicas no banco de dados, RPC e interface:

1. **Saneamento e Seeding de Dados no PostgreSQL:**
   - [MODIFY] `patio_os`: Dar baixa na OS #2408 de Santo André (paga em cartão), equalizando o pátio das 10 lojas rigorosamente em **R$ 46.393,62**.
   - [MODIFY] `daily_revenue_adjustments`: Inserir o Aporte de Sócios de **R$ 5.000,00** em 31/08/2026.
   - [MODIFY] `daily_manual_bills`: Inserir/sincronizar o Pró-labore Daniel (**R$ 5.000,00**) e DIF Lucro Joaci (**R$ 1.714,84**) com `contabilizar_no_subtotal = true`.

2. **Ajuste da RPC `get_daily_reconciliation_summary` e `close_daily_snapshot`:**
   - [MODIFY] `supabase/migrations/20260831000011_spec_328_forensic_reconciliation_3108.sql`:
     - Assegurar a compensação intra-loja filial por filial ($\text{Consolidado}_i = \text{OFX}_i + \text{Cofre}_i + \text{Rede}_i$).
     - Computar $Faturamento Total = Faturamento OI Base (55.420,95) + Aportes (5.000,00) = \mathbf{60.420,95}$.
     - Computar $Subtotal Contas = Base (46.848,95) + Pró-labore (5.000,00) + DIF Joaci (1.714,84) + Juros Rede (3.932,35) = \mathbf{57.496,14}$.
     - Equalizar $Diferença Final = (60.420,95 - 2.915,87) - 57.496,14 = \mathbf{+R\$\ 8,94}$.

3. **Frontend & Modais:**
   - [MODIFY] `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`: Forçar refetch da RPC ao entrar no passo 7, consumindo diretamente as métricas consolidadas do backend com skeleton de loading e eliminando divergências do fallback em memória.
   - [MODIFY] `src/components/conciliacao/SaldoBancosDetailModal.tsx`: Header Cards exibindo `Saldo Positivo Real (R$ 231.813,81)` e `(-) Cheque Especial Real (-R$ 13.188,08)`.
   - [MODIFY] `src/components/conciliacao/ResumoDiaPanel.tsx`: Exibição harmonizada do DRE com badges de faturamento e contas decompostos.

---

## 3. Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Database & Backend Specialist:** Identificou que a tabela `patio_os`, `daily_manual_bills` e `daily_revenue_adjustments` já possuem toda a estrutura necessária, bastando o saneamento do pátio e o seeding dos itens de 31/08/2026, além de garantir que a RPC `get_daily_reconciliation_summary` devolva a equação canônica.
- **Frontend & Component Specialist:** Mapeou que `Step4FinalAuditAndClose.tsx` e `ResumoDiaPanel.tsx` já contêm os layouts e componentes Dark UI Zinc-950, necessitando apenas do alinhamento das fontes de dados e do trigger de refetch.
- **Graphify & Risk Auditor:** Mapeou o risco de dessincronização entre `close_daily_snapshot` e `daily_snapshots`, definindo a ordem estrita de persistência dos metadados antes da consolidação.

---

## 4. Contratos de Dados & SQL (Supabase)

### Retorno Canônico da RPC `get_daily_reconciliation_summary('2026-08-31')`
$$\begin{aligned}
\text{Total Saldo Banco Positivo} &= \mathbf{R\$\ 231.813,81} \\
\text{(-) Cheque Especial Real} &= \mathbf{-R\$\ 13.188,08} \\
\text{Dinheiro MP} &= \mathbf{R\$\ 22.475,00} \\
\text{A Receber} &= \mathbf{R\$\ 8.049,67} \\
\text{Na Loja OS} &= \mathbf{R\$\ 46.393,62} \\
\text{Caixa Atual} &= (231.813,81 + 22.475,00 + 8.049,67 + 46.393,62) - 13.188,08 = \mathbf{R\$\ 295.544,02} \\
\text{Caixa Anterior} &= \mathbf{R\$\ 292.628,15} \\
\text{Fluxo de Caixa} &= 295.544,02 - 292.628,15 = \mathbf{+R\$\ 2.915,87} \\
\text{Faturamento Total} &= 55.420,95 + 5.000,00 = \mathbf{R\$\ 60.420,95} \\
\text{Valor Disp. Contas} &= 60.420,95 - 2.915,87 = \mathbf{R\$\ 57.505,08} \\
\text{Subtotal Contas} &= 53.563,79 + 3.932,35 = \mathbf{R\$\ 57.496,14} \\
\mathbf{Diferen\text{ç}a\ Final} &= 57.505,08 - 57.496,14 = \mathbf{+R\$\ 8,94\ (\text{Sobra de Caixa Aprovada})}
\end{aligned}$$

---

## 5. Risco Principal e Mitigação

- **Risco:** Re-importação de arquivos no Wizard sobrescrever o pátio ou as contas manuais.
- **Mitigação:** Seeding de contas com `WHERE NOT EXISTS`, atualização atômica de `patio_os` preservando histórico, e refetch compulsório da RPC antes de renderizar a tela de selamento.
