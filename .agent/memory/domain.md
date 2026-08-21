## [2026-08-07] — [Feature ID: 141-fix-conciliacao-valor-contas-fluxo]

**Contexto:** O painel global de Conciliação Diária estava com a matemática quebrada, ignorando contas originárias de OFX e não calculando o Fluxo de Caixa histórico. A RPC do Supabase (`get_dashboard_metrics`) desviava das fórmulas aplicadas no React.

**Regra aprendida:** The Single Source of Truth matemática. Para a conciliação:
1. "Valor Contas" DEVE abrigar as saídas (type=out) do banco de dados onde `source = 'ofx'`, pois representam despesas não mapeadas pelo sistema interno.
2. "Fluxo de Caixa" DEVE ser obrigatoriamente a diferença entre `Caixa Atual (hoje)` e `Caixa Atual (ontem / snapshot fechado anterior)`. O cálculo nunca deve ser `Faturamento Líquido - Contas`, pois a variação patrimonial é a única métrica que importa para o usuário.

**Risco identificado:** Matemática em duplicidade. O frontend e o backend devem sempre utilizar a mesma fórmula para compor fluxos, caso contrário o cliente vê um valor na tela principal e outro no breakdown detalhado.

**Não fazer:** Nunca preencher propriedades matemáticas reativas com variáveis hardcoded (ex: `totalOfxOut={0}`) em componentes vitais como o dashboard, ocultando bugs do backend no layout.

## [2026-08-07] — [Feature ID: 145-fix-fluxo-and-autosave]

**Contexto:** Correção avançada na matemática do fluxo de caixa e automação do autosave no `CentralImportWizard.tsx`.

**Regra aprendida:** 
1. "Valor Disponível" DEVE ser calculado como `Faturamento - Fluxo de Caixa`, nunca somado.
2. "Diferença" DEVE ser `(Faturamento - Fluxo de Caixa) - Valor Contas`, fechando o saldo zero exato.
3. Snapshots Diários (`daily_snapshots`) devem ser auto-salvos assim que uma importação de lote é confirmada via RPC `get_dashboard_metrics` para garantir que o "Caixa Anterior" (o lastro do fluxo de caixa) sempre exista para o próximo dia.

**Risco identificado:** Ficar dependendo de interação humana (clique manual de "Salvar Fechamento Diário") impede que conciliações de dias passados fechem a matemática do fluxo de caixa porque o "Caixa Anterior" se perde no banco.

**Não fazer:** Nunca calcular Fluxo de Caixa sem ter um snapshot gravado do último estado, pois o lastro financeiro se torna inexistente.

## [2026-08-10] — [Feature ID: match-audit-and-fix]

**Contexto:** Correção da engine de Auto-Match (RPC `auto_match_transactions`) para respeitar regras de escopo global vs local (loja) durante o pareamento de OFX, Maquininha e OS.

**Regra aprendida:** O OFX bancário é global (`store_id` é nulo). Maquininhas (POS) e Ordens de Serviço (OS) são locais (`store_id` definido). O pareamento exige 3 pipelines distintos: 1) PIX (OFX Global vs OS Local - busca transversal); 2) Maquininha Líquida vs OFX Rede (Soma de POS local vs entrada OFX global); 3) Maquininha Bruta vs OS Cartão (POS local vs OS local no cartão).

**Risco identificado:** Tentar fazer `WHERE store_id = ofx.store_id` quebra silenciosamente qualquer match porque `NULL = DP` avalia como falso. Além disso, esquecer do LIMIT 1 nas associações pode causar N matches para a mesma OS caso hajam valores repetidos no mesmo dia.

**Não fazer:** Nunca assuma que transações bancárias (OFX) terão `store_id` populado, e nunca ignore o valor bruto da maquininha no pareamento direto com a OS (pátio).

## [2026-08-10] — [Feature ID: 148-fix-conciliation-diff]

**Contexto:** Correção do apagão do histórico de 'Na Loja OS' e da diferença astronômica (ex: -120k) causados por falha ao reimportar históricos e pela premissa errada de que OFX não tinha loja.

**Regra aprendida:** O cliente **SOBE UM OFX PARA CADA LOJA**, logo as transações do Itaú possuem sim `store_id` mapeado no momento da importação! A RPC `auto_match_transactions` DEVE filtrar o OFX por `store_id` para não misturar dinheiros de filiais diferentes. Além disso, o motor `calculate_daily_conciliation` precisa ler `reconciliations.na_loja_os` como snapshot histórico para dias fechados (pois a OS atual já consta como paga e seu saldo 'restante' real é 0).

**Risco identificado:** Mudar a estrutura de tabelas antigas (como adicionar `dedup_hash`) e permitir que registros históricos fiquem com `NULL`. Quando o usuário re-importa o passado, o `NULL` permite duplicação, inflando absurdamente totais como o de Maquininha.

**Não fazer:** Nunca assumir que um arquivo OFX é 'global' apenas por ser extrato bancário sem antes verificar a rotina de importação. Nunca recalcular 'saldo devedor/restante' de dias passados lendo o status da OS hoje.

## [2026-08-10] — [Feature ID: 152-manual-expenses]

**Contexto:** Desacoplamento da matemática de "Contas a Pagar" da importação bruta do OFX_out. O arquivo importado trazia despesas de dias correntes que quebravam a matemática da conciliação do dia anterior.

**Regra aprendida:** Nunca atrelar matematicamente despesas importadas do banco (`ofx_out`) diretamente na fórmula da conciliação diária global se o processo de importação englobar dias não equivalentes ao `target_date`. A conciliação exige que a "conta" seja um valor exato inputado manualmente e salvo estaticamente no `daily_snapshots`.

