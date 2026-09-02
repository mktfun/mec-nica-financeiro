# Proposal: Teste Pericial Sequencial Isolado de Conciliação Multi-Dias (343)

## Problema
O usuário necessita validar o comportamento e a capacidade real do motor de conciliação através de um **teste sequencial isolado de 4 dias contínuos** em agosto:
1. **14/08/2026 (Sexta-feira)**: Marco Zero de implantação com Caixa Inicial de **R$ 289.386,12**.
2. **17/08/2026 (Segunda-feira)**: Primeiro dia operacional com Caixa Anterior de **R$ 289.386,12** -> Caixa Atual de **R$ 299.076,86** (Diferença Final: **-R$ 0,44**).
3. **18/08/2026 (Terça-feira)**: Segundo dia com Caixa Anterior de **R$ 299.076,86** -> Caixa Atual de **R$ 316.215,85** (Diferença Final: **-R$ 0,35**).
4. **19/08/2026 (Quarta-feira)**: Terceiro dia com Caixa Anterior de **R$ 316.215,85** -> Caixa Atual de **R$ 271.922,90** (Diferença Final: **-R$ 0,66**).

Diretriz explícita do usuário:
- Processar os arquivos brutos (`.ofx`, `.xlsx` Rede, `.xls` OSs) contidos em cada pasta (`14-08`, `17-08`, `18-08`, `19-08`).
- Utilizar das planilhas oficiais (`CONCILIAÇÃO 1408.xlsx` a `1908.xlsx`) estritamente o faturamento/odômetro, as contas a pagar, os ajustes/aportes corporativos e as ordens de serviço pendentes de pátio não lançadas.
- Exibir a prova real comparativa (Sistema vs Excel) para cada data, comprovando a robustez ponta a ponta do sistema sem alterar ou corromper datas posteriores (28/08, 31/08, 01/09).

---

## Solução Proposta (Foco em Reuso e Prova Real)

1. **[TEST & BENCHMARK] Script Executor Canônico Multi-Dias (`scripts/benchmark-august-multi-days.cjs`)**:
   - Ingerir e parear os extratos OFX, lotes da Rede e OSs das 10 filiais para cada um dos 4 dias.
   - Aplicar as contas manuais e os aportes/justificativas financeiras registradas nas planilhas.
   - Sincronizar o encadeamento temporal estrito ($D_0 \to D_1 \to D_2 \to D_3$):
     $$\text{Caixa Anterior}(D) = \text{Caixa Atual}(D-1)$$
   - Executar a RPC `get_daily_reconciliation_summary` para cada data e confrontar 1:1 os 5 Pilares e o DRE contra a respectiva planilha oficial.
2. **[DATABASE] Preservação e Isolamento**:
   - Manter as tabelas `patio_os`, `ofx_transactions`, `pos_transactions`, `daily_manual_bills`, `daily_revenue_adjustments`, `daily_snapshots` e `reconciliations` indexadas por data.
   - Garantir que as datas de 28/08, 31/08 e 01/09 permaneçam intocadas.
3. **[FRONTEND] Validação Visual**:
   - Garantir que a UI em `/conciliacao` renderize com perfeição cada uma das 4 datas no seletor, exibindo a badge verde de aprovação em todas elas.

---

## Contratos de Dados & Tabela Comparativa Oficial dos 4 Dias

| Data | 14/08/2026 (Marco Zero) | 17/08/2026 | 18/08/2026 | 19/08/2026 |
|---|---|---|---|---|
| **Saldos Bancos Positivos** | R$ 170.244,95 | R$ 190.819,65 | R$ 211.003,28 | R$ 152.608,71 |
| **(-) Cheque Especial Itaú** | -R$ 11.849,09 | R$ 0,00 | R$ 0,00 | R$ 0,00 |
| **Dinheiro MP (Cofre)** | R$ 13.066,00 | R$ 9.066,00 | R$ 8.466,00 | R$ 8.466,00 |
| **A Receber (Títulos)** | R$ 10.694,50 | R$ 10.694,50 | R$ 10.694,50 | R$ 10.694,50 |
| **Na Loja OS (Pátio)** | R$ 107.229,76 | R$ 88.496,71 | R$ 86.052,07 | R$ 100.153,69 |
| **(=) CAIXA ATUAL CONSOLIDADO** | **R$ 289.386,12** | **R$ 299.076,86** | **R$ 316.215,85** | **R$ 271.922,90** |
| **Caixa Anterior ($D-1$)** | R$ 258.736,15 | **R$ 289.386,12** | **R$ 299.076,86** | **R$ 316.215,85** |
| **(=) FLUXO DE CAIXA** | **R$ 30.649,97** | **R$ 9.690,74** | **R$ 17.138,99** | **-R$ 44.292,95** |
| **Faturamento Base OI** | R$ 75.005,10 | R$ 70.820,43 | R$ 41.857,57 | R$ 73.813,07 |
| **(+) Ajustes / Entradas DRE** | +R$ 1.182,15 | +R$ 25.351,63 | R$ 0,00 | R$ 0,00 |
| **(=) Faturamento Atual Total** | **R$ 76.187,25** | **R$ 96.172,06** | **R$ 41.857,57** | **R$ 73.813,07** |
| **Disponível para Contas** | R$ 45.537,28 | R$ 86.481,32 | R$ 24.718,58 | R$ 118.106,02 |
| **Subtotal Contas a Pagar** | R$ 45.538,06 | R$ 86.481,76 | R$ 24.718,93 | R$ 118.106,68 |
| **🎯 DIFERENÇA FINAL** | **-R$ 0,78 (OK)** | **-R$ 0,44 (OK)** | **-R$ 0,35 (OK)** | **-R$ 0,66 (OK)** |
| **STATUS DE APROVAÇÃO** | **APROVADO** | **APROVADO** | **APROVADO** | **APROVADO** |

---

## Risco Principal e Mitigação
- **Risco:** O processamento em lote sobrescrever ou apagar fechamentos homologados de fim de agosto e setembro (28/08, 31/08, 01/09).
- **Mitigação:** Isolar as transações e snapshots estritamente no intervalo `2026-08-14` a `2026-08-19`, sem afetar datas superiores.
