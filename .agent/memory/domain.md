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
