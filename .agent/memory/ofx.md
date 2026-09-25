## [2026-09-25] — [Feature ID: 444-canonical-ofx-closing-balance-saldo-do-dia]

**Contexto:** Correção da contaminação do saldo bancário atual por arquivos OFX extraídos em D+0 (manhã do dia seguinte) para conciliação contábil de D-1 (ontem).
**Regra aprendida:**
1. **Âncora no Saldo do Dia (`SALDO TOTAL DISPONÍVEL DIA`):** O extrato bancário oficial (Itaú) emite o saldo exato de fechamento de cada dia em uma linha `<STMTTRN>` com memo `SALDO TOTAL DISPONÍVEL DIA` e data `<DTPOSTED>` correspondente à data contábil da conciliação. Essa linha tem precedência absoluta sobre `<LEDGERBAL>`, que reflete o saldo vivo no instante da extração (D+0).
2. **Decodificação Resiliente & Normalização sem Acentos:** O buffer do OFX deve ser decodificado tentando UTF-8 estrito primeiro com fallback para Windows-1252. O memo deve ser normalizado com `.normalize("NFD")` para que `DISPONÍVEL` dê match com e sem acento e não caia prematuramente na lista de lixo `JUNK = ['SALDO TOTAL', ...]`.
3. **Descarte de `<LEDGERBAL>` de D+0:** O `<LEDGERBAL>` só pode ser adotado se `<DTASOF>` for menor ou igual à data de conciliação. Quando for posterior, seu valor deve ser preservado apenas no campo de auditoria `ledgerBalance`.
**Risco identificado:** A lista de descarte `JUNK = ['SALDO TOTAL', ...]` avaliada antes do scanner de fechamento descartava o saldo oficial do dia por conter a substring ASCII `SALDO TOTAL`.
**Não fazer:** Nunca ler cegamente `<LEDGERBAL><BALAMT>` sem comparar `<DTASOF>` com a data contábil da conciliação (`targetDate`).

---

## [2026-09-08] — [Feature ID: 377-formato-ofx-tabela-entradas-saidas-orfas]

**Contexto:** Preservação integral e transporte de metadados ricos do extrato bancário OFX durante as fases de preview e justificativas no Wizard de Importações (`Step2NonRevenueJustifications.tsx`).

**Regra aprendida:**
1. **Preservação Contínua de Metadados Bancários:** As interfaces e estruturas intermediárias em memória (`OFXEntry`) não devem resumir transações a apenas `id`, `amount`, `date` e `description`. É mandatório transportar `bankName`, `counterpartName`, `fitid`, `title` e `subtitle`. Isso permite que o operador financeiro audite de qual conta/banco a movimentação se originou e identifique pagamentos homônimos através do FITID e favorecido real.

**Risco identificado / Anti-pattern:** Descartar FITIDs e dados de instituição financeira durante a conversão para objetos de estado do React, dificultando a auditoria manual de transações de mesmo valor.

---

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

## [2026-09-03] — [Feature ID: 368-fix-ofx-sgml-parsing-and-auto-store-mapping-persistence]
**Contexto:** Correção de extratos bancários Itaú Empresas gerando 0 transações e saldos zerados devido à ausência de tags de fechamento `</STMTTRN>` (OFX 1.0 SGML), e perda de mapeamento de lojas de arquivos no formato `Extrato_{agencia}_{conta}_{data}.ofx`.
**Regra aprendida:**
1. **Parser OFX SGML Resiliente:** Extratos OFX 1.0 (Itaú) abrem `<STMTTRN>` mas NUNCA fecham `</STMTTRN>`. A extração não pode depender de `/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi`. Deve usar split por `<STMTTRN>` delimitado pelo próximo bloco ou tags de fechamento/balanço (`(?:<\/BANKTRANLIST>|<LEDGERBAL>|<PRVBAL>|<AVAILBAL>|$)`).
2. **Decodificação Windows-1252 / ISO-8859-1:** Ler arquivos OFX via `file.arrayBuffer()` com `TextDecoder('windows-1252')` antes de converter para string, prevenindo corrupção de caracteres acentuados nos memos.
3. **Normalização e Extração de Agência e Conta:** Verificar `<BRANCHID>` além de `<ACCTID>`. Se a conta tiver menos de 8 dígitos, compor `{agencia}{conta}`. Efetuar fallback inteligente via regex no nome do arquivo: `Extrato_(\d{4})_(\d{5,8})`.
4. **Mapeamento Persistente no PostgreSQL:** Todos os aliases canônicos (`{agencia}{conta}`, `{agencia}_{conta}`, `{conta}`, `Extrato_{agencia}_{conta}`, `ITAU - {agencia}{conta}`) DEVEM estar persistidos na tabela `public.store_file_mappings` via migration SQL e sincronizados automaticamente na primeira importação.
**Risco identificado / Anti-pattern:** Exigir tag de fechamento XML em padrões bancários SGML legados e manter mapeamentos de lojas voláteis apenas em memória transitória ou localStorage.

