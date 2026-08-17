# Spec Plan: Auditoria Clara de Liquidação Bancária para Cartões e PIX de Ordens de Serviço (223)

## Tasks

- [ ] [FRONTEND/COMPONENTS] Criar modal `src/components/conciliacao/LinkOfxToOsModal.tsx` para vincular transações bancárias diretamente a partir de uma OS pendente na tabela de PIX.
- [ ] [FRONTEND/COMPONENTS] Atualizar `src/components/conciliacao/PixVsOfxTable.tsx`:
  - Exibir detalhes ricos da transação bancária confirmada (contraparte, banco, valor e data).
  - Adicionar botão "Vincular Extrato" para OSs pendentes e "Desvincular" para OSs confirmadas.
- [ ] [FRONTEND/COMPONENTS] Atualizar `src/components/conciliacao/OsVsRedeTable.tsx` e `RedeVsOfxTable.tsx`:
  - Exibir status explícito de liquidação do lote bancário de cartões (`Liquidado no Banco` vs `Aguardando Compensação`).
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de compilação.
- [ ] [VERIFY] Validar a clareza dos status de liquidação de PIX e Cartão em todas as abas.