**Risco identificado:** Hidratação de valores. A interface precisa forçar o React a carregar o valor histórico salvo para aquela data toda vez que o `selectedDate` mudar, caso contrário o valor de hoje transborda acidentalmente para dias já fechados do passado.

**Não fazer:** Nunca misturar o valor brutamente somado do extrato `ofx_out_total` com a "Diferença" final do sistema. O extrato só serve como Raio-X ou auditoria, e o `inputForCalculation` obedece apenas a variáveis controladas.
  
## [2026-08-11] - [Feature ID: 165/166]

**Contexto:** Implantação de Saldo Inicial (Marco Zero Global) lido de planilha Excel, forçando a auditoria manual diária de passivos pendentes.

**Regra aprendida:** O Excel do "Marco Zero" não agrupa lojas por aba, mas sim por linha dentro das abas globais (SALDO, OS). O parser deve ler a planilha linha a linha, identificar o nome da loja na Coluna A e usar dicionários para agrupar saldos e OSs extraídas por `storeName`. A UI deve, através do `storeName`, usar fuzzy matching para auto-selecionar o Store ID sem obrigar cliques manuais, enquanto exibe blocos isolados por loja.

**Risco identificado:** Assumir que o nome da aba representa o bloco de dados (ex: Aba SALDO). Isso mistura saldos de filiais diferentes. Além disso, ocultar as baixas de OSs antigas sem obrigar auditoria criaria um passivo infinito.

**Não fazer:** Nunca parsear Excel de múltiplas filiais assumindo que 1 aba = 1 entidade sem antes inspecionar os dados. Nunca permitir importação diária de conciliação sem forçar a resolução do estoque passivo pendente (step 2.5).

## [2026-08-12] - [Feature ID: 167-marco-zero-parser-fix]

**Contexto:** Refatoração do Parser do Marco Zero para evitar criação de "lojas fantasmas" devido a rótulos de saldo na mesma coluna que nomes de lojas.

**Regra aprendida:** O parser de um arquivo Excel consolidado não deve confiar cegamente que a primeira coluna preenchida de uma linha seja sempre um agrupador (como Loja). É necessário usar um "Stateful Parser", verificando rigorosamente contra um dicionário oficial (`REDE_STORE_MAPPING`). Rótulos adicionais na mesma coluna ("Cartão Débito", "Saldo Banco Itaú") não devem gerar lojas novas, mas sim injetar seus respectivos valores (presentes em outras colunas) na última loja válida detectada.

**Risco identificado:** Qualquer rótulo desconhecido criar entidades falsas no importador, sujando toda a base global.

**Não fazer:** Nunca assumir que toda linha de um Excel sem cabeçalhos rigorosos define uma entidade nova. Use validação estrita (`isKnownStore`) antes de abrir blocos em memória para agregar dados.
  
## [2026-08-12] - [Feature ID: 168-marco-zero-columns]  
  
**Contexto:** Refatoracao final do Marco Zero para tratar saldos globais vs OSs locais separadamente e injetar o snapshot diario inicial.  
  
**Regra aprendida:** 1) O Excel de Marco Zero consolida Caixa Atual, Dinheiro MP, A Receber e Negativo como um BLOCO GLOBAL (Colunas G e H), e nao dados repetidos por loja. O parser deve separar a extracao global da extracao por filial. 2) A implantacao do Marco Zero DEVE exigir uma Data retroativa e salvar obrigatoriamente um registro na tabela daily_snapshots para ancorar o Caixa Anterior do dia seguinte.  
  
**Risco identificado:** Tratar blocos globais (Dinheiro MP) como propriedades das lojas multiplicaria o dinheiro ficticiamente N vezes. Alem disso, nao salvar o snapshot no banco faria com que o fluxo de caixa iniciasse sem um 'Caixa Anterior' valido.  
  
**Nao fazer:** Nunca misture dados que foram concebidos de forma global (como Saldo Conta Itau e Dinheiro MP centralizado) dentro de modelos locais (store). Nunca permita uma importacao de marco zero sem data base ancorada num daily_snapshot. 

## [2026-08-13] — [Feature ID: 179-fix-dashboard-math]

**Contexto:** Correção da matemática financeira do Dashboard e motor RPC de cálculo global (Caixa Atual, Diferença, A Receber e Pátio) a pedido expresso do cliente.

**Regra aprendida:** 
- O "Saldo Banco Itaú" é puramente a soma das entradas importadas do arquivo OFX sem subtrações fantasmas de saldos negativos do Itaú. 
- A fórmula mestra da Diferença na conciliação é estritamente: `(Faturamento_Atual - Fluxo_Caixa) - (Contas_a_Pagar + Juros_Rede)`.
- Faturamento Atual (ou Líquido) refere-se única e exclusivamente às entradas puras importadas do OFX.

**Risco identificado:** A RPC no banco de dados e o hook no frontend calculando valores redundantes (como subtrair no banco e depois no React) causando dessincronia irreparável da fonte da verdade financeira.

**Não fazer:** Nunca misture a variável "A Receber Manual" com os valores somados das OSs (Pátio). Eles devem existir de forma independente na lógica do sistema. Nunca subtraia saldo negativo na composição do "Caixa Atual" se os saldos base já incluem o saldo bancário real.

## [2026-08-13] — [Feature ID: 186-refatoracao-marco-zero]

**Contexto:** A data de implantação do Marco Zero exibia a UI operacional diária cheia de divergências e o banco corrompia saldos. Refatorado com RPC atômica, download de logs `.json` e UI dedicada de Estado Inicial.

