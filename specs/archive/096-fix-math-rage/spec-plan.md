# Spec Plan: Alinhamento Bélico de Regras (096)

## Tasks

- [x] [BACKEND] Editar `src/components/importacoes/CentralImportWizard.tsx`
  - Criar lógica para gerar o snapshot de `na_loja_os` por loja (somando as OSs pendentes).
  - Executar um `upsert` em `reconciliations` (`na_loja_os`) atrelado à loja e ao `targetDate` logo após a gravaçÁo de tabelas.
- [x] [FRONTEND] Editar `src/routes/conciliacao.index.tsx`
  - Substituir `const faturamento = maquininha + faturamentoRealOfx;` por `const faturamento = storeMod1?.saldo_banco_itau || 0;`.
- [x] [FRONTEND] Editar `src/components/conciliacao/ResumoDiaPanel.tsx`
  - Forçar `Math.abs(totalOfxOut)` para garantir que `contasAPagarAutomatico` seja estritamente positivo para o cálculo de despesas.
- [x] [BACKEND] Editar `src/lib/modulo1Calculations.ts`
  - Na funçÁo `calculateGlobalConciliacao`, remover `input.provisao` da soma de `valor_contas`.
