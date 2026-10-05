# 📋 Plano de Execução — Spec 477: Restauração do Status Canônico (Conciliado/Divergência), Eliminação de Falso Alarme de Verificação e Transparência por Filial

## [FRONTEND - STORE CARD]
- [x] Restaurar a renderização do badge verde `CONCILIADO` quando `isDiferencaOk === true` em `src/components/conciliacao/StoreCardModulo1.tsx`.
- [x] Eliminar o falso alarme de `Verificação incompleta` em `StoreCardModulo1.tsx` removendo a checagem falha de `!verificacao`.
- [x] Ajustar o badge de pendências de vínculos para exibir contagem informativa em âmbar (`variant="warning"`) apenas quando `pendingCount > 0`.
- [x] Formatar o badge de divergência para incluir o valor monetário em R$ quando houver diferença real.

## [FRONTEND - DETALHE DA FILIAL]
- [x] Injetar banner executivo de status de fechamento no topo da tela `/conciliacao/$lojaId` (`src/routes/conciliacao.$lojaId.tsx`) confirmando se a loja está 100% conciliada ou orientando sobre o pilar pendente.
- [x] Adicionar indicadores de conformidade (ícone verde `✓`) nas abas da filial que já estão 100% batidas e sem pendência.

## [FIX ERRO 400 BUFFER DO ROBÔ]
- [x] Remover o campo inexistente `code` da consulta `stores(id, name)` em `src/hooks/useBotDownloadedFiles.ts`.

## [TESTE & VALIDAÇÃO]
- [x] Executar `npm run build` no terminal garantindo zero erros de TypeScript e bundling.
- [ ] Validar visualmente as lojas Dom Pedro, Jabaquara e Jorge Beretta na data 26/08.
- [ ] Aplicar Hard Stop para validação humana.