**Regra aprendida:** 
1. O Marco Zero representa um **Estado Inicial da Loja (Leitura de Lastro Legado)**. Na tela de Conciliação Diária (`/conciliacao`), ao acessar uma data com `metadata.is_marco_zero = true`, a UI DEVE alternar para a visão simplificada ("Estado Inicial Implantado") exibindo apenas os saldos legados e a confirmação de integridade.
2. A RPC `process_marco_zero_import` isola o escopo por `store_id` e salva o snapshot inicial para ancorar o "Caixa Anterior" dos dias subsequentes.

**Risco identificado:** Exibir botões operacionais de conciliação bancária diária na data do Marco Zero gera divergências fantasmas porque o Marco Zero não possui extratos OFX de entradas/saídas operacionais daquele dia.

**Não fazer:** Nunca renderizar calculadoras de divergência bancária diária padrão em uma data marcada com `is_marco_zero: true`.
  
## [2026-08-13] - [Feature ID: 187-gestao-os-legadas]  
  
**Contexto:** Gest�o das OSs importadas pelo fluxo do Marco Zero na vis�o di�ria da filial.  
  
**Regra aprendida:** As datas de Marco Zero usam uma vis�o de tabela dedicada (LegacyOsTable) ao inv�s do dashboard de concilia��o normal, pois n�o possuem movimenta��o OFX. A liquida��o manual ou em lote dessas OSs via RPC ajusta reativamente o contador Na Loja OS.  
  
**Risco identificado:** Risco de contagem duplicada ou dupla baixa. A RPC liquidate_legacy_os valida a execu��o at�mica WHERE status = 'em_aberto'.  
  
**N�o fazer:** N�o misturar OSs do Marco Zero (saldo inicial legadas) com o fluxo de concilia��o di�rio (aba de Cart�o/Pix), pois as OSs legadas j� tiveram seu caixa original depositado no passado, devendo constar apenas a baixa do passivo. 

## [2026-08-13] - [Feature ID: 191-fix-calculo-diferenca-final]

**Contexto:** O valor disponivel para contas da conciliacao pode ser matematicamente negativo se o fluxo de caixa for excessivo em comparacao ao faturamento do periodo (indicando que a loja esta usando saldo anterior). Ao deduzir as despesas (Juros + Contas) deste saldo disponivel negativo, a formula A - B estava gerando -A - B (somando as dividas em magnitude).

**Regra aprendida:** Em balancos de fechamento de caixa, sempre aplique Math.abs() ao confrontar o saldo/massa disponivel com o montante de despesas, se o objetivo da rubrica final for demonstrar apenas a variacao pura (ex: Diferenca Final = Math.abs(Valor Disp. Contas) - Despesas). Isso alinha o balanco com o que e fisicamente compreensivel (tenho 90k, devo 90k, diferenca 0).

## [2026-08-13] - [Feature ID: 192-fix-ofx-precision]

**Contexto:** Ao importar extratos bancarios (.OFX), o parser genérico removia o separador decimal caso houvesse apenas um unico digito pos-virgula, por entender que tratava-se de erro ou formatacao ruim. Isso acarretava perdas de milhares de reais (fator 10x) em saldos de matrizes grandes como a Jabaquara.

**Regra aprendida:** Tags monetarias sensiveis a fraude/erro (como <LEDGERBAL> <BALAMT>) nao devem usar extractNumber ou replaces baseados em regex [^0-9]. Devem usar a base nativa (parseFloat) combinada com elevacao matematica a centavos (Math.round(val * 100) / 100) para travar decimais.

## [2026-08-13] - [Feature ID: 193-fix-global-reconciliation]

**Contexto:** O saldo global (Saldo Banco Itaé) na tela de conciliação apresentava valores inflados (ex: 6.5M). Isso ocorreu porque o cálculo RPC `get_dashboard_metrics` estava usando a soma das transações (maq + pix) em vez de usar estritamente o `bank_total` original processado de cada banco, além de existirem registros corrompidos na base legada antes do fix 192.

**Regra aprendida:** Agregações de saldo bancário `bank_total` globais não podem ser reconstruídas por faturamentos indiretos na RPC. A RPC global de dashboard deve sempre fazer JOIN e SUM na tabela `reconciliations` (coluna `bank_total`) que retém a fonte real da verdade do OFX.

## [2026-08-13] - [Feature ID: 194]-restore-previous-parser-and-fix-decimals-and-math

**Contexto:** Os valores importados do OFX perdiam a precisão decimal quando terminavam em dízima de um dígito (ex: `.9`, `.5`) devido a uma falha na função legada `extractNumber`. Além disso, a diferença final da conciliação somava sinais negativos em cascata.

**Regra aprendida:** Todo parse de moeda vinda do OFX (TRNAMT, BALAMT, LIMIT) deve ser literalmente convertido usando `parseFloat(` apñs replace de vírgula, e multiplicado por 100 com `Math.round(*float* * 100)` para garantir centavos exatos. A subtração de diferenças de caixa deve sempre confrontar a magnitude absoluta (`Math.abs()`) do disponível contra as contas.


## [2026-08-14] — [Feature ID: 195-fix-na-loja-os-math]

**Contexto:** O card "NA LOJA OS" exibia R$ 1.596.629,29 de forma persistente mesmo após limpar as importações diárias de pátio na UI, porque a tabela `estoque_os_pendente` (Marco Zero legado) estava sendo somada na métrica de fechamento diário.

