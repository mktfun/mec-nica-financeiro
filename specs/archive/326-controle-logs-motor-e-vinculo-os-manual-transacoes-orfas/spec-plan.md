# SDD Spec-Plan: Controle Total de Logs do Motor & Vínculo de OS Manual com Transações Órfãs

**Feature ID:** `326-controle-logs-motor-e-vinculo-os-manual-transacoes-orfas`  
**Data:** 08/09/2026  
**Status:** CONCLUÍDO & ARQUIVADO  

---

## 1. Backlog Sequencial de Implementação

### Fase 1: Controle de Logs e Parada Consciente no Step 8
- [x] Task 1.1: Atualizar `src/components/importacoes/ImportExecutionTerminal.tsx` adicionando funções de exportação `handleDownloadTxt` e `handleDownloadJson`, além de botões compactos na barra de ferramentas superior para copiar e baixar logs.
- [x] Task 1.2: Adicionar toggle/checkbox opcional no terminal ou Hero Banner: `"Avançar automaticamente após conclusão"` (com persistência em state/localStorage e default `false`).
- [x] Task 1.3: Modificar `CentralImportWizard.tsx` (linhas 1937–1947): remover o `setStep(4)` incondicional ao término do processamento do motor em `handleConfirm`; invocar `setSaveFinished(true)` e exibir toast de conclusão sem trocar de tela abruptamente.
- [x] Task 1.4: Ajustar o botão de retorno do Step 4 (`Step1UnregisteredPayments.tsx` / `CentralImportWizard.tsx` linha 3211) para permitir voltar ao Step 8 (`setStep(8)`) quando a gravação já foi finalizada, preservando a visibilidade dos logs.

---

### Fase 2: Blindagem do "Total da OS" no Step 2.5
- [x] Task 2.1: Modificar `src/components/importacoes/MissingPatioOsEditor.tsx`: manter o campo `total_value` editável, porém travar o campo `paid_value` como somente leitura (`disabled` / `readOnly`), com estilo sutil e tooltip instrutivo esclarecendo que baixas ocorrem via vinculação real no Step 4.
- [x] Task 2.2: Ajustar o cálculo do saldo remanescente em `MissingPatioOsEditor.tsx` para assegurar que `saldo = Math.max(0, total_value - paid_value)` e que qualquer alteração de `total_value` recalcule instantaneamente o impacto financeiro.

---

### Fase 3: Mesa de Vínculo de Órfãos da Filial no Step 4
- [x] Task 3.1: No `src/components/conciliacao/ManualMatchOsModal.tsx` e `useManualMatch.ts`, certificar que a listagem de OSs candidatas da filial priorize e destaque OSs com saldo em aberto (`open_balance > 0`), exibindo claramente o valor total da OS, o valor já pago e o novo saldo amortizado após o vínculo.
- [x] Task 3.2: Garantir que o vínculo via `link_manual_rede_to_os` e `link_manual_pix_to_os` atualize atomicamente o `paid_value` e o status da OS no banco, e que a transação seja retirada da lista de órfãos imediatamente.
- [x] Task 3.3: Adicionar no modal ou mesa a opção expressa para quitação por dinheiro em loja ("Recebimento em Espécie no Balcão"), permitindo registrar pagamentos físicos sem criar dependência de OFX ou Rede.

---

### Fase 4: Validação, Visual QA e Quality Gate
- [x] Task 4.1: Executar typecheck e linting no TypeScript (`npm run build`) para garantir zero erros de tipagem e compilação do bundle.
- [x] Task 4.2: Realizar verificação no navegador (Visual QA) validando a permanência no Step 8 com botões de download e cópia de logs funcionando, e o fluxo de vínculo no Step 4.
- [x] Task 4.3: Hard Stop para validação humana antes de qualquer arquivamento (Validado e aprovado pelo usuário).
