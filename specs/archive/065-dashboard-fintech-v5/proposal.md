# Proposal: Dashboard Fintech V5 — Fontes de Verdade e Extrato OFX (065)

## Problema

1. **Valores Zerados no Faturamento:** A tela de importação de arquivos (`CentralImportWizard`) abandonou o uso da tabela legada `reconciliations` e passou a salvar globalmente em `import_logs` e `daily_snapshots`. Porém, o código deixou `total_os: 0` chumbado (hardcoded), e o Dashboard continuou tentando ler da tabela antiga. Resultado: Faturamento travado em R$ 0.
2. **Lançamentos Manuais Ignorados:** As entradas manuais na hora de importar (Faturamento Outros, A Receber Manual, Dinheiro MP) são salvas em `daily_snapshots`, mas o Dashboard não estava consultando essa tabela, logo os valores se perdiam visualmente.
3. **Contas a Pagar via OFX:** Atualmente, a coluna "Contas a Pagar" lê da tabela `oficina_contas` (integração via API externa). O usuário determinou a **remoção total do input manual/antigo de contas** e a adoção do **extrato OFX** como fonte da verdade para "Contas" (todas as despesas/saídas financeiras bancárias por loja).

## Solução Proposta

1. **Correção na Raiz (Importação):** Ajustar o `CentralImportWizard.tsx` para somar o real `total_os` (Faturamento) ao salvar o log da importação, parando de enviar `0`.
2. **Migração do Dashboard (Datas):** O hook `useDashboardV2` vai parar de procurar datas em `reconciliations` e passará a ancorar a linha do tempo em `import_logs.target_date`. Essa será a nova fonte da verdade de "quando ocorreu uma conciliação".
3. **Injeção do Daily Snapshot:** O Dashboard passará a buscar o registro da tabela `daily_snapshots` do dia em questão. Valores como `faturamento_outros_valor`, `dinheiro_mp` e `a_receber_manual` serão somados na matemática final de Caixa e Faturamento.
4. **Contas = Saídas do OFX:** A lógica de `Contas` será refeita. Vamos deletar a leitura de `oficina_contas` no hook. Em seu lugar, vamos iterar as `transactions` (onde moram os dados do OFX) e somar tudo que for `amount < 0` e `type = 'out'`. Essa soma será a nova métrica de Contas, garantindo que o que saiu do banco é o que compõe o resultado final (Faturamento - Contas).

## Risco Principal
- O OFX reflete apenas "Contas Pagas" (cash out realizado). A label na UI será mantida como "Contas" ou "Despesas", mas ela perderá a característica de "A Pagar" futuro, refletindo estritamente o que debitou na conta naquele fechamento.
