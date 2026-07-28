# 🧠 Memória Modular: Domínio & Conciliação

## [2026-07-28] — Feature ID: audit-and-batch-all-stores-ai-reconciler

**Contexto:** Varredura sequencial multi-loja 100% completa na conciliação por IA (`useBackgroundAiReconciler`), fatiamento de pendências em lotes (chunking) e correção de mapeamento de colunas de telemetria em `ai_execution_logs` (`input_payload` e `output_payload`).

**Regra aprendida:**
- **Mapeamento de Colunas de Telemetria:** A tabela `public.ai_execution_logs` no Supabase possui as colunas `input_payload`, `output_payload` e `reasoning_steps`. A função `saveTelemetryLog` em `llm-matcher.ts` DEVE utilizar rigorosamente esses nomes (em vez de `raw_payload_json`), permitindo que o DevTools Inspector na rota `/agente` formate os objetos e exiba 100% dos JSONs de entrada e saída.
- **Varredura Multi-Loja em Segundo Plano:** O reconciliador de IA silencioso `useBackgroundAiReconciler` NUNCA deve ser limitado a apenas uma loja (`stores[0]`) nem possuir limite rígido de 20 itens. Ele DEVE iterar por TODAS as lojas da rede (`stores`) e fatiar pendências de OS, Rede e OFX em lotes de até 15 itens, garantindo que 100% dos lançamentos sejam analisados pela LLM.
- **Trava de Hash por Loja:** A referência de hash de execução (`processedHashRef`) deve incluir a ID da loja (`currentStoreId`), a data de referência (`targetDate`) e a contagem dos itens não vinculados para evitar chamadas duplicadas no mesmo ciclo de render do React.

**Risco identificado:** Limitar a busca a `stores[0]` ou usar `.limit(20)` no Supabase faz com que lojas secundárias ou OSs remanescentes do pátio sejam ignoradas pela IA, exigindo intervenção manual desnecessária.

**Não fazer:** Nunca limitar a busca do reconciliador de IA a apenas a primeira loja da rede nem deixar de mapear as colunas `input_payload` e `output_payload` na gravação de logs de telemetria.

## [2026-07-28] — Feature ID: ai-reconciliation-payload-fix


**Contexto:** Correção na montagem do JSON enviado ao motor de IA (`generateTripleMatchSuggestions`) e busca de emergência de pendências reais em `useBackgroundAiReconciler`.

**Regra aprendida:**
- **Parser Defensivo de Payload:** O desempacotador em `llm-matcher.ts` DEVE inspecionar tanto a raiz do objeto quanto sub-propriedades como `raw_os`, `os_data`, `ofxDeposit` e `ofxPix`, extraindo `total_value`, `pix_value`, `credit_value`, `gross_value`, `net_value`, descrições de extrato e nomes de clientes.
- **Filtragem de Itens Zerados:** Itens com valor 0 (`0.00`) NUNCA devem ser incluídos no payload JSON enviado para a LLM, pois isso infla a contagem de tokens sem fornecer informação útil.
- **Busca de Emergência em Background:** Quando o hook `useBackgroundAiReconciler` recebe arrays vazios de pendências, ele DEVE consultar diretamente o Supabase por OSs abertas (`status != 'ENTROU'`), vendas da Rede e extratos OFX sem match para garantir que o payload contenha lançamentos reais.

**Risco identificado:** Mapear apenas propriedades rasas (`o.total_value`) sem verificar `o.raw_os?.total_value` faz com que objetos envelopados sejam serializados com valor 0, levando a LLM a responder com `{"matches": []}`.

**Não fazer:** Nunca invocar `generateTripleMatchSuggestions` sem desempacotar propriedades ou sem verificar se há dados válidos (> R$ 0.00) nos arrays.

## [2026-07-27] — Feature ID: redesign-conciliacao-cards-and-daily-summary

**Contexto:** Reestruturação dos cards de "Fechamento por Loja" na tela `/conciliacao` para exibir 6 colunas operacionalmente relevantes, remoção das colunas inúteis "Dinheiro MP" e "A Receber", e correção do saldo OFX que zerava em dias sem importação.