## [2026-09-08] — [Feature ID: 375-diagnostico-e-reducao-saidas-entradas-orfas-0809]
**Contexto:** Correção de falhas no parser de planilhas de contas a pagar (`contasPagarParser.ts`) causadas por datas codificadas como inteiros seriais do Excel (ex: `46269` correspondente a `2026-09-04`).
**Regra aprendida:**
1. **Conversão de Datas Seriais do Excel:**
   - Células formatadas como data em planilhas `.xls` / `.xlsx` geradas por ERPs legados são lidas pela biblioteca `xlsx` frequentemente como valores numéricos inteiros (`typeof val === 'number'`).
   - O helper `parseDate` DEVE utilizar `XLSX.SSF.parse_date_code(val)` para extrair `{ y, m, d }` e montar a string `YYYY-MM-DD` com padding de zeros (`padStart(2, '0')`).
   - Tratar números seriais do Excel como strings ou tentar `new Date(val)` direto gera datas corrompidas (ex: ano 1970) ou strings inválidas.
**Risco identificado / Anti-pattern:** Assumir que datas em planilhas Excel sempre vêm como strings (`"DD/MM/YYYY"`).

## [2026-09-09] — [Feature ID: 385-fix-ofx-zeroed-balances-and-triple-reconciliation-excel]
**Contexto:** Diagnóstico tríplice pericial (Sistema x OFX x Excel) e resolução de saldos bancários zerados (R$ 0,00) nas 4 filiais sem movimentação no dia (Rudge Ramos, Santo André, Jabaquara, Kennedy) e desmistificação da discrepância de R$ 2.000 em Planalto.
**Regra aprendida:**
1. **Âncora Temporal Estrita do Saldo Bancário (`<LEDGERBAL>`):**
   - O saldo bancário extraído de um extrato OFX representa a foto da conta corrente na data da conciliação (`targetDate` ou `<DTASOF>`).
   - NUNCA ancorar o saldo da conta na data da última transação encontrada (`txs[0].target_date` ou `t.target_date`). Se a filial não movimentou a conta no dia corrente, suas transações são de D-1 (ou D-n), mas o saldo da conta continua sendo do dia D!
   - Em `useTransactions.ts`, `storeBankBalances` DEVE ser sempre indexado na `targetDate` explícita da importação.
2. **Blindagem Contra Sobrescrita Nula no Upsert de Pátio:**
   - Em `CentralImportWizard.tsx`, ao gravar o pátio de OSs em `reconciliations`, SEMPRE preservar o `bank_total` existente da loja no payload. Se um upsert passar apenas `na_loja_os`, o Postgres cria uma linha com `bank_total = NULL` para aquela data, zerando indevidamente a visualização do Raio-X.
3. **Imutabilidade e Verdade do OFX vs Ilusão do Excel:**
   - O extrato bancário oficial emitido pelo banco (`.ofx`) é imutável e juridicamente perfeito. O saldo de Planalto (-R$ 5.659,95) comprovado na tag `<LEDGERBAL>` era a verdade absoluta, enquanto o Excel possuía um erro humano de digitação estática de R$ 2.000,00 na célula E6 (-R$ 7.659,95).
   - Além disso, no Excel o operador frequentemente mistura saldo de conta com recebíveis de cartão previstos, contaminando o saldo bancário. O sistema DEVE manter a segregação estrita dos 5 Pilares Contábeis.
**Risco identificado / Anti-pattern:** Usar a data de transações individuais para gravar o saldo da conta (`storeDates.set(sId, t.target_date)`) e rodar upsert em `reconciliations` sem injetar `bank_total`.

## [2026-09-15] — [Feature ID: 403-suporte-extrato-bancario-pdf-itau-transparente]
**Contexto:** Implementação de suporte transparente e automático para importação de extratos bancários Itaú em PDF (`.pdf`), eliminando a necessidade de conversão prévia para OFX ou seleção manual de tipo de arquivo pelo usuário.
**Regra aprendida:**
1. **Auto-detecção Transparente no Pipeline de PDFs:**
   - No `centralImportManager.ts`, nem todo `.pdf` é Mapa de Metas. O loop de PDFs deve inspecionar previamente o cabeçalho do arquivo (`isItauBankStatementPDF`).
   - Identificadores determinísticos de Extrato Bancário Itaú: presença de `Agência`, `Conta` e marcadores de extrato (`Saldo total`, `Lançamentos do período`, `SALDO ANTERIOR`, `SALDO EM CONTA CORRENTE` ou `Extrato`).
   - Se er extrato bancário, converte diretamente para `NormalizedOfxResult` e insere em `results.ofxResults`, caindo 100% no fluxo contábil existente (`ofx_transactions`).