**Regra aprendida:** Agregações de fechamento diário (`get_dashboard_metrics` e `calculate_daily_conciliation`) devem refletir estritamente a movimentação corrente/transitória do pátio (`patio_os`). Dados estáticos/passivos de legado (Marco Zero / `estoque_os_pendente`) não devem ser somados diretamente aos cards de fechamento diário sem uma segmentação ou card explícito.

**Risco identificado:** Misturar passivo legado com fluxo de pátio ativo faz o usuário acreditar que o botão de reset/lixeira da importação falhou.

**Não fazer:** Nunca misturar saldos estáticos de tabelas de histórico Marco Zero diretamente em totais operacionais diários sem um card ou flag exclusivo.


## [2026-08-14] — [Feature ID: 196]

**Contexto:** Delegação total dos cálculos de conciliação e agregação de saldos das 10 lojas para o PostgreSQL através da RPC `get_daily_reconciliation_summary`.

**Regra aprendida:**
1. Faturamento Líquido do fechamento diário é a soma direta de entradas puras do OFX no dia (`type = 'in'`), e não a subtração de faturamentos acumulados passados.
2. Consolidação de saldos das 10 lojas no PostgreSQL deve usar `DISTINCT ON (store_id) store_id, bank_total FROM reconciliations WHERE date <= p_date ORDER BY store_id, date DESC` para garantir que lojas sem movimentação no dia exato não fiquem de fora do somatório geral.
3. Não executar múltiplos `.reduce()` ou múltiplas queries pesadas no client React para métricas de conciliação.

**Risco identificado:** A tabela `ofx_transactions` usa colunas `target_date`, `counterpart_name`, `fitid` e valores `'in'`/`'out'`, e não `description`, `date` ou `'CREDIT'`.

**Não fazer:** Nunca calcular consolidação diária agregando transações no client-side nem subtrair faturamento acumulado do mês de entradas diárias isoladas.

## [2026-08-14] — [Feature ID: 197-odometer-faturamento-and-ui-cleanup]

**Contexto:** O faturamento digitado na conciliação segue a lógica de "odômetro" (leitura acumulada do mês até hoje). O faturamento real (líquido) do dia é a diferença incremental: Faturamento Líquido (Dia) = Faturamento Acumulado Hoje (Input) - Faturamento Acumulado Ontem (Ant). O valor digitado hoje é salvo em daily_snapshots.faturamento para servir de base Ant para amanhã.

**Regra aprendida:**
1. Faturamento tipo Odômetro: O input do operador é o acumulado histórico do mês. O faturamento diário é calculado subtraindo o faturamento_anterior (se > 0).
2. Valor Disp. Contas utiliza diretamente o faturamento líquido do período (Faturamento Líquido - Fluxo de Caixa).
3. O daily_snapshots.faturamento deve armazenar o valor acumulado bruto (leitura do odômetro) para manter a integridade da cadeia de snapshots.

**Risco identificado:** Digitação acidental de uma leitura inferior à anterior gerando faturamento líquido negativo. A UI deve exibir em destaque o comparativo com a leitura anterior.

**Não fazer:** Nunca subtrair receitas individuais de OFX do faturamento sem respeitar a leitura acumulada como verdade mestre do fechamento.

## [2026-08-14] — [Feature ID: 198-manual-os-diff-resolution-in-import-modal]

**Contexto:** Resolução manual de OSs ausentes no modal de importação centralizada para ordens antigas do pátio que não constam no recorte mensal do ERP.

**Regra aprendida:**
1. **Controle Manual Estrito de OSs Órfãs:** O sistema deve detectar no client-side quais OSs ativas no banco de dados não vieram no relatório importado do mês atual e renderizar uma tabela simples para edição direta de `Valor Total`, `Total Pago` e `Status`.
2. **Sem Baixas Mágicas / Automáticas:** O operador ajusta os valores e status livremente na tabela.
3. **Persistência em Lote:** As alterações das OSs ausentes só são persistidas no Supabase ao confirmar o lote final de importação, garantindo atomicidade e conferência prévia.

**Risco identificado:** Sobrescrever ou deletar ordens ativas do pátio simplesmente porque não constam na planilha mensal recente.

**Não fazer:** Nunca aplicar baixas automáticas ou inferir liquidação de ordens sem confirmação explícita do operador.

## [2026-08-14] — [Feature ID: 199-unified-single-flow-import-modal]

**Contexto:** Unificação do fluxo de importação e fechamento diário em um modal Single-Flow de 2 colunas com persistência centralizada de mapeamentos de lojas no Supabase.

**Regra aprendida:**
1. **Persistência Centralizada de Mapeamento de Lojas:** Os vínculos entre os identificadores dos arquivos (aliases) e as lojas cadastradas devem ser persistidos na tabela `store_file_mappings` no Supabase. Isso garante que nunca seja necessário refazer os matches ao trocar de navegador ou sessão.
2. **Layout em Bloco Único (Sem Steppers):** A interface de importação e fechamento concentra a dropzone, o reconhecimento de lojas, os inputs globais do dia (odômetro, dinheiro MP, a receber, contas manual) e o grid de OSs órfãs em uma única visualização em 2 colunas.
3. **Persistência em Lote:** O fechamento e a importação são enviados ao Supabase em um único lote atômico através do botão "Confirmar e Gravar Fechamento".

**Risco identificado:** Perda de matches de lojas em novos navegadores caso dependa exclusivamente de `localStorage`.

**Não fazer:** Nunca armazenar mapeamentos de infraestrutura financeira apenas no storage local do browser.

## [2026-08-14] — [Feature ID: 200-202-import-reactive-flow-and-marco-zero]

**Contexto:** Central de Importações em tela cheia com estados reativos, normalização estrita de constraints de OFX (in/out), carga de Marco Zero e Inspetor JSON de conciliação.

