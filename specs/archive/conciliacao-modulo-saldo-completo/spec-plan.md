# Spec Plan: Painel Módulo 1 (Aba SALDO Consolidada por Loja) e IntegraçÁo dos Módulos 1-4 (conciliacao-modulo-saldo-completo)

## Tasks

- [x] [FRONTEND] Criar tipos e utilitário de cálculos em `src/lib/modulo1Calculations.ts`:
  - [x] Implementar `calculateModulo1Saldo` espelhando as fórmulas de G13 a G31 do Módulo 1 da planilha `CONCILIACAO-2307.xlsx` com suporte a `dinheiro_mp_manual` preenchido na mÁo pelo usuário.
- [x] [FRONTEND] Criar componente `src/components/conciliacao/Modulo1SaldoPanel.tsx`:
  - [x] Painel consolidado da Aba SALDO com os totais de Banco, Limite, Dinheiro MP (manual), A Receber, Na Loja, Faturamento, Valor das Contas e Resultado Final G31.
  - [x] Suporte a visualizaçÁo global e filtro por loja individual com ediçÁo de Dinheiro MP por loja.
- [x] [FRONTEND] Atualizar hook `useConciliacao.ts`:
  - [x] Adicionar `useModulo1StoresData` para alimentar os valores das abas Módulo 1 (Saldos), Módulo 2 (OSs Na Loja), Módulo 3 (Recebíveis A Receber) e Módulo 4 (Cartório).
- [x] [FRONTEND] Atualizar página principal `/conciliacao` (`src/routes/conciliacao.index.tsx`):
  - [x] Integrar o `Modulo1SaldoPanel.tsx` como painel principal no topo da página de conciliaçÁo.
- [x] [FRONTEND] Atualizar página da loja `/conciliacao/$lojaId` (`src/routes/conciliacao.$lojaId.tsx`):
  - [x] Exibir o resumo do Módulo 1 específico da loja.
- [x] [TEST] Verificar compilaçÁo limpa com `npm run build` — ✅ 0 erros (36.82s Client + 4.51s SSR).
