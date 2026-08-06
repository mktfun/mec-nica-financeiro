## [2026-08-04] — [Feature ID: 073-loja-detalhes-transacoes]

**Contexto:** O sistema precisava identificar o "Limite da Conta" importado diretamente pelo arquivo OFX e amarrar isso ao cadastro da loja (`stores.account_limit`) logo no momento do upload.

**Regra aprendida:** Arquivos OFX brasileiros (dependendo do banco) injetam o limite do cheque especial/conta sob a tag `<OVERDRAFTLIMIT>` ou `<CREDITLIMIT>`. A regex precisa prever ambos. É importante capturar no parser e retornar no `OfxParseResult` para que o frontend possa dar o UPDATE no banco no instante do `handleConfirm`.

**Risco identificado:** Nem todo banco envia o limite no arquivo, então ele deve ser opcional (`account_limit: number | null`) e a UI não deve quebrar caso o valor falte.

**Não fazer:** Nunca assuma a nomenclatura padrão do OFX gringo em arquivos brasileiros. Sempre faça parse defensivo (testar match de VÁRIAS tags).

## [2026-08-06] — [Feature ID: 101-structured-trace-logs]

**Contexto:** Necessidade de observabilidade detalhada (Trace Logs estruturados em JSON) para depuração de parsing (OFX, Excel) e processos de conciliação.

**Regra aprendida:** Interceptar cada passo crítico da importação com logs estruturados (Upload, Parsing OFX, Parsing Excel, Normalização, Engine de Match, Staging Ready) emitindo JSON com `console.debug / console.info`. Os parsers agora aceitam opcionalmente opções contendo `sessionId` para associar o parsing ao processo pai de importação e rastrear o funil dos dados sem poluir a interface do usuário.

**Risco identificado:** Emitir logs massivos na UI poderia travar o navegador ou confundir o usuário. A solução é cuspir o objeto JSON apenas no console do desenvolvedor.

**Não fazer:** Não usar console.log simples com strings ao debugar importações complexas. Sempre emitir metadados e amostras cruas via JSON para facilitar o rastreamento em cenários de quebra de valores (ex: leitura de centavos).