**Regra aprendida:**
- **6 Colunas dos Cards de Loja:** A grade de métricas por loja deve exibir EXCLUSIVAMENTE: `Faturamento` (total das OSs), `Maquininha` (Rede/cartão), `PIX` (PIX das OSs), `Na Loja OS` (saldo em aberto real), `Faturamento Itaú (OFX)` (saldo real acumulado), `Diferença` (Faturamento − Maquininha − PIX).
- **Saldo OFX Acumulado Não Zerado:** O hook `useDailyBankBalance(date)` busca `reconciliations.bank_total` com filtro de data, zerando o saldo em dias sem upload OFX. Para exibir o saldo correto, SEMPRE usar `useLatestBankBalance()` que consulta o último registro de `reconciliations.bank_total` por loja **sem restrição de data** (`ORDER BY date DESC LIMIT 1`).
- **Na Loja OS Correto:** O campo `na_loja_os` em `useModulo1StoresData` deve calcular `∑ max(0, total_value - paid_value)` das OSs com `status IN ('em_aberto', 'pago_parcial')`, e não somar o `paid_value` de todas as OSs como era feito antes.
- **PIX das OSs por Loja:** Adicionar `pix_os = ∑ patio_os.pix_transfer_value` por loja. O campo `pix_transfer_value` existe na tabela `patio_os` e deve ser somado separadamente do `cartao_entrou` (Rede/cartão).
- **Diferença:** A divergência por loja é calculada como `Faturamento − (Maquininha + PIX)`. Uma divergência próxima de R$ 0,00 indica fechamento correto; valores negativos ou altos indicam inconsistência de pagamentos.

**Risco identificado:** Usar `bankBalances[store.id].rawBalance` em vez de `latestBankBalance[store.id]` faz o saldo aparecer zerado em qualquer dia do calendário que não tenha OFX importado, dando a falsa impressão de que o banco está a zero.

**Não fazer:** Nunca exibir "Dinheiro MP" e "A Receber" nos cards de loja da conciliação enquanto esses campos ficarem zerados. Preferir exibir apenas as 6 métricas acima que são derivadas de dados reais.

## [2026-07-27] — Feature ID: fix-date-bleeding-and-remove-anomalies

**Contexto:** Correção de vazamento de datas no Módulo 1 da conciliação (`useModulo1StoresData`) e remoção da seção "Observações Críticas (Sem OS)".

**Regra aprendida:**
- As consultas a `patio_os` e `receivables` na função `useModulo1StoresData` DEVEM conter obrigatoriamente a cláusula `.eq('target_date', date)` para que OSs e recebíveis de dias anteriores não sejam somados em datas sem movimentação.
- A seção "Observações Críticas (Sem OS)" no componente `ResumoDiaPanel.tsx` foi permanentemente removida da interface para manter o painel de fechamento limpo e focado nos sldos consolidados.

**Risco identificado:** Consultar tabelas de apoio sem filtro de data faz acumulados históricos aparecerem em dias vazios do calendário.

**Não fazer:** Nunca consultar `patio_os` ou `receivables` em funções de estado por data sem filtrar pela data selecionada.

## [2026-07-27] — Feature ID: fix-modulo1-calculation-properties

**Contexto:** Correção de discrepância de nomes de propriedades na montagem do array de estado das lojas (`storesState`) no arquivo `src/routes/conciliacao.index.tsx`.

