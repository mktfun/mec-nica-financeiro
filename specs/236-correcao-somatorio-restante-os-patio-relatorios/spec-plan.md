# Plano de Implementação: Spec 236

## Fase 1: Limpeza e Sanitização dos Resíduos Órfãos no Banco de Dados
1. Executar query no PostgreSQL para desativar/limpar os 4 registros legados sem placa (`'N/I'`) do Marco Zero que estavam inflando o pátio em R$ 14.995,33.
2. Re-executar a RPC `get_daily_reconciliation_summary('2026-08-17')` e validar que o total bate exatamente com o rodapé dos relatórios (**R$ 77.751,44**).

## Fase 2: Blindagem no Motor de Importação de OSs
1. Atualizar `savePatioOsAndReceivables` em `src/hooks/useImportProcessor.ts` para que, ao importar um novo lote de OSs de uma filial, as OSs antigas daquela loja que não constam mais no arquivo sejam automaticamente marcadas como finalizadas.
2. Garantir em `useOsImportProcessor.ts` que o campo `Restante na OS` do arquivo `.xls` (`colMap.openValue`) seja gravado com fidelidade absoluta (`total_value - paid_value = Restante na OS`).

## Fase 3: Validação, Testes e Sincronização
1. Executar `npm run build` e validar compilação com código 0.
2. Criar `walkthrough.md`.
3. Sincronizar com GitHub nas branches `main` e `master`.
