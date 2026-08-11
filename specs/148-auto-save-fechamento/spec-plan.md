# Spec Plan: Auto Save Conciliação (148-auto-save-fechamento)

## Tasks

- [ ] [FRONTEND] Editar `src/components/importacoes/CentralImportWizard.tsx` (linhas de save do snapshot).
- [ ] [FRONTEND] No wizard, remover a chamada RPC falha `get_dashboard_metrics` para o fechamento.
- [ ] [FRONTEND] No wizard, agregar valores de `caixaAtual`, `faturamentoAtual`, `aReceber`, `saldoBancario`, e `patio` iterando os resultados locais (`results.ofxResults`, `results.osFiles`, `results.redeResults`).
- [ ] [FRONTEND] No wizard, adicionar o envio assíncrono para inserir os registros de `reconciliations` de cada loja processada (salvando `na_loja_os`).
- [ ] [FRONTEND] Editar `src/components/conciliacao/ResumoDiaPanel.tsx` ou componente análogo que renderiza o botão "Salvar Fechamento".
- [ ] [FRONTEND] Injetar condicional visual: se `dailySnapshot` existir para a `selectedDate`, mudar a label do botão principal de "Salvar Fechamento" para "Editar Fechamento" (com ícone de lápis `<Edit2 />`).
- [ ] [FRONTEND] Executar build do Next.js para garantir que as assinaturas tipadas estão seguras.