**Regra aprendida:**
- A interface `StoreSaldoState` em `src/lib/modulo1Calculations.ts` define rigorosamente as chaves: `saldo_banco_itau`, `a_receber`, `na_loja_os`, `faturamento_atual`, `limite_credito` e `caixa_anterior`.
- Ao montar o estado das lojas para o componente `<ResumoDiaPanel />`, NUNCA utilize sufixos alternativos como `saldo_banco_itau_ofx`, `a_receber_pendente` ou `na_loja_os_patio`. A divergência de nomes faz a função `calculateModulo1Saldo()` ler `undefined` e zerar todos os cartões de Saldo Total, Caixa Atual, Disponível Contas e Resultado Final.
- Em `useModulo1StoresData`, a busca por saldos de extrato OFX deve filtrar `t.source === 'ofx' && (t.type === 'in' || Number(t.amount || 0) > 0)` para não ignorar lançamentos positivos que não tenham o tipo string explicitamente gravado como `'in'`.

**Risco identificado:** Mudar o nome de propriedades na rota da página faz com que a função de cálculo pura retorne `0.00` em todos os indicadores financeiros do topo da conciliação.

**Não fazer:** Nunca instanciar objetos da interface `StoreSaldoState` sem verificar a correspondência exata de cada chave com o tipo TypeScript exportado.

## [2026-07-24] — Feature ID: background-ai-telemetry-engine

**Contexto:** Conciliação 100% silenciosa em segundo plano (Headless Background) e Central de Telemetria & Audit Trail de IA na página de Configurações (`/configuracoes`), conforme padrões de arquitetura de referência (Hermes Agent / BMF IA OS).

**Regra aprendida:**
- **Zero UI Visível na Conciliação:** A tela de conciliação diária não deve conter botões, modais ou selos visíveis de "IA". O operador navega na interface tradicional e limpa.
- **Auto-Matching Silencioso:** Vínculos com nota de confiança $\ge 90\%$ identificados pela IA são aplicados automaticamente na tabela `conciliation_matches` do Supabase sem necessidade de aprovação manual.
- **Central de Telemetria & Logs (`ai_execution_logs`):** Cada chamada à LLM é auditada imutavelmente registrando:
  - Tokens de Prompt, Completion e Total.
  - Custo estimado acumulado em dólares ($ USD) e reais (R$ BRL).
  - Tempo de execução em milissegundos (`execution_time_ms`).
  - Payload JSON bruto de entrada (Input), Resposta JSON bruta (Output) e Raciocínio (Chain of Thought) passo-a-passo.

**Risco identificado:** A exibição de botões de IA na conciliação interrompe o fluxo de trabalho do operador e despadroniza a interface executiva.

**Não fazer:** Nunca reintroduzir botões visíveis ou modais de confirmação manual de IA na tela de conciliação diária; o processamento por IA deve ser estritamente headless e auditável via `/configuracoes`.

## [2026-07-24] — Feature ID: conciliacao-fk-fix-ui-harmony

**Contexto:** Correção de Foreign Key no importador/alertas e harmonização da UI com a remoção dos códigos de célula `(G13..G31)` e unificação do Hero Card da conciliação.

**Regra aprendida:**
- Os campos `ofx_transaction_id` e `rede_transaction_id` em `conciliation_matches` possuem restrições rígidas de Chave Estrangeira com a tabela `transactions`. IDs nulos ou sintéticos (ex: `ALERT_xxx`) DEVEM ser convertidos em `null` antes de gravar no banco para não estourar erro de Foreign Key.
- Nas interfaces públicas do sistema, NUNCA exiba referências brutas de células do Excel (como `(G13)`, `(G14)`, `(G31)`) nas labels. Exiba apenas os nomes limpos dos indicadores: `Banco Itaú`, `Dinheiro MP`, `A Receber`, `Na Loja OS`, `Saldo Total`, `Caixa Atual`, `Disponível Contas` e `Resultado Final`.
- O topo da página de conciliação (`/conciliacao`) DEVE conter um **Hero Card ÚNICO e unificado**, em vez de cartões duplicados ou empilhados.

**Risco identificado:** Tentar salvar IDs de transações temporários ou sintéticos em `conciliation_matches` abortava o salvamento de toda a importação.

**Não fazer:** Nunca exibir siglas de fórmulas brutas ou empilhar dois painéis de resumo idênticos na mesma tela.

## [2026-07-24] — Feature ID: conciliacao-tab-redesign

