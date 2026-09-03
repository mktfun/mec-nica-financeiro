## [2026-09-01] — [Feature ID: 314-auditoria-saldo-deduplicacao-ofx-rede]

**Contexto:** Correcao da ingestao de extratos OFX multi-dias no CentralImportWizard.tsx e useTransactions.ts.

**Regra aprendida:**
1. **Particao Temporal Estrita:** Extratos bancarios frequentemente contem transacoes de multiplos dias (ex: D-1 e D). Cada transacao OFX inserida na tabela ofx_transactions DEVE receber target_date = DATE(occurred_at) (extraido de <DTPOSTED>), e NUNCA a data global selecionada no wizard.
2. Isso garante que os creditos da Rede de ontem permanecam no dia contabil de ontem e os creditos de hoje no dia de hoje, sem aglutinar 4 depositos em um unico dia.

**Risco identificado / Anti-pattern:** Forcar target_date = targetDate para todas as linhas de um arquivo OFX importado.


# Importação & Conciliação OFX / XLSX

## Regras de Domínio
- **Deduplicação**: Sempre deduplicar FITIDs antes do INSERT usando chave composta (account_id, fitid) ou hash único.
- **Validação**: Verificar formato de datas (dd/MM/yyyy vs yyyy-MM-dd) e valores monetários (ponto vs vírgula).
- **Transações**: Utilizar transações atômicas (BEGIN/COMMIT) para importação em lote para evitar importação parcial.

## [2026-09-01] — [Feature ID: 331-fix-nulls-and-revert-diferenca]
**Contexto:** Correção do sumiço de lançamentos de fim de semana (PIX) no Frontend (CentralImportWizard) e correção do drop silencioso de arquivos da Rede.
**Regra aprendida:**
1. **Agrupamento de Fim de Semana (OFX):** Se um arquivo OFX importado em uma segunda-feira (ex: 01/09) contiver PIXs do fim de semana (31/08), o sistema DEVE gravar `target_date` com a data escolhida pelo usuário no Wizard (`targetDate`), não a data do lançamento. Isso anula a regra da Spec 314 para que o Dashboard exiba os valores compensados no dia contábil correto para o fechamento.
2. **Fallback da Rede (GLOBAL):** Nunca descarte transações iteradas em `results.redeResults` e `maquininhaItems` apenas porque `mapping[t.storeName]` não tem correspondência imediata (`sid`). Utilize `'GLOBAL'` ou `null` como chave para garantir que todos os dados brutos cheguem ao banco em `pos_transactions`.
**Risco identificado / Anti-pattern:** Usar `if (sid)` sem bloco de fallback no loop de iteração de `redeByStore`/`maqByStore`, descartando registros e gerando falso negativo R$ 0,00 na UI.

## [2026-09-02] — [Feature ID: 349] Descarte de Valores Zerados e Deduplicação no Parser de Contas a Pagar
**Contexto:** Correção de falhas no parser de planilhas `BuscaContasAPagar.xls` (`contasPagarParser.ts`).
**Regra aprendida:**
1. **Descarte Estrito de Valores Zerados:** Linhas de títulos cancelados, estornos ou linhas com código de fornecedor mas sem valor pago/a pagar (`amount <= 0`) DEVEM ser ignoradas no loop de parsing: `if (!amount || amount <= 0 || isNaN(amount)) continue;`.
2. **Deduplicação de Títulos:** Múltiplas linhas do mesmo título na mesma data devem ser deduplicadas por chave `external_code + installment + recipient_name + amount + due_date` antes da inserção em `daily_manual_bills`.
**Risco identificado / Anti-pattern:** Criar objetos `ParsedContaAPagar` com `amount: 0`, que acionam a check constraint do banco de dados e abortam lotes inteiros de importação.