**Regra aprendida:**
1. **Normalização Estrita em `ofx_transactions`:** A coluna `type` na tabela `ofx_transactions` do PostgreSQL possui a restrição `CHECK (type IN ('in', 'out'))`. Qualquer payload deve normalizar entradas e saídas estritamente para `'in'` ou `'out'` e manter o valor `amount` sempre positivo (`Math.abs`).
2. **Jornada de Estados Reativos (Sem Stepper Linear):** A interface de importação deve reagir organicamente à seleção de arquivos (Dropzone -> Previews de Dados Brutos -> Logs de Auto-Match -> Edição de OSs Órfãs -> Trava de Inputs Manuais -> Inspetor JSON -> Gravação com Barra de Progresso).
3. **Carga de Marco Zero Integrada:** O parser de implantação (`parseMarcoZeroPlanilha` / `process_marco_zero_import`) deve coexistir na central de importação como modo selecionável, sem misturar saldos iniciais com o fechamento diário regular.

**Risco identificado:** Modalização forçada espreme dados de alta densidade em telas complexas.

**Não fazer:** Nunca esconder o payload JSON de conciliação nem comprimir tabelas financeiras de auditoria dentro de popups com rolagem dupla.

## [2026-08-15] — [Feature ID: 210 e 211]

**Contexto:** Sincronização do Dashboard macro com a Conciliação e liberação de categorização livre de transações bancárias órfãs.

**Regra aprendida:**
1. A comparação de faturamento diário com o dia anterior deve subtrair o odômetro do dia D pelo odômetro de D-1, e o odômetro de D-1 pelo de D-2, garantindo comparação maçã com maçã (faturamento do dia vs faturamento do dia).
2. Transações de maquininha na Aba 1 de cada loja devem ser confrontadas com os créditos de adquirente que entraram no OFX daquela filial (e não com a soma total do pátio).
3. O modal de justificativa de órfãos permite digitação livre de qualquer texto de categoria no banco.

**Risco identificado:** Comparar o faturamento diário (ex: R$ 75k) contra o acumulado do odômetro (R$ 369k) gerava uma falsa queda de -79.7%.

**Não fazer:** Nunca atrelar a totalidade das OSs em aberto de uma loja a uma única linha de extrato da adquirente.

## [2026-08-17] — [Feature IDs: 214, 215, 216 — Extrato Analítico por Loja e Marco Zero]

**Contexto:** Unificação do extrato por loja com cálculo de despesas por fornecedor e evolução em 3 linhas diárias.

**Regra aprendida:**
1. **Marco Zero como Limite Mínimo Universal:** O Marco Zero de 13/08/2026 define a data inicial oficial do sistema. Qualquer relatório, extrato ou filtro deve ter como limite mínimo `2026-08-13`.
2. **Saldo Real vs Movimentação Periódica:** O saldo em conta bancária (Saldo da Loja) representa o saldo da conta e é fixo no último OFX importado. As métricas de Entradas, Saídas e Resultado Líquido pertencem estritamente ao período filtrado.

## [2026-08-17] — [Feature ID: 217]

**Contexto:** Implementação de auditoria de taxas de maquininhas (MDR) multi-loja e cálculo de desvio contratual contra a adquirente (Rede).

**Regra aprendida:** 
- A taxa MDR efetiva real cobrada em cada transação deve ser calculada pela relação entre valor líquido e valor bruto atualizado:
  $$\text{MDR Efetiva (\%)} = (1 - (\text{valor\_liquido} / \text{valor\_venda\_atualizado})) \times 100$$
- A divergência contratual ocorre quando a taxa efetiva supera a taxa de referência do contrato (`pos_fee_contracts`) com tolerância de até 0.30\%. Cobranças com delta positivo configuram cobrança a maior (prejuízo recuperável).
- Em operações multi-loja (1:N), a adquirente emite extratos com número de estabelecimento (PV), CNPJ ou Razão Social que devem ser mapeados para o `store_id` unificado das 9 filiais.

**Risco identificado:** A adquirente pode aplicar antecipação automática ou descontos operacionais (aluguel de POS) que afetam o valor líquido da venda se não isolados linha a linha.

**Não fazer:** Nunca calcular o MDR pela média simples das vendas sem ponderar pelo valor bruto transacionado de cada bandeira/modalidade.

## [2026-08-19] - [Feature IDs: 237, 238, 239 - Redesign ResumoDiaPanel, RPC Limpeza Marco Zero, Modal Maquininhas Widescreen]

**Contexto:** Três specs lançadas no mesmo commit que evoluem o cockpit financeiro de fechamento diário e corrigem problemas críticos de RPC no Supabase.

**Regra aprendida:**

### Feature 237 - Redesign Visual e Descompressão do Painel de Resumo do Dia (ResumoDiaPanel.tsx)
1. **Grid dos 5 Pilares:** O layout correto é grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 com cards individuais estilo ounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-sm.
2. **Sub-linhas alinhadas nos cards:** Card 1 (Saldo Bancos) mostra sub-linhas OFX: R$ ... e + Maq: + R$ ... em layout horizontal (lex justify-between) com ont-mono text-[11px], separados por order-t border-zinc-800/80.
3. **Cockpit de Fechamento em 3 Colunas Balanceadas:** Área inferior reorganizada em 3 colunas harmoniosas - Dinâmica de Caixa | Operação & Disponível | Balanço do Fechamento & Diferença Final.
4. **Tipografia dos pilares:** Valores principais usam 	ext-xl sm:text-2xl font-bold font-mono tracking-tight. Labels usam 	ext-[11px] font-bold text-zinc-400 uppercase tracking-wider.
5. **Ícones dos pilares:** Cada card tem um icon badge w-7 h-7 rounded-lg bg-{cor}-500/10 text-{cor}-400 flex items-center justify-center shrink-0 com ícone de 14px.
6. **Cores dos pilares:** Card 1 (Saldo Bancos) = cyan, Card 2 (Dinheiro MP) = emerald, uniformizar com zinc-950 como bg-canvas.

