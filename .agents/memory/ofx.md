## [2026-08-04] — [Feature ID: 073-loja-detalhes-transacoes]

**Contexto:** O sistema precisava identificar o "Limite da Conta" importado diretamente pelo arquivo OFX e amarrar isso ao cadastro da loja (`stores.account_limit`) logo no momento do upload.

**Regra aprendida:** Arquivos OFX brasileiros (dependendo do banco) injetam o limite do cheque especial/conta sob a tag `<OVERDRAFTLIMIT>` ou `<CREDITLIMIT>`. A regex precisa prever ambos. É importante capturar no parser e retornar no `OfxParseResult` para que o frontend possa dar o UPDATE no banco no instante do `handleConfirm`.

**Risco identificado:** Nem todo banco envia o limite no arquivo, então ele deve ser opcional (`account_limit: number | null`) e a UI não deve quebrar caso o valor falte.

**Não fazer:** Nunca assuma a nomenclatura padrão do OFX gringo em arquivos brasileiros. Sempre faça parse defensivo (testar match de VÁRIAS tags).