**Contexto:** Correção da lógica de pareamento entre Maquininha, Extrato OFX e OSs do Pátio nas telas de conciliação individual por loja (`conciliacao.$lojaId.tsx`), além da adição de uma aba exclusiva de conciliação de PIX.

**Regra aprendida:**
- Transações bancárias do OFX identificadas como depósitos de adquirente (`REDE`, `REDECARD`, `MAST`, `VISA`, `ELO`, `PAGAMENTO S.A.`) que foram pareadas com a movimentação líquida da maquininha (Aba 2) NUNCA devem figurar na aba de extrato sem associação (`ofxSemMatch` / Aba 4).
- O cálculo de delta na conciliação `OS → Maquininha` (Aba 1) deve considerar a proporção em cartão (`parsed_credit_debit`) para OSs com recebimento fracionado/misto (ex: Cartão + PIX) para evitar falsos deltas negativos.
- A conciliação por loja deve ser dividida em 4 pilares cristalinos: `1. Cartão (OS → Maquininha)`, `2. Maquininha (Líq) → Banco`, `3. PIX (OS → Banco OFX)` e `4. Banco (Sem Origem)`.

**Risco identificado:** Exibir o mesmo lançamento do extrato bancário como "Pareado" em uma aba e "Não Identificado" em outra causa desconfiança no usuário quanto à integridade do fechamento.

**Não fazer:** Nunca deixar depósitos de cartão já pareados vazarem para a lista de extratos sem match.

## [2026-07-24] — Feature ID: conciliacao-visual-grouping

**Contexto:** Pareamento visual agrupado das vendas da maquininha dentro do card do depósito bancário OFX correspondente (ex: R$ 3.652,33 + R$ 330,38 = R$ 3.982,71), busca abrangente de OSs por loja e Modal de Detalhes da OS.

**Regra aprendida:**
- Na busca de OSs do pátio para conciliação (`patio_os`), NUNCA restrinja a consulta por `entry_date` exato de 1 dia, pois OSs cadastradas em dias anteriores continuam sendo conciliadas e vinculadas aos lotes do dia atual.
- Para conciliar N transações de cartão com 1 depósito bancário acumulado, apresente visualmente os itens da maquininha agrupados DENTRO do card do depósito bancário OFX com a soma transparente dos valores dos itens.
- Ao clicar no número da OS em qualquer tabela de conciliação, abra o modal de detalhes (`OsDetailModal.tsx`) exibindo cliente, veículo, valor total, valor pago e fracionamento das formas de pagamento.

**Risco identificado:** Restringir a busca de `patio_os` por data exata fazia o faturamento da OS parecer `R$ 0,00`, gerando deltas falsos negativos.

**Não fazer:** Nunca apresentar tabelas desconectadas de maquininha e banco sem mostrar qual grupo de vendas forma qual depósito.

## [2026-07-24] — Feature ID: conciliacao-layered-matching

**Contexto:** Motor de conciliação em 4 camadas com busca por subconjunto (Subset-Sum / Backtracking) e contextualização temporal D-1/D-2 para eliminar falsas divergências em depósitos bancários com múltiplas vendas de maquininha.

**Regra aprendida:**
- NUNCA utilize um algoritmo de acúmulo guloso (*greedy*) para agrupar vendas em um depósito bancário. O agrupamento deve testar rigorosamente:
  1. **Camada 1:** Casamento exato 1:1 (`|rede.amount - ofx.amount| < 0.05`).
  2. **Camada 2:** Subset-Sum combinatório por backtracking ($N \le 6$) para encontrar a soma exata de $N$ vendas que forma o depósito bancário no mesmo dia.
  3. **Camada 3:** Extensão temporal para buscar vendas não conciliadas de $D-1$ e $D-2$ que explicam os depósitos de hoje (ex: vendas de fim de semana liquidadas na segunda-feira).
  4. **Camada 4:** Isolamento de exceções e divergências reais em painel dedicado de alertas (`ConciliacaoAlertsSection.tsx`).