### Feature 238 - RPC Limpeza Atômica e Correção do Marco Zero
1. **RPC clear_all_financial_data():** Função PL/pgSQL com SECURITY DEFINER que trunca com CASCADE as 20 tabelas transacionais: ofx_transactions, pos_transactions, patio_os, estoque_os_pendente, econciliations, econciliacoes_triplas, daily_snapshots, dashboard_daily_logs, conciliation_daily_logs, conciliation_matches, manual_transactions, eceivables, import_logs, import_batches, cash_registers, 	ransactions, oficina_contas, oficina_os_cache, udit_logs, lerts.
2. **Fix crítico da RPC process_marco_zero_import:** Erro operator does not exist: date = text é resolvido com _target_date date := p_target_date::date. Sempre fazer casting explícito de datas em RPCs PL/pgSQL.
3. **Saldo Inicial do Marco Zero (14/08/2026):** Saldo Bancário = R$ 170.244,95 | Dinheiro em Caixa = R$ 13.066,00 | A Receber = R$ 10.694,50 | Estoque/OS Pátio = R$ 107.229,76 | Patrimônio Inicial = R$ 289.386,12.
4. **marcoZeroParser.ts Atualizado:** Varredura multi-linha da aba SALDO - o nome da loja está em uma linha e o saldo bancário (Saldo Banco Itaú:) está na linha seguinte. currentStoreContext é mantido entre linhas para capturar corretamente o saldo de cada loja.
5. **Desbloqueio do seletor de datas:** Hook useAvailableConciliacaoDates indexa automaticamente datas de pos_transactions, patio_os, ofx_transactions, daily_snapshots e o dia atual, garantindo navegação fluida sem travamento.

### Feature 239 - Modal Maquininhas 2XL e Refinamento dos Cards de Lojas
1. **Modal.tsx com suporte a size="2xl":** Adicionado 2xl: "max-w-6xl" (1152px) ao mapa de tamanhos do componente central de modais. Usar size="2xl" para modais de alta densidade de dados.
2. **MaquininhasDetailModal.tsx:** 4 KPIs espaçosos com cards individuais e tipografia de alta fidelidade. Tabela de conciliação tripla expandida sem scroll horizontal, com badges ENTROU, PARCIAL, NÃO ENTROU.
3. **Cards das Filiais em conciliacao.index.tsx:** Layout 2-Tier: Nível 1 (identidade: indicador de conformidade, nome, chip st-XX, badge de maquininha, diferença apurada, botão Raio-X) + Nível 2 (grid das 6 métricas: SALDO BANCOS, MAQUININHA, PIX, NA LOJA OS, PREVISTO, DIFERENÇA).
4. **Resolução de conflitos PostgreSQL:** Sempre verificar sobrecargas (overloads) antes de criar RPCs com mesmo nome mas assinaturas diferentes. Fazer DROP FUNCTION das versões conflitantes antes de recriar.

**Risco identificado:** Conflito de sobrecarga de RPCs no PostgreSQL causa erro de ambiguidade (unction X is not unique) ao invocar via Supabase JS Client.

**Não fazer:** Nunca criar uma nova versão de RPC sem primeiro verificar e eliminar sobrecargas existentes com DROP FUNCTION public.nome_rpc(tipos_args).

### Feature 240 - Fix de Devoluções da Rede e Janela Temporal de OS no Pátio (2026-08-19)
1. **Devoluções da Rede (Conta a Pagar):** Transações de estorno/chargeback/devolução da maquininha Rede NÃO devem ser somadas no Pilar 1 (Cartões a Compensar / Saldo Bancos). Elas representam obrigações/saídas para a empresa e são obrigatoriamente somadas em `v_subtotal_contas` no Pilar 5 (Contas do Dia / Contas a Pagar).
2. **Classificação em `pos_transactions`:** Coluna `transaction_type text NOT NULL DEFAULT 'venda' CHECK (transaction_type IN ('venda', 'devolucao'))`. Devoluções detectadas por `net_amount < 0`, `gross_amount < 0` ou regex `/devolu|estorn|cancel|chargeback|reversal/`.
3. **Âncora Temporal em `patio_os` (`last_payment_date`):** Quando uma OS tem pagamentos parciais atualizados em data posterior à data consultada (`last_payment_date > p_date`), a RPC `get_daily_reconciliation_summary` desconsidera o pagamento futuro e mantém o saldo pendente íntegro na data histórica. OSs legadas sem `last_payment_date` (NULL) utilizam `paid_value` atual, mantendo zero regressão.
4. **Interface Visual:** Pilar 5 em `ResumoDiaPanel.tsx` exibe sub-linha `Devoluções REDE: - R$ X` (apenas quando `devolucoes_rede > 0`). `MaquininhasDetailModal.tsx` exibe 5º KPI Card `Devoluções / Estornos` com badge Pilar 5.

**Risco identificado:** A ausência de âncora temporal no `paid_value` de `patio_os` fazia com que pagamentos recebidos hoje alterassem retroativamente o "Na Loja OS" de dias anteriores. A segregação de devoluções sem coluna de tipo infle o saldo do Pilar 1.

