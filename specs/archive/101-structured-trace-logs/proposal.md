# Proposal: Implementação de Trace Logs Estruturados (101)

## 1. Visão Geral
Para rastrear exatamente onde a importação ou conciliação quebra, vamos implementar um sistema de **Trace Log (Log Estruturado em JSON)**. Este log passará por todas as etapas críticas do ciclo de vida de um dado, desde o momento em que o arquivo é arrastado para a tela até o momento em que a interface exibe o payload pronto para salvar.

## 2. Abordagem Arquitetural
- **Novo Utilitário**: `src/lib/logger.ts`. Criaremos uma função `traceLog(stage, level, message, data)` que formatará e emitirá o JSON no console. 
- A escolha pelo console (com saída em `console.debug` ou `console.info`) permite que os desenvolvedores apenas abram o *DevTools (F12)* e inspecionem ou copiem os objetos JSON completos durante a simulação de falhas, atendendo ao requisito de "facilitar a leitura e a busca por anomalias".
- **Identificador de Sessão**: Cada ciclo de importação gerará um `session_id` único para garantir que os logs da etapa 6 sejam vinculados ao upload da etapa 1.

## 3. Cobertura de Etapas
1. **1_UPLOAD**: Disparado no `onDrop` do `CentralImportWizard` ou `WizardImportacao`, capturando metadados dos arquivos recebidos.
2. **2_EXTRACTION_OFX**: Disparado ao final do `ofxParser.ts`, exibindo o saldo lido, limites da conta e amostra bruta das transações parseadas.
3. **3_EXTRACTION_EXCEL**: Disparado nos parsers CSV/Excel (ex: `redeParser.ts`, OS do Pátio), exibindo total de linhas, colunas mapeadas e uma amostra lida.
4. **4_NORMALIZATION**: Disparado no `Wizard` quando os dados lidos são consolidados em objetos `ParsedReceivable` ou formatados antes da checagem.
5. **5_MATCHING_ENGINE**: (Se aplicável à importação) Log da regra de colisão. Como o sistema atual faz o matching de PIX com OS no front-end, isso será registrado na etapa de cruzar os dados.
6. **6_STAGING_READY**: Disparado no final de processamento dos arquivos, mostrando estatísticas finais de quantos registros estão sendo mandados para o formulário.