## [2026-09-03] — [Feature ID: 361-fix-planilhas-os-central-imports]
**Contexto:** Correção de falha `TypeError: Cannot read properties of undefined (reading 'filter')` na ingestão de planilhas de OS e centralização do motor de parsing em `centralImportManager.ts`.
**Regra aprendida:**
1. **Coleções Sempre Inicializadas:** Todo parser central ou função de despacho multi-arquivo (`parseCentralImports`) DEVE retornar todas as coleções de saída como arrays inicializados `[]` (`osFiles: []`, `redeResults: []`, `ofxResults: []`, `contasPagarResults: []`, `contasAPagarResults: []`, `maquininhaItems: []`, `mapaMetasResults: []`). Nunca permita que um campo de lista seja `undefined`.
2. **Normalização de Contrato OFX:** Extratos bancários OFX nativos não possuem o campo booleano `success`. O motor central deve normalizar cada item com `success: true`, `storeAlias: r.alias` e `accountKey: r.alias` para evitar descarte em filtros como `ofxResults.filter(r => r.success)`.
3. **Mapeamento de Meios de Pagamento de OS:** Na extração de OS (`ParsedOS`), os meios de pagamento residem em `parsed_credit`, `parsed_debit`, `parsed_pix_transfer`, `parsed_cash`. Ao montar o payload para a RPC `batch_upsert_patio_os`, use sempre fallback seguro `credit_value: (os as any).credit_value ?? os.parsed_credit ?? 0` para evitar gravar R$ 0,00 no banco.
**Risco identificado / Anti-pattern:** Manter stubs vazios de parsers ou acessar propriedades de coleções de parsing (`parseResult.osFiles.filter(...)`) sem fallback defensivo `(parseResult?.osFiles || []).filter(...)`.

## [2026-09-03] — [Feature ID: 362-fix-os-rejeitadas-e-filtro-ausentes-relatorio]
**Contexto:** Correção de rejeição de planilhas de OS das lojas Planalto (BRASICAR) e Rei do Módulo (MP) que resultavam em cartões zerados (R$ 0,00) no fechamento, devido a cabeçalho após linha 20, colunas com rótulos variantes e hífens no nome de loja.
**Regra aprendida:**
1. **Varredura Estendida e Tolerância a Metadados de Topo:** Em relatórios de OS de certas filiais, linhas em branco e blocos de cabeçalho do ERP empurram as colunas para a linha 25-35. O scanner em `useOsImportProcessor.ts` DEVE varrer até 60 linhas (`Math.min(60, data.length)`).
2. **Regex Tolerante a Rótulos de Colunas:** A detecção de cabeçalho não pode depender de `rowStr.includes('status')`. Deve testar regex flexível: `/^(status|situa[çc][ãa]o|sit\b|estado|fase)$/i` e `/^(os|n[ºo°.]?\s*os|n[ºo°.]?\s*da\s*os|n[úu]mero\s*(?:da\s*)?os|ordem\s*de\s*servi[çc]o|c[óo]d(?:igo)?(?:\s*os)?)$/i`.
3. **Regex de Store Alias com Hífens:** Nomes de lojas com hífen (ex: `Planalto - BRASICAR`, `Rei do Módulo - MP`) quebravam regex `([A-Za-z0-9\s]+?)\s*[-–—]`. O parser deve quebrar pelo delimitador `por data d[ae] os` ou usar regex gulosa para capturar o nome composto inteiro.
4. **Aliases Conhecidos no Mapeamento:** Termos canônicos como `BRASICAR`, `brasicar`, `Planalto (BRASICAR)`, `Rei do Módulo`, `Rei do Modulo`, `REI DO MODULO` DEVEM constar em `KNOWN_ACCOUNT_DEFAULTS` e `REDE_STORE_MAPPING`, evitando o fallback `st-default` que zera a loja.
**Risco identificado / Anti-pattern:** Limitar a busca de cabeçalho a 20 linhas e engolir erros de parsing de OS em `centralImportManager.ts`, emitindo aviso genérico de "Arquivo ignorado" em vez de registrar a falha real.