**Não fazer:** Nunca misturar estornos/devoluções de POS no somatório de vendas líquidas a compensar. Devolução de POS é passivo/saída de caixa.

### Feature 241 - Restauração do Design Original dos Cards de Lojas e Painel de Resumo do Dia (2026-08-19)
1. **Design System & Tokens Consistentes:** O padrão visual do projeto utiliza estritamente as variáveis CSS do tema (`var(--bg-surface)`, `var(--bg-surface-elevated)`, `var(--border-subtle)`, `var(--text-primary)`, `var(--color-primary)`, `var(--color-accent-teal)`, etc.) e gradientes suaves de cabeçalho (`from-[var(--bg-surface)] to-[var(--bg-surface-elevated)]`). Não substituir por classes brutas `zinc-900`/`zinc-950` que quebram a consistência estética do produto.
2. **Layout dos Cards de Lojas (`conciliacao.index.tsx`):** Layout horizontal contínuo clássico em nível único (`flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6`):
   - Esquerda: Barra lateral de conformidade (`w-2 h-14 rounded-full`), Nome da Loja, Badges `ENTROU` / `NÃO ENTROU (+ R$ ...)`, ID.
   - Direita: Envelope escuro contínuo (`bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5`) com 6 colunas proporcionais (`Saldo Bancos + Cartões`, `Maquininha`, `PIX`, `Na Loja OS`, `Previsto`, `Diferença`).
   - Botão flutuante "Raio-X" no canto superior direito visível no hover.
3. **Painel de Resumo do Dia (`ResumoDiaPanel.tsx`):**
   - 5 Pilares no grid clássico `grid-cols-2 md:grid-cols-5 gap-4` com cores e whisper dots.
   - Cockpit inferior de 2 colunas: Esquerda (2/3) Consolidação do Dia + Direita (1/3) Diferença Final com badge de tolerância (± R$ 50).
   - Preservadas as devoluções da Rede no Pilar 5 e no subtotal de contas da Spec 240.

**Risco identificado:** Tentar "modernizar" o layout alterando containers de 1 nível para 2 tiers ou substituindo o design system gera poluição visual e rejeição imediata do usuário.

**Não fazer:** Nunca quebrar a harmonia horizontal dos cards de filiais nem abandonar as variáveis de design system do projeto.

## [2026-08-21] — [Feature ID: 258-motor-conciliacao-autonoma-zero-touch-com-auto-healing]

**Contexto:** O fechamento de conciliação diária podia apresentar divergências contábeis (ex: dinheiro no cofre em data divergente, aportes intercompany de sócios no extrato OFX sem contrapartida de faturamento, ou efeito cascata de snapshots retroativos). O usuário não queria intervir manualmente nem abrir chat de IA; exigiu que o próprio motor de importação investigasse de forma 100% autônoma e aplicasse as regras contábeis periciais até zerar o fechamento.

**Regra aprendida:**
1. **Regra de Auto-Healing em Loop:** A RPC `run_autonomous_reconciliation_loop(p_date)` executa até 3 ciclos de auto-cura pericial determinística:
   - *Assinatura Numérica de Cofre:* Se o delta bater com um item de `store_cash_vault` com `entry_date < target_date`, reancora a entrada para a data alvo.
   - *Aportes Intercompany de Sócios:* Identifica créditos de PIX de sócios (`DANIEL`, `ROGERIO`, `RAPHAEL`, etc.) nos OFX e auto-cadastra em `daily_revenue_adjustments` (`type = 'aporte'`).
   - *Partidas Dobradas:* Se houver aporte no faturamento sem despesa correspondente no ERP, regulariza a contrapartida de despesa em `daily_manual_bills`.
   - *Integridade de Caixa Anterior:* Garante que o Caixa Anterior seja estritamente o Caixa Atual consolidado do dia útil anterior.
2. **Zero Alucinação (Constitution Guardrail):** A IA é expressamente proibida de criar transações com valores fictícios; todo ajuste deve ter como base um `fitid` de OFX real, um registro de cofre real ou um item do contas a pagar.

**Risco identificado:** Executar mutações de auto-cura sem persistência de log pericial. Mitigado gravando a tabela `reconciliation_audit_logs` com o histórico completo de deltas (inicial e final) e passos executados.

**Não fazer:** Nunca exigir que o usuário abra ferramentas manuais para regularizar assimetrias evidentes de extrato ou datas de cofre que a inteligência pericial consegue deduzir e corrigir deterministicamente.

## [2026-08-21] — [Feature ID: 256-importacao-contas-a-pagar-e-conciliacao-aportes-intercompany]

**Contexto:** O valor de Contas a Pagar era inserido de forma manual ou global. Foi implementado o parser analítico do arquivo `BuscaContasAPagar.xls` (Oficina Inteligente / ERP), mapeamento das 10 filiais pela coluna `Emp`, categorização inteligente de despesas (Sócios, Cartão/Tech, Peças, Despesas Bancárias, Uber OS) e motor de cruzamento triangular de aportes/transferências entre lojas e sócios.

**Regra aprendida:**
1. **Estrutura do BuscaContasAPagar.xls:**
   - O arquivo possui linha de cabeçalho variável e linha final de totalizador geral que deve ser ignorada para evitar duplicação do valor total (`195.066,04`).
   - Mapeamento de lojas pela coluna `Emp` normalizada (`MPJorgeBeretta` -> `st-03`, `ReiDoModulo` -> `st-09`, `MPpiraporinha` -> `st-05`, etc.).
   - Extração de OS em Uber: Recibos com padrão `UBER OS[0-9]+` têm o número da OS extraído automaticamente para vinculação de custo logístico ao pátio.