2. **Layout Colunar por Coordenadas X do Extrato Itaú:**
   - Data contábil: `x ~ 25..75` (formato `DD/MM/YYYY`, âncora principal da linha).
   - Lançamentos / Histórico: `x ~ 75..220`.
   - Razão Social / Contraparte: `x ~ 220..360`.
   - CNPJ / CPF: `x ~ 360..460`.
   - Valor (R$): `x ~ 460..515` (positivo = `in`, negativo = `out`).
   - Saldo (R$): `x >= 515`.
3. **Particionamento Vertical de Linhas Multi-line por Ponto Médio:**
   - Como células com textos longos (ex: contraparte ou histórico) ocupam múltiplas linhas verticais centralizadas em torno da data, cada linha é delimitada pelo ponto médio entre a data anterior e a próxima (`(prevAnchor.y + anchor.y) / 2` até `(anchor.y + nextAnchor.y) / 2`), com teto no cabeçalho da tabela.
4. **Deduplicação Contínua por Dígitos da Conta:**
   - A deduplicação entre `.ofx` e `.pdf` deve checar não apenas strings exatas de alias, mas também a sequência contínua de dígitos (`cleanDigits.length >= 8`) para garantir que `ITAU - 7386_00175298` e `ITAU - 738600175298` colidam e mantenham a instância mais completa sem duplicar transações no banco.
**Risco identificado / Anti-pattern:** Encaminhar cegamente todo arquivo `.pdf` para o parser de Mapa de Metas ou exigir que o usuário escolha entre "Modo PDF" e "Modo OFX".

## [2026-09-17] — [Feature ID: 415-blindagem-vazamento-datas-anteriores-ofx]
**Contexto:** Eliminação definitiva de vazamento de transações bancárias de dias anteriores (14/09 e 15/09) que foram indevidamente agrupadas na conciliação de 17/09 na filial Piraporinha (st-05), causando divergência fantasma de R$ 14.387,06.
**Regra aprendida:**
1. **Isolamento Estrito de Extratos Multi-Dias:**
   - Arquivos OFX emitidos por bancos cobrem frequentemente períodos de 3, 7 ou 15 dias. Transações ocorridas em dias anteriores a D-1 (D-2, D-3, etc.) NUNCA devem ser coagidas para o `targetDate` do fechamento. Elas devem manter sua competência contábil original (`target_date = parsedTxDate`).
   - Apenas lançamentos do fechamento imediato (mesmo dia ou D-1, até 24h) são associados ao `targetDate` da conciliação.
2. **Proibição de Bypass por Batch Cego na RPC:**
   - A RPC SSOT `get_daily_reconciliation_summary` JAMAIS pode usar cláusula `OR import_batch_id IN (...)` sem filtro de data. Isso faz com que todo o histórico contido no lote vaze para a data corrente. A regra de agregação deve ser estritamente `t.target_date = v_target_date::date`.
3. **Eliminação de Duplicidade entre Contas Manuais e Saídas OFX:**
   - Ao apurar `contas_loja`, quando uma saída bancária do OFX é vinculada a uma conta manual (`daily_manual_bills`), somar `bst.contas_loja_total + sofx.saidas_justificadas` gera contagem dupla. A agregação deve usar `GREATEST` ou priorizar a conta manual, evitando diferenças falsas de saída.
4. **Isolamento de Escopo no Extrato (`dia_alvo` vs `lote_ofx`):**
   - Na visualização do Extrato Bancário (`StoreExtratoBancarioView`), quando em `dia_alvo`, `rawTransactions` e o loop de accordions (`dayGroups`) devem ser estritamente filtrados por `target_date === date`. Transações de outros dias só podem ser visualizadas se o usuário alternar para `Extrato Completo do OFX`.
**Risco identificado / Não fazer:** Usar janelas temporais largas (`Math.abs(...) <= 3 * 86400000`) no wizard de ingestão para "capturar" transações, e criar pontes irrestritas por lote em consultas SQL.

## [2026-09-21] — [Janela Contábil de Fechamento de Fim de Semana (Spec 423 / Spec 424)]

1. **Atribuição de Competência em Segundas-Feiras:** Em fechamentos de segunda-feira (ex: 21/09), transações bancárias ocorridas na sexta-feira anterior (ex: 18/09) e ao longo do fim de semana devem receber target_date = targetDate (competência do fechamento), com occurred_at preservando o timestamp real. A janela contábil canônica é diffDays <= 4.
2. **Filtro de Créditos Rede x OFX:** ReconciliadorRedeOFX e CentralImportWizard devem validar se os créditos bancários estão dentro da janela contábil de fechamento (diffDays <= 4), impedindo o descarte espúrio de depósitos de cartão ocorridos na sexta-feira.
3. **Blindagem do Caixa Anterior:** Ao importar uma segunda-feira, a busca pelo snapshot anterior (prevSnap) deve filtrar por is_closed = true, ignorando sábados e domingos sem conciliação e puxando o caixa fechado de sexta-feira.
