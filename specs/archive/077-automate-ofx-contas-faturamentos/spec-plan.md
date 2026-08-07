# Spec Plan: Automatizar Contas a Pagar e Outros Faturamentos via OFX (077)

## Tasks

- [x] [FRONTEND] Em `src/components/importacoes/CentralImportWizard.tsx`, remover o estado de React para `manualOutrosFaturamentos`, `manualOutrosDesc`, `manualContasAPagar`, `manualProvisao`.
- [x] [FRONTEND] Em `src/components/importacoes/CentralImportWizard.tsx`, remover o bloco JSX do grid que renderiza os 4 campos citados.
- [x] [FRONTEND] Em `src/components/importacoes/CentralImportWizard.tsx`, no payload do `saveSnapshot.mutateAsync`, fixar `faturamento_outros_valor: 0`, `contas_a_pagar: 0` e `provisao: 0` (e remover a string de `faturamento_outros_desc`).
- [x] [FRONTEND] Em `src/components/conciliacao/ResumoDiaPanel.tsx`, calcular `totalPixOs` somando `st.pix_os` do loop `storesMod1`.
- [x] [FRONTEND] Em `src/components/conciliacao/ResumoDiaPanel.tsx`, definir `faturamento_outros_automatico = resumo.totalOfxIn - totalPixOs` e `contas_a_pagar_automatico = resumo.totalOfxOut`.
- [x] [FRONTEND] Em `src/components/conciliacao/ResumoDiaPanel.tsx`, injetar as variáveis automáticas no `inputForCalculation` em vez de usar `currentSnapshot`.
- [x] [FRONTEND] Em `src/components/conciliacao/ResumoDiaPanel.tsx`, atualizar o `handleSave` para gravar `faturamento_outros_automatico` e `contas_a_pagar_automatico` no snapshot (ao invés de manter zero para sempre no banco).
- [x] [TEST] Verificar se a interface de conciliação carrega sem quebrar e os números de Contas a Pagar batem com as saídas.
