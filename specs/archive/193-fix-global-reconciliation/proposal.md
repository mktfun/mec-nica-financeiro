# Proposal: fix-global-reconciliation-sum-and-keep-manual-inputs (193)

## Problema
Após corrigirmos a extração de dízimas de arquivos OFX (Jabaquara e Kennedy), o saldo global exibido pelo sistema ainda sofre de anomalias (somando R$ 6.5M). Isso ocorre por dois motivos centrais diagnosticados na auditoria:
1. **Soma Matemática Incorreta no Global**: O motor de agregação (`get_dashboard_metrics`) para calcular a soma de `faturamento_banco` parou de puxar o saldo absoluto bancário final de cada filial (`bank_total`) e em vez disso, passou a realizar uma soma bruta distorcida.
2. **Resíduo de Banco (Corrupção de Snapshot)**: O snapshot armazenado do dia 11/08/2026 reteve os dados de importação do OFX processados antes da correção, mantendo cifras gigantes (sem o ponto decimal) gravadas em tabela.

Paralelo a isso, as variáveis manuais de **Dinheiro MP** e **A Receber** estão impecáveis e o sistema em nenhuma hipótese deve tentar recalculá-las, dividi-las ou cruzá-las com lógicas do OFX.

## Solução Proposta
1. **Refatoração Segura do Dashboard (RPC `get_dashboard_metrics`)**: 
   - Modificar a CTE para que a variável agregadora global `v_total_saldo` seja um reflexo fiel da soma dos saldos absolutos (`bank_total`) oriundos dos extratos já higienizados, limitando o escopo estritamente aos bancos, resultando cravado em R$ 106.327,07 para os fechamentos do dia 11/08.
2. **Preservação Blindada**:
   - Manter as varíaveis manuais resguardadas, lidas exatamente como digitadas.
3. **Trigger de Recalibração de Dados Corrompidos**:
   - Criar uma migration leve para "purgar" (remover ou anular) os saldos errados de `reconciliations` referentes a 2026-08-11 e forçar que a UI ou Backend recalcule com base nos arquivos sadios recentes. O comando fará a limpeza direcionada e recalculará as Views afetadas.

## Contratos de Dados
- Nenhuma alteração estrutural nas colunas das tabelas. Apenas refatoração SQL interna em RPC e saneamento de registros corrompidos específicos.

## Risco Principal
- **Impacto:** O recálculo pode resetar temporariamente os cards até a tela recarregar as novas agregações perfeitas.
