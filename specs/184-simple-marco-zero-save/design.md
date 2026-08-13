# Design: Salvamento Direto e Simples do Marco Zero (184)

## Arquitetura Técnica
`MarcoZeroWizard.tsx` → `daily_snapshots` & `dashboard_daily_logs` & `patio_os` & `reconciliations` → `DashboardV2` & `loja.$lojaId`

- Ao confirmar a implantação, o `MarcoZeroWizard` pega os valores puros extraídos da planilha (`data.global`) e executa upsert simultâneo nas tabelas de consolidado diário.
- Para cada loja com OSs pendentes, insere/atualiza os registros na tabela `patio_os`.

## Interfaces TypeScript
Nenhuma nova interface. Utilização das estruturas existentes `MarcoZeroResult`.

## Componentes / Hooks / Funções
- `src/components/importacoes/MarcoZeroWizard.tsx`:
  - Atualização da função `handleSave`:
    1. Upsert em `daily_snapshots`:
       - `date`: `targetDate`
       - `caixa_atual`: `data.global.caixaAtual`
       - `dinheiro_mp`: `data.global.dinheiroMp`
       - `total_recebiveis`: `data.global.aReceber`
       - `saldo_bancario`: `data.global.negativo`
       - `faturamento`: `data.global.faturamentoAtual`
       - `contas_a_pagar`: `data.global.valorDasContas`
       - `saldo_negativo_itau`: `data.global.negativo`
       - `metadata`: `{ fluxo_caixa: data.global.fluxoCaixa, faturamento_anterior: data.global.faturamentoAnterior, diferenca: data.global.diferenca }`
    2. Upsert em `dashboard_daily_logs`:
       - `date`: `targetDate`
       - `caixa_atual`: `data.global.caixaAtual`
       - `saldo_total`: `data.global.caixaAtual - data.global.dinheiroMp - data.global.aReceber`
       - `faturamento_atual`: `data.global.faturamentoAtual`
       - `faturamento_anterior`: `data.global.faturamentoAnterior`
       - `fluxo_caixa`: `data.global.fluxoCaixa`
       - `contas_a_pagar`: `data.global.valorDasContas`
       - `diferenca`: `data.global.diferenca`
       - `a_receber`: `data.global.aReceber`
    3. Upsert/Insert em `patio_os`:
       - Para cada loja e OS: `store_id`, `store_name`, `os_number`, `total_value`, `paid_value: 0`, `status: 'em_aberto'`.

## Fluxo de UI
1. Usuário envia a planilha no assistente Marco Zero.
2. Preview exibe todos os valores da planilha.
3. Usuário clica em "Implantar Marco Zero".
4. Todos os números do preview são gravados diretamente no banco exatamente como lidos.
5. Ao entrar no Dashboard ou nas lojas, os valores coincidem 100% com o preview.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Subir Marco Zero → Clicar em Salvar → Verificar no Dashboard do dia implantado se Caixa Atual é R$ 222.798,65, Faturamento é R$ 257.011,03 e a Diferença é R$ -0,27.
- **Cenário 2:** Entrar na página da Loja → Verificar se as OSs pendentes daquela loja estão visíveis na tabela de Pátio OSs.