**Risco identificado:** Tentar agrupar todas as vendas no primeiro depósito gera divergências artificiais em todos os outros depósitos. O subset-sum exato garante $R\$ 0,00$ de divergência para pareamentos matematicamente perfeitos.

**Não fazer:** Nunca forçar pareamento parcial ou parcial guloso se a soma não bater 100% exata; lançamentos que não fecham devem cair no painel de exceções/alertas da loja.

## [2026-07-24] — Feature ID: conciliacao-modulo-saldo-completo

**Contexto:** Overhaul da tela principal de conciliação (`/conciliacao`) com o Painel Financeiro Consolidado da Aba SALDO (Módulo 1 da planilha `CONCILIACAO-2307.xlsx`).

**Regra aprendida:**
- A cadeia de formulas de G13 a G31 da planilha `CONCILIACAO-2307.xlsx` deve ser replicada de forma rigorosa no frontend:
  `SALDO (G13)` -> `DINHEIRO MP (G14)` -> `A RECEBER (G15)` -> `NA LOJA (G16)` -> `SALDO TOTAL (G17)` -> `CAIXA ATUAL (G21)` -> `FLUXO CAIXA (G23)` -> `DISPONÍVEL CONTAS (G29)` -> `RESULTADO FINAL (G31)`.
- O campo `DINHEIRO MP (G14)` suporta preenchimento manual por loja conforme preferência operacional do usuário.
- O subtotal "NA LOJA (G16)" é alimentado automaticamente pela soma do valor das OSs em aberto (`status != 'ENTROU'`).

**Risco identificado:** Alterar os nomes das variáveis ou inverter a ordem da subtração de Caixa Atual e Limite gera erro na apuração do Saldo Livre Real.

**Não fazer:** Nunca calcular o resultado final sem abater a reserva de Limite de Crédito digitada por loja.

## [2026-07-24] — Feature ID: conciliacao-os-parsing-history-fix

**Contexto:** Correção na leitura de OSs quitadas (Módulo 2), uso do valor bruto em cartão em vez do saldo zerado, e Trava Anti-Duplicação.

**Regra aprendida:**
- Quando uma OS é quitada ou finalizada na planilha de pátio, seu saldo pendente torna-se `R$ 0,00`. No cruzamento $OS \leftrightarrow Maquininha$, o motor DEVE utilizar o **Valor Bruto em Cartão (`credit_debit_value` / `total_value`)**, NUNCA o saldo em aberto zerado (`0.00`).
- **Trava Anti-Duplicação:** OSs marcadas com `status = 'ENTROU'` ou que possuem registro prévio em `conciliation_matches` NUNCA podem ser re-pareadas em conciliações de dias posteriores. O depósito de amanhã SÓ pareia se houver uma OS nova pendente dos lotes recentes.

**Risco identificado:** Usar o saldo zerado fazia OSs finalizadas de R$ 3.385,00 parecerem R$ 0,00 no pareamento com a maquininha.

**Não fazer:** Nunca usar o valor de saldo remanescente em aberto como valor de cobrança de cartão.

## [2026-07-24] — Feature ID: conciliacao-baixa-manual-override

**Contexto:** Baixa manual universal e botão "Marcar como ENTROU" para OSs e lançamentos sem vínculo.

**Regra aprendida:**
- Permitir que o usuário force o status `ENTROU` em qualquer OS ou pendência sem vínculo direto no extrato (ex: dinheiro não depositado ou importações históricas).
- Gravar a resolução com `match_type = 'MANUAL_OVERRIDE'` em `conciliation_matches` e revalidar os caches instantaneamente (`queryClient.invalidateQueries`).
- Oferecer opção de "Reverter para Pendente" para permitir desfazimento amigável em caso de erro.

**Risco identificado:** A baixa manual precisa atualizar a Aba SALDO imediatamente, retirando a OS de "NA LOJA (G16)" e migrando para o caixa realizado.

**Não fazer:** Nunca exigir recarregamento manual da página (F5) para refletir a baixa efetuada pelo operador.
