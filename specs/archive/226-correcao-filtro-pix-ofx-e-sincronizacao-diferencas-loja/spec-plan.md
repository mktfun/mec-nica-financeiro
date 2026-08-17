# Spec Plan: Correção de Filtro PIX vs Movimentações Bancárias e Sincronização de Diferenças por Loja (226)

## Tasks

- [ ] [BACKEND/DATABASE] Criar e rodar script para desvincular transações `SISPAG`, `REND PAGO` e `APORTE` que foram vinculadas erroneamente a OSs em `ofx_transactions`.
- [ ] [FRONTEND/HOOKS] Atualizar `src/hooks/useConciliacao.ts` com a função `isClientPixTransaction` para impedir que SISPAGs e rendimentos entrem no pool de PIX de OSs, garantindo que apareçam 100% em `ofxSemMatch` (Entradas Avulsas).
- [ ] [FRONTEND/VIEWS] Atualizar `src/routes/conciliacao.index.tsx` para sincronizar o abatimento de justificativas (todas as transações justificadas, somando ou não no faturamento) na Diferença de cada loja, zerando os cards conforme justificadas.
- [ ] [FRONTEND/VIEWS] Atualizar `src/routes/conciliacao.$lojaId.tsx` para exibir a contagem exata e soma das Entradas Avulsas pendentes correspondendo à Diferença da filial.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de compilação.
- [ ] [GIT/SYNC] Sincronizar branches `main` e `master` no GitHub.
