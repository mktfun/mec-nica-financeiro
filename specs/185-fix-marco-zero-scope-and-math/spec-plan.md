# Spec Plan: Isolamento de Data do Marco Zero e Ajuste de Matemática Incremental na Conciliação (185)

## Tasks

- [x] [FRONTEND] Atualizar `MarcoZeroWizard.tsx` para definir `opened_at: targetDate` e `data_os: targetDate` nas OSs salvas em `patio_os` e `estoque_os_pendente`, evitando contaminação dos dias anteriores.
- [x] [FRONTEND] Atualizar `ResumoDiaPanel.tsx` para ler `faturamentoAnteriorGlobal` e `caixaAnteriorGlobal` com fallback em `currentSnapshot?.metadata` caso o dia anterior não possua snapshot.
- [x] [FRONTEND] Atualizar `calculateGlobalConciliacao` em `src/lib/modulo1Calculations.ts` para aplicar o Faturamento Incremental do Período (`faturamento_atual - faturamento_anterior`) no cálculo de `valor_disp_contas`.
- [x] [TEST] Executar `npm run build` para validar a ausência de erros de compilação TypeScript.
- [x] [TEST] Verificar no frontend a Conciliação Diária do dia 10/08 (Diferença Final -R$ 0,27) e checar os dias anteriores (sem contaminação).
