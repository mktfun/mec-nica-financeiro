# Spec Plan: Correção Definitiva do Matcher (OS x Rede x OFX) e Telas Nativas do Wizard (312)

## Tasks

### Fase 1 — Estrutura de Telas Nativas no CentralImportWizard
- [ ] [FRONTEND] Atualizar tipo de step no CentralImportWizard para 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
- [ ] [FRONTEND] Garantir que cada step renderize exclusivamente sua própria tela (quando step=4, renderiza apenas Tela A; quando step=5, apenas Tela B; etc.), eliminando renderizações aninhadas ou sobrepostas
- [ ] [FRONTEND] Atualizar o indicador/badge superior e o Stepper para refletir a etapa ativa (1 a 8) com navegação suave

### Fase 2 — Motor de Auto-Matching (OS x Rede x OFX)
- [ ] [FRONTEND] Implementar a rotina de auto-matching determinístico ao transitar do Step 3 para o Step 4
- [ ] [FRONTEND] Cruzar vendas da Rede contra OSs de cartão (parsed_credit_debit / paid_value com forma de pagamento cartão) por loja
- [ ] [FRONTEND] Cruzar entradas PIX do OFX contra OSs pagas via PIX (pix_transfer_value / delta pago) por loja
- [ ] [FRONTEND] Passar apenas as pendências legítimas (sobras reais) para a Tela A (Step 4)

### Fase 3 — Correção do Modal de Vínculo de OS (Tela A)
- [ ] [FRONTEND] Fornecer ao modal tanto as OSs do lote importado (esults.osFiles) quanto as OSs do banco de dados (patio_os) para a filial selecionada
- [ ] [FRONTEND] Exibir dados completos de cada OS (número, cliente, placa, modelo, saldo em aberto) com busca instantânea funcional
- [ ] [FRONTEND] Executar vínculo de 1 clique atualizando os registros e removendo o item da lista de pendências

### Fase 4 — Verificação e Build Gate
- [ ] [TEST] Executar build de produção (
ode node_modules/vite/bin/vite.js build) com exit code 0
- [ ] [TEST] Validar transição limpa tela por tela (Step 3 -> Step 4 -> Step 5 -> Step 6 -> Step 7 -> Step 8)
