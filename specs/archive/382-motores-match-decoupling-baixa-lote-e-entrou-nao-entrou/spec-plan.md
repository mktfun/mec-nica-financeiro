# Spec Plan: Motores de Match Decoupling, Baixa de Lote Automática e Sanidade Contábil de "Entrou vs Não Entrou" (382)

## Tasks

- [x] [PARSER] Estender `redeParser.ts` para extrair colunas `lote` (resumo de vendas), `prazo` (dias úteis) e `creditDate` (data do crédito)
- [x] [PARSER] Implementar função `calculateExpectedCreditDate` com a tabela `BRAZILIAN_BANK_HOLIDAYS_2026` para projeção precisa de D+1 útil
- [x] [MATCHER] Desacoplar Fase 1 (OS x Rede) em `autoMatchingEngine.ts`, permitindo janela de tolerância D-3 a D ancorada em `occurred_at`
- [x] [MATCHER] Implementar Fase 2 (Rede x OFX) em `autoMatchingEngine.ts` com Hash Grouping O(n) por lote/data de crédito e baixa de lote atômica
- [x] [MATCHER] Implementar catálogo `KNOWN_POS_RENTAL_FEES` para reconhecimento automático de retenções de aluguel de POS na fonte
- [x] [MATCHER] Refinar Fase 3 (OS PIX x OFX) em `autoMatchingEngine.ts` com extração de data do memo do Itaú e validação estrita via `matchClientTokens`
- [x] [HOOK] Corrigir `useConciliacao.ts` para eliminar o hardcode `cartao_nao_entrou: 0` e calcular dinamicamente a pendência real de crédito
- [x] [HOOK] Eliminar o atalho `redeTxs.length === 1` e o `splice` cego por valor puro em `useReconciliationViews`
- [x] [UI] Atualizar `Fase3OfxReconciliation.tsx` para apurar a liquidação da Rede com base na data de crédito e exibir status de lote baixado
- [x] [TEST] Executar teste de regressão com os arquivos reais de 08/09/2026 do Desktop (vendas de 04/09 a 06/09 convergindo para 08/09)
- [x] [TEST] Validar equação do Módulo 1 (Diferença G31 = R$ 0,00 sem ativo fantasma)