2. **Cruzamento Triangular Intercompany:**
   - Quando um sócio retira de uma loja (despesa do ERP) e aporta em outra loja (crédito no OFX):
     - Registra o Aporte no Faturamento (`daily_revenue_adjustments`).
     - Vincula a retirada do ERP da loja de origem (`daily_manual_bills`).
     - Lança o delta residual não faturado como despesa manual (`daily_manual_bills` com tag *"Aporte Intercompany Residual"*).
     - Isso zera o fechamento pericial com partidas dobradas transparentes.

**Risco identificado:** Tratar PIX de cliente como aporte de sócio. Mitigado com cadastro formal e chaves PIX em `intercompany_entities`.

**Não fazer:** Nunca descartar despesas com nomes novos; sempre aplicar fallback para `outros` e permitir reclassificação em 1 clique no modal.

## [2026-08-21] — [Feature ID: 259-exclusao-cirurgica-por-data-e-correcao-exclusao-imports]

**Contexto:** O botão de exclusão de lote no histórico de importações disparava pop-ups de `alert()` nativos bloqueantes e não existia mecanismo para resetar apenas os dados de um dia específico (como o dia 21) para reprocessamento limpo sem perder o Marco Zero ou o histórico de outros dias.

**Regra aprendida:**
1. **Exclusão Cirúrgica por Data (`purge_daily_financial_data`):**
   - Deve apagar de forma transacional apenas os registros correspondentes ao `p_date` selecionado (snapshots, reconciliações, conciliation_matches, extratos OFX, maquininhas, despesas manuais, logs de auditoria e contas a pagar).
   - Não toca em lojas, Marco Zero, regras contábeis nem em outros dias do calendário.
2. **Eliminação de `alert()`:** Todas as ações de mutação e exclusão devem sempre usar `toast.success` ou `toast.error` (Sonner) para evitar travar a thread da UI.
3. **Ponto de Retorno (Checkpoint):** Em operações periciais de conciliação, sempre fornecer backup estruturado em JSON com script de restore em 1 comando (`node scratch/restore_checkpoint_day_21.cjs`).

**Risco identificado:** Apagar dados globais por engano se a data for nula. Mitigado com verificação estrita `IF p_date IS NULL THEN RAISE EXCEPTION` na RPC Postgres.

**Não fazer:** Nunca usar `clear_all_financial_data` para refazer apenas um dia; sempre usar a exclusão cirúrgica por data.

## [2026-08-21] — [Feature ID: 260-atualizacao-os-pendentes-e-conciliacao-orfas]

**Contexto:** OSs em aberto no pátio não eram baixadas automaticamente quando o cliente realizava o pagamento via PIX (extrato OFX) ou cartão (Rede) em dias posteriores, deixando as transações bancárias como órfãs e a OS como pendente. Além disso, o valor analítico de Contas a Pagar não auto-preenchia o campo de entrada do fechamento.

**Regra aprendida:**
1. **Pareamento Inteligente por Saldo Pendente (`auto_match_transactions`):**
   - O motor busca OSs com `status IN ('em_aberto', 'pago_parcial')` da filial correspondente.
   - Prioriza correspondência com o **Saldo Pendente** (`total_value - paid_value`), depois PIX e depois Valor Total.
   - Atualiza a OS: incrementa `paid_value`, define `status = 'finalizado'`, preenche `closed_at = p_date`, vincula `matched_ofx_id` e gera o registro em `conciliation_matches`.
2. **Auto-Preenchimento de Contas a Pagar:** Quando um lote analítico de contas a pagar é importado (`results.contasPagarResults`), o formulário de valores manuais é auto-preenchido e sinalizado para evitar digitação manual redundante.
3. **Visibilidade de Estoque em Pátio:** No Card de OS do preview, exibir sempre os pagamentos do dia e o total ativo de veículos/serviços em pátio.

**Risco identificado:** Parear uma OS de outra filial ou com valor aproximado incorreto. Mitigado com correspondência estrita por `store_id` e tolerância de 0.05 centavos.

**Não fazer:** Nunca exigir `closed_at >= D-3` para OSs em aberto, pois OSs podem ter sido abertas há mais tempo no pátio e quitadas hoje.

## [2026-08-21] — [Feature ID: 261-saldo-total-ofx-e-tabela-edicao-os-preview]

**Contexto:** O extrato bancário (OFX) importado contém o saldo acumulado dos extratos das filiais. O operador precisa conferir o valor consolidado do extrato sob o título "Saldo Total Bancário (OFX)" e poder auditar/editar o Valor Total da OS e o Total Pago diretamente no Step 3 de conferência da importação.

**Regra aprendida:**
1. **Nomenclatura do Card Bancário:** O Card 3 da Central de Importação exibe "Saldo Total Bancário (OFX)", refletindo com transparência o montante consolidado dos extratos bancários importados e o número total de lançamentos.
2. **Edição Livre de OSs no Preview:** Na etapa 3 do Wizard, disponibilizar tabela pesquisável e paginada de todas as OSs importadas com inputs editáveis para `total_value`, `paid_value` e seletor de `status`.
3. **Persistência Reativa dos Valores Editados:** Toda alteração feita pelo usuário recalcula os cards do topo em tempo real e é gravada diretamente nas tabelas `patio_os`, `reconciliations` e `daily_snapshots` ao confirmar o fechamento.

**Risco identificado:** Tentar restringir o extrato bancário por data quando o operador precisa da conferência global do saldo em conta.

**Não fazer:** Nunca ocultar ou bloquear a edição de valores de OSs quando o operador detecta que uma ordem de serviço veio com valor divergente da planilha original.
