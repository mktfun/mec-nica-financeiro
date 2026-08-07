# Proposal: Advanced Trace Logging (102)

## Problema
O sistema de log criado anteriormente (Trace Logs 101) está acusando apenas volumetrias gerais e amostras microscópicas na saída do console. Isso não serve para um debug real (end-to-end), pois não mostra exatamente QUAIS valores estão sendo puxados do Pátio (OS), QUAIS transações estão no OFX e QUAIS descontos a Rede aplicou. O desenvolvedor precisa ver a "jornada do valor" exata para encontrar onde o cálculo quebra. Além disso, o envio do `sessionId` para os parsers de nível baixo não foi implementado na engine de importação centralizada (`useCentralImport.ts`).

## Solução Proposta
Aprimorar drasticamente os payloads enviados pelo `traceLog`.
1. Fazer o hook `useCentralImport` aceitar o `sessionId` do Wizard e propagá-lo para todos os parsers (`ofxParser`, `redeParser`, `processOsFiles`, `processMaquininha`).
2. Mudar a estratégia de amostragem nos parsers: em vez de pegar apenas 2 ou 3 transações, vamos mapear e cuspir o array **completo** de extração de valores (ex: ID, Valor, Data, Tipo) em formato JSON. Assim, qualquer divergência de centavos num arquivo de 300 linhas poderá ser auditada com Ctrl+F no DevTools.

## Contratos de Dados
Nenhuma tabela do banco será alterada. Mudança puramente de tracing no frontend.
- `useCentralImport.ts`
- `ofxParser.ts`
- `redeParser.ts`
- `useOsImportProcessor.ts`
- `CentralImportWizard.tsx`

## Risco Principal
Logs muito grandes no `console.debug`. Se um OFX tiver milhares de transações, o objeto JSON cuspirá isso tudo na memória do navegador. Isso é aceitável no DevTools (F12) pois é o comportamento esperado para a depuração granular, mas deve permanecer fora da UI normal.
