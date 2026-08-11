## [2026-08-07] â€” [Feature ID: 141-fix-conciliacao-valor-contas-fluxo]

**Contexto:** O painel global de ConciliaÃ§Ã£o DiÃ¡ria estava com a matemÃ¡tica quebrada, ignorando contas originÃ¡rias de OFX e nÃ£o calculando o Fluxo de Caixa histÃ³rico. A RPC do Supabase (`get_dashboard_metrics`) desviava das fÃ³rmulas aplicadas no React.

**Regra aprendida:** The Single Source of Truth matemÃ¡tica. Para a conciliaÃ§Ã£o:
1. "Valor Contas" DEVE abrigar as saÃ­das (type=out) do banco de dados onde `source = 'ofx'`, pois representam despesas nÃ£o mapeadas pelo sistema interno.
2. "Fluxo de Caixa" DEVE ser obrigatoriamente a diferenÃ§a entre `Caixa Atual (hoje)` e `Caixa Atual (ontem / snapshot fechado anterior)`. O cÃ¡lculo nunca deve ser `Faturamento LÃ­quido - Contas`, pois a variaÃ§Ã£o patrimonial Ã© a Ãºnica mÃ©trica que importa para o usuÃ¡rio.

**Risco identificado:** MatemÃ¡tica em duplicidade. O frontend e o backend devem sempre utilizar a mesma fÃ³rmula para compor fluxos, caso contrÃ¡rio o cliente vÃª um valor na tela principal e outro no breakdown detalhado.

**NÃ£o fazer:** Nunca preencher propriedades matemÃ¡ticas reativas com variÃ¡veis hardcoded (ex: `totalOfxOut={0}`) em componentes vitais como o dashboard, ocultando bugs do backend no layout.

## [2026-08-07] â€” [Feature ID: 145-fix-fluxo-and-autosave]

**Contexto:** CorreÃ§Ã£o avanÃ§ada na matemÃ¡tica do fluxo de caixa e automaÃ§Ã£o do autosave no `CentralImportWizard.tsx`.

**Regra aprendida:** 
1. "Valor DisponÃ­vel" DEVE ser calculado como `Faturamento - Fluxo de Caixa`, nunca somado.
2. "DiferenÃ§a" DEVE ser `(Faturamento - Fluxo de Caixa) - Valor Contas`, fechando o saldo zero exato.
3. Snapshots DiÃ¡rios (`daily_snapshots`) devem ser auto-salvos assim que uma importaÃ§Ã£o de lote Ã© confirmada via RPC `get_dashboard_metrics` para garantir que o "Caixa Anterior" (o lastro do fluxo de caixa) sempre exista para o prÃ³ximo dia.

**Risco identificado:** Ficar dependendo de interaÃ§Ã£o humana (clique manual de "Salvar Fechamento DiÃ¡rio") impede que conciliaÃ§Ãµes de dias passados fechem a matemÃ¡tica do fluxo de caixa porque o "Caixa Anterior" se perde no banco.

**NÃ£o fazer:** Nunca calcular Fluxo de Caixa sem ter um snapshot gravado do Ãºltimo estado, pois o lastro financeiro se torna inexistente.

## [2026-08-10] â€” [Feature ID: match-audit-and-fix]

**Contexto:** CorreÃ§Ã£o da engine de Auto-Match (RPC `auto_match_transactions`) para respeitar regras de escopo global vs local (loja) durante o pareamento de OFX, Maquininha e OS.

**Regra aprendida:** O OFX bancÃ¡rio Ã© global (`store_id` Ã© nulo). Maquininhas (POS) e Ordens de ServiÃ§o (OS) sÃ£o locais (`store_id` definido). O pareamento exige 3 pipelines distintos: 1) PIX (OFX Global vs OS Local - busca transversal); 2) Maquininha LÃ­quida vs OFX Rede (Soma de POS local vs entrada OFX global); 3) Maquininha Bruta vs OS CartÃ£o (POS local vs OS local no cartÃ£o).

**Risco identificado:** Tentar fazer `WHERE store_id = ofx.store_id` quebra silenciosamente qualquer match porque `NULL = DP` avalia como falso. AlÃ©m disso, esquecer do LIMIT 1 nas associaÃ§Ãµes pode causar N matches para a mesma OS caso hajam valores repetidos no mesmo dia.

**NÃ£o fazer:** Nunca assuma que transaÃ§Ãµes bancÃ¡rias (OFX) terÃ£o `store_id` populado, e nunca ignore o valor bruto da maquininha no pareamento direto com a OS (pÃ¡tio).

## [2026-08-10] â€” [Feature ID: 148-fix-conciliation-diff]

**Contexto:** CorreÃ§Ã£o do apagÃ£o do histÃ³rico de 'Na Loja OS' e da diferenÃ§a astronÃ´mica (ex: -120k) causados por falha ao reimportar histÃ³ricos e pela premissa errada de que OFX nÃ£o tinha loja.

**Regra aprendida:** O cliente **SOBE UM OFX PARA CADA LOJA**, logo as transaÃ§Ãµes do ItaÃº possuem sim `store_id` mapeado no momento da importaÃ§Ã£o! A RPC `auto_match_transactions` DEVE filtrar o OFX por `store_id` para nÃ£o misturar dinheiros de filiais diferentes. AlÃ©m disso, o motor `calculate_daily_conciliation` precisa ler `reconciliations.na_loja_os` como snapshot histÃ³rico para dias fechados (pois a OS atual jÃ¡ consta como paga e seu saldo 'restante' real Ã© 0).

**Risco identificado:** Mudar a estrutura de tabelas antigas (como adicionar `dedup_hash`) e permitir que registros histÃ³ricos fiquem com `NULL`. Quando o usuÃ¡rio re-importa o passado, o `NULL` permite duplicaÃ§Ã£o, inflando absurdamente totais como o de Maquininha.

**NÃ£o fazer:** Nunca assumir que um arquivo OFX Ã© 'global' apenas por ser extrato bancÃ¡rio sem antes verificar a rotina de importaÃ§Ã£o. Nunca recalcular 'saldo devedor/restante' de dias passados lendo o status da OS hoje.

## [2026-08-10] â€” [Feature ID: 152-manual-expenses]

**Contexto:** Desacoplamento da matemÃ¡tica de "Contas a Pagar" da importaÃ§Ã£o bruta do OFX_out. O arquivo importado trazia despesas de dias correntes que quebravam a matemÃ¡tica da conciliaÃ§Ã£o do dia anterior.

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
