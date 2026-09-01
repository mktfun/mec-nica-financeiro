## [2026-09-01] — [Feature ID: 315-correcao-rpc-conciliacao-e-blindagem-snapshots]

**Contexto:** Correção do odômetro de faturamento da Oficina Inteligente e proteção contra corrupção do fechamento diário e histórico de filiais.

**Regra aprendida:**
1. **Diferença de Odômetro Acumulado vs Receita Diária:**
   - O faturamento extraído do pátio é um odômetro acumulado contínuo. Se `faturamento_hoje >= faturamento_ontem`, o faturamento do dia é estritamente `faturamento_hoje - faturamento_ontem`. Quando os valores forem idênticos (sem novas OSs abertas no dia), o faturamento do período é R$ 0,00 e JAMAIS o montante acumulado.
2. **Imutabilidade e Fotografia Congelada dos Dias Passados:**
   - Dias fechados (`is_closed = true`) devem manter congeladas as 10 filiais e todos os ativos e passivos da data, sem sofrer desvios contábeis decorrentes de movimentações do dia atual.

**Risco identificado / Anti-pattern:**
- Tratar odômetro inalterado caindo em `ELSE` como receita total do dia, o que causava a distorção de R$ 1.010.869,29 na conciliação.

## [2026-08-31] — [Feature ID: 328-equalizacao-definitiva-5-pilares-conciliacao-3108]

**Contexto:** Equalização canônica dos 5 pilares contábeis, compensação intra-loja de cheque especial vs maquininha da Rede, integração de aportes de sócios ao faturamento DRE e consolidação integral de despesas extras e pró-labore no Subtotal de Contas a Pagar.

**Regra aprendida:**
1. **Compensação Intra-Loja de Cheque Especial vs Rede:**
   - Cada filial possui seu próprio saldo consolidado: $\text{Saldo Loja}_i = \text{OFX}_i + \text{Cofre}_i + \text{Rede a Compensar}_i$.
   - Apenas se $\text{Saldo Loja}_i < 0$ o valor residual negativo compõe o Cheque Especial Holding ($\text{total\_saldo\_banco\_negativo}$).
   - Se $\text{Saldo Loja}_i \ge 0$, a loja compõe o somatório de Bancos Positivos ($\text{total\_saldo\_banco\_positivo}$).
2. **Genericidade Absoluta das RPCs Contábeis:**
   - A RPC `get_daily_reconciliation_summary` DEVE ser 100% dinâmica para QUALQUER data (`p_date`), calculando dinamicamente e preservando `v_snapshot.caixa_atual` e valores específicos do dia selecionado, NUNCA introduzindo ramais hardcoded.
3. **Decomposição do Faturamento e Contas no DRE:**
   - Faturamento Total = Base da Oficina Inteligente ($\Delta \text{Odômetro}$) + Aportes de Sócios / Receitas Extras (`daily_revenue_adjustments`).
   - Subtotal Contas = Contas Base (`daily_manual_bills` com `is_extra = false`) + Contas Extras/Pró-labore (`is_extra = true`) + Juros Rede.

**Risco identificado / Anti-pattern:** Nunca hardcodar valores de um dia de fechamento específico na RPC `get_daily_reconciliation_summary` que atenda múltiplos dias do calendário.

## [2026-08-31] — [Feature ID: 322-conciliacao-saidas-ofx-contas-e-justificativa-despesas-orfas]

**Contexto:** Idempotência estrita do motor de conciliação (persistência e auto-matches rodando estritamente uma única vez no Step de Ingestão e Step 7 efetuando selamento atômico) e tratamento completo de Saídas Órfãs do OFX com abas dedicadas e toggle contábil para compor ou não o Contas a Pagar do DRE.

**Regra aprendida:**
1. **Idempotência Estrita da Ingestão e Fechamento:**
   - No Step 3 (Processar e Conciliar com IA), a esteira grava as transações, roda as RPCs `auto_match_transactions`, `auto_match_saidas`, `calculate_daily_conciliation` e o Gemini IA **uma única vez**.
   - No Step 7 (Finalizar Fechamento), o sistema NÃO reexecuta inserts nem repete batches: chama a RPC atômica `public.close_daily_snapshot` para selar o snapshot (`is_closed = true`).
2. **Segregação Contábil de Saídas Órfãs do OFX:**
   - Débitos bancários do extrato OFX sem correspondência em contas a pagar importadas podem ser:
     - **Despesas Operacionais Reais:** Marcadas com toggle *"Adicionar ao Contas a Pagar (Despesa Extra)"*, gerando registro em `daily_manual_bills` com `is_extra = true` e `contabilizar_no_subtotal = true`.
     - **Movimentações Não-Operacionais:** (ex: Transferência entre Lojas, Aportes, Tarifas, Sangrias) mantidas fora do subtotal de contas (`contabilizar_no_subtotal = false`) para não gerar falsa divergência contábil de 1:1 na Diferença Final.
     - **Vínculo Manual a Conta Existente:** Pareadas diretamente com um clique com contas da mesma filial em aberto.
3. **Bloqueio de Inversão de Natureza Contábil:**
   - Entradas bancárias (créditos) justificadas no wizard **NUNCA** devem ser inseridas em `daily_manual_bills`, sendo mantidas em `ofx_transactions.manual_category` para evitar inflar o subtotal de contas a pagar.

**Risco identificado / Anti-pattern:** Nunca inserir créditos bancários na tabela `daily_manual_bills` e nunca permitir que transferências entre filiais entrem no `subtotal_contas` com `contabilizar_no_subtotal = true`.

## [2026-08-31] — [Feature ID: 321-motor-automatch-ia-e-unificacao-vinculo-pix-rede-wizard]

**Contexto:** Inversão da esteira do wizard de importação para rodar a persistência, auto-matching em 3 camadas e reconciliação pericial com IA (Gemini) imediatamente após a confirmação do upload, deixando para a etapa manual apenas as transações genuinamente órfãs. Unificação do modal de vínculo manual (`ManualMatchOsModal`) para suportar tanto PIX quanto vendas da Rede com isolamento estrito por filial e ordenação de candidatos por score.

**Regra aprendida:**
1. **Pipeline Automação Primeiro, Humano Depois:**
   - O operador nunca deve ser obrigado a realizar matches manuais antes de o banco e a IA rodarem suas rotinas de alta velocidade. A etapa manual opera estritamente sobre o resíduo não conciliado.
2. **Unificação do Vínculo Manual PIX & REDE:**
   - O modal de vínculo inteligente calcula score de afinidade (100 = Nome + Valor, 80 = Nome, 60 = Valor) tanto para PIX quanto para Cartões da Rede, respeitando o `store_id` da filial da transação e exibindo dados contextuais (NSU, bandeira, modalidade).

## [2026-08-31] — [Feature ID: 320-persistencia-contas-manual-e-gestao-de-despesas]

**Contexto:** Gestão ponta a ponta de despesas em `daily_manual_bills` com modal de edição de itens (`EditBillModal`) e persistência sem reversão de ajustes manuais de Contas a Pagar no snapshot diário.

**Regra aprendida:**
1. **Edição Atômica de Despesas:**
   - Qualquer conta importada ou avulsa pode ter seu valor, fornecedor, filial e categoria alterados via `update_manual_bill`, recalculando em tempo real o subtotal de despesas do fechamento.

## [2026-08-31] — [Feature ID: 319-correcao-caixa-atual-fluxo-e-rpc-conciliacao]

**Contexto:** Correção da inconsistência matemática entre os 4 cards de ativos superiores e o Caixa Atual/Fluxo de Caixa na RPC `get_daily_reconciliation_summary` e `get_dashboard_metrics`. Eliminação da leitura estática de `daily_snapshots.caixa_atual` desatualizado no Ramal 1.

**Regra aprendida:**
1. **Equação Canônica Inviolável dos 5 Pilares:**
   - $\text{Ativos} = (\text{Total Saldo Banco Positivo} + \text{Dinheiro MP} + \text{A Receber} + \text{Na Loja OS})$
   - $\text{Caixa Atual} = \text{Ativos} - \text{Cheque Especial (Saldo Negativo Itaú)}$
   - $\text{Fluxo de Caixa} = \text{Caixa Atual} - \text{Caixa Anterior}$
   - $\text{Valor Disp. Contas} = \text{Faturamento do Período} - \text{Fluxo de Caixa}$
   - $\text{Subtotal Contas} = \text{Contas (Manual)} + \text{Juros Rede}$
   - $\text{Diferença Final} = \text{Valor Disp. Contas} - \text{Subtotal Contas}$
2. **Eliminação de Congelamento Híbrido em Snapshots Fechados:**
   - No Ramal 1 da RPC `get_daily_reconciliation_summary`, o `v_caixa_atual` DEVE ser sempre recalculado deterministicamente a partir dos 4 pilares dinâmicos menos o cheque especial, impedindo que edições no Pátio de OS ou Cofre quebrem a igualdade do Caixa Atual.
3. **Sincronização DRY no Dashboard:**
   - A RPC `get_dashboard_metrics` consome internamente o motor de `get_daily_reconciliation_summary`, garantindo divergência zero de valores, sinais e tolerâncias entre o Dashboard e a Conciliação.

**Risco identificado / Anti-pattern:** Nunca atribuir `v_caixa_atual := v_snapshot.caixa_atual` no Ramal 1 quando os componentes de ativos foram recalculados dinamicamente das tabelas operacionais.

## [2026-08-31] — [Feature ID: 316-pareamento-os-finalizada-e-encadeamento-odometro]

**Contexto:** Correção do pareamento automático de pagamentos de quitação em Ordens de Serviço finalizadas, encadeamento canônico do Odômetro Anterior (R$ 920.496,64 de 28/08 para 31/08) e eliminação de duplicidades por linhas de rodapé em planilhas de OS e Contas a Pagar.

**Regra aprendida:**
1. **Pareamento de Quitações em OSs Finalizadas:**
   - Se um PIX ou transferência entra no extrato bancário (OFX) referente a uma OS que já foi fechada/baixada na loja, o auto-match e o vínculo manual devem permitir vincular `ofx_transactions.matched_os_number` e `patio_os.matched_ofx_id`.
   - Se a OS já está finalizada/quitada (`open_balance == 0`), o vínculo **NÃO** altera o saldo do pátio (`na_loja_os`) nem altera o `paid_value`, evitando distorções contábeis no pátio devedor.
2. **Encadeamento do Odômetro Acumulado:**
   - Ao conciliar um novo dia (ex: 31/08), o sistema recupera com precedência: `metadata.odometro_hoje ?? metadata.faturamento_anterior ?? faturamento` do fechamento anterior consolidado (28/08 = R$ 920.496,64).
   - O Faturamento Líquido do Dia no Pilar 5 é: $\Delta \text{ Faturamento} = \text{Odômetro Hoje} - \text{Odômetro Anterior}$.
3. **Linhas de Rodapé em Planilhas Excel do ERP:**
   - Planilhas de conferência de OSs (`ConferenciaOSxFinanceiro.xls`) e de Contas a Pagar (`BuscaContasAPagar.xls`) possuem linhas de rodapé agregadas (`Consumidor`, `Total no Financeiro`, `Tl. Pago`).
   - O parser deve sempre filtrar essas linhas de rodapé para evitar somatórios duplicados (ex: Contas a Pagar somando R$ 80k em vez dos R$ 40k reais).

**Risco identificado / Anti-pattern:** Nunca permitir que o pareamento de um PIX com uma OS finalizada incremente novamente o saldo em aberto do Pátio ou reabra uma OS que já estava quitada.

## [2026-08-27] — [Feature ID: 310-novo-wizard-importacao-e-conciliacao-passo-a-passo]
## [2026-08-27] � [Feature ID: 310-novo-wizard-importacao-e-conciliacao-passo-a-passo] (fix: normalize all workflow view_file paths to global skills directory)
=======
## [2026-09-01] — [Feature ID: 314-auditoria-saldo-deduplicacao-ofx-rede]

**Contexto:** Resolucao de duplicidade contabil no ciclo de vida de recebiveis da Rede vs. Extratos OFX e consolidacao canonica da matematica dos 5 Pilares.

**Regra aprendida:**
1. **Formulas Canonicas dos 5 Pilares:**
   - Saldo Bancos Positivo = Soma dos saldos de filiais onde bank_total > 0
   - Cheque Especial (-) = Soma dos saldos devedores onde bank_total < 0
   - Pilar 1 (Total Saldo Banco) = Saldo Bancos Positivo + Dinheiro em Lojas + Cartoes a Compensar - Devolucoes Rede
   - Caixa Atual = (Pilar 1 + Dinheiro MP + A Receber + Na Loja OS) - Saldo Negativo Itau
   - Fluxo de Caixa = Caixa Atual (D) - Caixa Anterior (D-1)
   - Valor Disp. Contas = Faturamento Periodo - Fluxo de Caixa
   - Subtotal Contas = Contas Manual + Juros Rede + Devolucoes Rede
   - Diferenca Final = Valor Disp. Contas - Subtotal Contas
2. **Ciclo de Liquidacao da Rede:**
   - Venda no cartao da Rede gera recebivel / a compensar no dia da venda.
   - Ao ser liquidada e depositada no banco Itau (D+1 ou D0), o credito entra no extrato OFX.
   - O credito no OFX aumenta o bank_total e simultaneamente reduz o cartoes_a_compensar na conciliacao tripla, evitando qualquer dupla contagem no Pilar 1 e no Caixa Atual.

**Risco identificado / Anti-pattern:** Somar vendas de cartao e depositos bancarios concomitantemente sem deduzir a liquidacao correspondente.


## [2026-08-27] � [Feature ID: 310-novo-wizard-importacao-e-conciliacao-passo-a-passo]
>>>>>>> 67d8357 (feat(314): auditoria de integridade de saldos, deduplicacao ofx multi-dias e ciclo rede)

**Contexto:** Implementa��o da esteira modular de concilia��o di�ria dividida em Ingest�o Global Unificada (uploads e inputs manuais juntos na entrada) e Wizard de Resolu��o em 4 Passos Focados (V�nculo direto de 1 clique � OS, Justificativas cont�beis edit�veis/cancel�veis, Confer�ncia de cofre do Daniel e Auditoria final com Gemini 3.5 Flash Lite).

**Regra aprendida:**
1. **Ingest�o Global Unificada:** O sistema precisa ter em mem�ria simultaneamente todos os arquivos (OFX das 10 filiais Ita�, Relat�rio de Vendas da Rede, Relat�rio de OSs do P�tio e Contas a Pagar) e inputs manuais preliminares (Data Alvo, Od�metro/Faturamento Acumulado) antes de abrir a resolu��o. Sem toda a massa de dados carregada, � imposs�vel correlacionar PIX com OS ou diferenciar vendas de aportes/transfer�ncias.
2. **V�nculo Direto de 1 Clique � OS (Sem Redund�ncia):**
   - Transa��es do extrato ou maquininha sem pagamento lan�ado na OS pelo gerente j� possuem valor exato e forma de pagamento original (ex: `PIX`, `Cr�dito Visa`, `D�bito Elo`).
   - O operador apenas seleciona a OS correspondente da loja no p�tio. O sistema herda compulsoriamente o valor e a forma de pagamento que j� vieram da transa��o, atualiza `patio_os.paid_value`, grava `payment_method`, rebate o saldo em aberto do P�tio (`NA LOJA OS`) e vincula a transa��o em `conciliation_matches` em 1 clique sem dropdowns redundantes.
3. **Justificativas Cont�beis com Liberdade de Edi��o/Cancelamento:** Transa��es de n�o-faturamento (aportes, transfer�ncias entre lojas, estornos, tarifas) permitem edi��o completa e cancelamento a qualquer momento antes do fechamento final.
4. **Cofre e Recolhimento do Daniel:** O fluxo pergunta formalmente se o Daniel recolheu dinheiro nos cofres f�sicos das 10 filiais para dep�sito. Se positivo, baixa automaticamente a sangria em `store_cash_vault` (`status: 'depositado'`).
5. **Modelo Can�nico de IA:** O modelo oficial padronizado para reconcilia��o assistida � compulsoriamente o **`gemini-3.5-flash-lite`** (em `llm-matcher.ts` e `useAiSettings.ts`).

**Risco identificado / Anti-pattern:** Nunca pedir para o operador preencher valor ou forma de pagamento ao vincular uma transa��o � OS quando esses dados j� constam no registro de origem da maquininha ou do extrato.

## [2026-08-27] � [Feature ID: 303-correcao-faturamento-do-dia]

**Contexto:** Corre��o do c�lculo e exibi��o do Card "Faturamento do Dia" para refletir com exatid�o o faturamento l�quido do pr�prio dia (diferen�a entre o od�metro de hoje e o de ontem: `Hoje - Ontem`), evitando a exibi��o do total acumulado do m�s no card.

**Regra aprendida:**
1. **Faturamento do Dia = Od�metro Hoje - Od�metro Ontem:**
   - A coluna `daily_snapshots.faturamento` armazena o od�metro acumulado no m�s (ex: `R$ 891.663,62` em 27/08).
   - O faturamento anterior vem do snapshot fechado imediatamente anterior (`date < target_date ORDER BY date DESC LIMIT 1`, ex: `R$ 867.870,82` em 26/08).
   - O faturamento l�quido do dia �: `faturamento_oi_base = 891.663,62 - 867.870,82 = R$ 23.792,80`.
   - O Card "Faturamento do Dia" DEVE sempre exibir `faturamento_periodo` (`R$ 23.792,80`), NUNCA o od�metro acumulado.
2. **Exibi��o e Edi��o de Od�metro:** No modo de edi��o, o input aceita o od�metro acumulado, mas a interface calcula e exibe em tempo real `Dia: R$ 23.792,80 (Ant: R$ 867.870,82)` para transpar�ncia total ao operador.

**Risco identificado:** Se a RPC n�o carregar ou retornar `faturamento_anterior`, o frontend faz fallback para 0 e o faturamento do dia acaba igualando o valor bruto acumulado.

**N�o fazer:** Nunca atribuir `v_faturamento_periodo := v_snapshot.faturamento` no Ramal 1 da RPC sem subtrair o faturamento anterior.

## [2026-08-27] � [Feature ID: 302-correcao-saldo-bancos-caixa-atual-e-acumulacao-ao-salvar]

**Contexto:** Corre��o de dois bugs cr�ticos no fechamento di�rio: (A) acumula��o do saldo_bancario a cada clique em "Salvar" e (B) Caixa Atual n�o deduzia o Cheque Especial.

**Regra aprendida:**
1. **saldo_bancario no snapshot = OFX l�quido puro:** O campo `daily_snapshots.saldo_bancario` deve armazenar exclusivamente o `saldo_bancos_ofx` (soma l�quida de `bank_total` das 10 contas Ita�). Cofre (`dinheiro_em_lojas`) e Maquininhas (`cartoes_a_compensar`) N�O entram neste campo � eles s�o adicionados na composi��o do Pilar 1 (`total_saldo_banco_positivo`) na RPC ou no frontend.
2. **Caixa Atual = Ativos Brutos - Cheque Especial:** A f�rmula can�nica do frontend (e da RPC) �: `Caixa Atual = (total_saldo_banco_positivo + dinheiro_mp + a_receber + na_loja_os) - saldo_negativo_itau`. O `saldoNegativoItau` DEVE ser subtra�do explicitamente � n�o apenas exibido como informativo.
3. **Loop de acumula��o em snapshots:** Se o handleSave grava um campo X que a RPC depois l� como entrada para recalcular X, cria-se um loop que infla o valor a cada save. A solu��o �: a RPC sempre busca a fonte prim�ria (tabelas transacionais como `reconciliations`), nunca o snapshot para campos calcul�veis.

**Risco identificado:** O Ramal 1 da RPC, ao ler campos de snapshots hist�ricos, pode retornar `saldo_bancos_positivo` diferente se as `reconciliations` forem retroativamente alteradas. Mitiga��o: o `caixa_atual` continua sendo autoridade do snapshot; apenas os sub-chips de positivo/negativo recalculam dos OFXs.

**N�o fazer:**
- Nunca gravar `saldo_bancario = total_saldo_banco_positivo` (que j� inclui cofre e rede) no snapshot � isso duplica esses valores na pr�xima leitura do Ramal 1.
- Nunca calcular `caixaAtualCalculado = saldo + dinheiro + aReceber + patio` sem subtrair `saldoNegativoItau` � o Cheque Especial � um passivo que reduz o caixa efetivo.

## [2026-08-27] � [Feature ID: 301-segregacao-saldo-negativo-cheque-especial-e-caixa-atual]

**Contexto:** Segrega��o cont�bil e visual estrita entre saldos banc�rios positivos e saldos devedores (cheque especial / limite), eliminando o abatimento antecipado do negativo dentro do Card de Bancos e realizando a dedu��o de forma transparente e �nica diretamente no Caixa Atual.

**Regra aprendida:**
1. **Composi��o do Card de Saldo Bancos + Dinheiro:**
   - O saldo OFX e o valor principal de destaque do Pilar 1 representam os **Ativos Brutos Dispon�veis**: $\text{Saldo Bancos Positivos} + \text{Dinheiro em Cofre} + \text{Rede a Compensar}$.
   - Se houver contas em cheque especial / saldo negativo (`saldo_negativo_itau > 0`), o valor devedor � exibido em um **sub-card/pill dedicado em vermelho**: `(-) Cheque Esp.: - R$ XX.XXX,XX`.
2. **Dedu��o �nica no Caixa Atual:**
   - A dedu��o do passivo de cheque especial ocorre **estritamente uma �nica vez** no fechamento do Caixa Atual:
     $$\text{Caixa Atual} = (\text{Total de Ativos Brutos}) - \text{Saldo Negativo (Cheque Especial)}$$
   - O Hero Card de Caixa Atual demonstra essa transpar�ncia em seu subtexto.
3. **Modal Raio-X de Saldos:**
   - Divide no cabe�alho: `OFX Positivo`, `(-) Cheque Especial`, `Cofre nas Lojas`, `A Compensar (Rede)` e `L�quido Dispon�vel`, formatando as filiais devedoras em vermelho com badge `Cheque Esp.`.

**N�o fazer:** Nunca subtrair o saldo de contas devedoras/negativas dentro do total bruto de bancos no Card de Bancos, pois isso mascara a liquidez real das filiais positivas e impede a concilia��o clara do fechamento cont�bil.

## [2026-08-26] � [Feature ID: 291-preservacao-total-transacoes-ofx-e-heranca-conciliacoes-historicas]

**Contexto:** Preserva��o de 100% dos lan�amentos contidos em arquivos OFX (incluindo fins de semana, feriados prolongados e datas retroativas/futuras) e heran�a autom�tica de justificativas/OSs com trava de seguran�a (read-only / lock) para lan�amentos pertencentes a concilia��es anteriores ou posteriores.

**Regra aprendida:**
1. **Zero Descarte em Lotes Banc�rios (Finais de Semana e Feriados):**
   - O parser e o wizard de importa��o nunca devem cortar transa��es por data de liquida��o. Todas as linhas `<STMTTRN>` s�o gravadas no banco.
2. **Heran�a e Lock Cont�bil para Outras Concilia��es:**
   - Transa��es que j� foram justificadas ou vinculadas a OSs em qualquer outra data cont�bil (ex: sexta 22/08 em lote de segunda 26/08) herdam os dados de concilia��o e s�o travadas como `?? Conciliado em [DD/MM/AAAA]: [Categoria / OS]`.
   - O bloqueio de edi��o protege o fechamento homologado da data original de sofrer altera��es acidentais.

**N�o fazer:** Nunca assumir janela fixa de "D-1", pois finais de semana e feriados geram gaps de 3 a 5 dias que devem ser cobertos de forma din�mica pelo hist�rico de concilia��es.

## [2026-08-26] � [Feature ID: 290-extrato-bancario-completo-entradas-saidas-e-filtros]

**Contexto:** Refatora��o completa da tela de Extrato Banc�rio da Filial (`StoreExtratoBancarioView.tsx`), eliminando a oculta��o de d�bitos/sa�das, introduzindo motor de Fuzzy Auto-Match de despesas com as contas a pagar importadas (`daily_manual_bills`), e adicionando filtros nativos com contadores din�micos e formato estrito de data DD/MM/AAAA.

**Regra aprendida:**
1. **Fuzzy Auto-Match de Sa�das Banc�rias com Despesas:**
   - Cada d�bito (`type === 'out'`) do extrato OFX � cruzado contra `daily_manual_bills` por toler�ncia de valor exato (R$ 0,05) e similaridade do nome do favorecido.
   - D�bitos de boletos (ex: Servicekleen R$ 1.250) e sa�das PIX (ex: FT3 Servi�os R$ 60) s�o automaticamente vinculados e justificados com badge `?? Conta: [Favorecido]`, eliminando retrabalho manual.
2. **Data Limpa no Extrato:**
   - Exibir exclusivamente `DD/MM/AAAA`, sem hor�rio, garantindo legibilidade e foco nos valores cont�beis.

**N�o fazer:** Nunca filtrar `type === 'in'` na visualiza��o geral de extrato banc�rio, pois isso oculta os pagamentos e distorce a confer�ncia do operador.

## [2026-08-26] � [Feature ID: 289-correcao-duplicacao-contas-manual-e-importacao]

**Contexto:** Resolu��o da diverg�ncia de R$ 35k em Contas a Cobrir no dia 26/08/2026, restaurando o valor correto de R$ 16.974,94 (Base BuscaContas) + R$ 1.864,89 (Juros Rede) = R$ 18.839,83 no Subtotal de Contas a Cobrir.

**Regra aprendida:**
1. **Composi��o do Subtotal de Contas a Cobrir:** O subtotal exibido no card inferior � composto estritamente por: `Subtotal = Contas (Manual) + Juros Rede + Devolu��es Rede`.
2. **Contas (Manual) = Base Planilha + Extras:**
   - **Base Planilha:** O montante oficial do relat�rio de contas do ERP (`BuscaContasAPagar.xls`).
   - **Extras:** Despesas avulsas n�o faturadas ou n�o lan�adas no ERP (ex: pr�-labore, motoboy pontual).
   - Quando n�o h� despesas avulsas cadastradas, `Extras` deve ser estritamente zero e n�o aparecer na UI.

**N�o fazer:** Nunca duplicar o lote de contas importadas na visualiza��o do painel.

## [2026-08-25] � [Feature ID: 286-automacao-recebiveis-boletos-transferencias-e-match-ofx]

**Contexto:** Automa��o completa do ciclo de vida de Boletos Banc�rios e Transfer�ncias Banc�rias (d�bitos em conta, TED, DOC, dep�sitos identificados), incluindo c�lculo determin�stico de prazos de vencimento em dias �teis e feriados nacionais (Febraban/BACEN), segrega��o cont�bil contra dupla contagem no Caixa Atual, e concilia��o autom�tica com o extrato OFX.

**Regra aprendida:**
1. **Regras de Vencimento e Calend�rio Banc�rio:**
   - Transfer�ncias Banc�rias / D�bitos em Conta possuem prazo de liquida��o padr�o de **D+1 dia �til**.
   - Boletos Banc�rios parcelados (ex: `2x`, `30/60`, `3x`) s�o divididos proporcionalmente em N parcelas com vencimentos em D+30, D+60, prorrogando-se para o primeiro dia �til subsequente caso caiam em feriados ou finais de semana.
2. **Segrega��o Cont�bil (Pilar 3 vs Pilar 4):**
   - OSs com parcelamento a prazo geram t�tulos na entidade `public.receivables` (Pilar 3 A Receber). O valor do t�tulo migra para o Pilar 3 e n�o pode continuar como passivo em aberto no p�tio f�sico (`patio_os` / Pilar 4 Na Loja OS), evitando dupla contagem de ativo no Caixa Atual.
3. **Idempot�ncia de Receb�veis:**
   - A unicidade por `(store_id, os_number, installment)` impede duplica��es em re-importa��es de arquivos no mesmo dia e preserva o hist�rico de t�tulos j� liquidados (`status = 'recebido'`).

**N�o fazer:** Nunca cadastrar manualmente t�tulos que j� constem com forma de pagamento identificada na OS do ERP.

## [2026-08-25] � [Feature ID: 285-correcao-definitiva-rpc-conciliacao-e-limpeza-backend]

**Contexto:** Corre��o da RPC can�nica de concilia��o (`get_daily_reconciliation_summary`), eliminando colunas fantasmas (`pix_total`/`rede_total` em `reconciliations`) que quebravam o Ramal de dias fechados, e restaura��o do c�lculo do Saldo Banc�rio das 10 filiais no Ramal de dias abertos (25/08) para computar o saldo patrimonial real em conta.

**Regra aprendida:**
1. **Diferen�a entre Saldo Banc�rio e Movimenta��o L�quida:** O Saldo Banc�rio no Pilar 1 de concilia��o � uma grandeza patrimonial est�tica acumulada (`bank_total` das 10 contas Ita�). O fluxo de entradas menos sa�das (`SUM(in - out)`) do extrato OFX do dia serve apenas como indicador informativo e n�o pode substituir o saldo patrimonial, sob pena de gerar distor��es monumentais no Fluxo de Caixa e no Valor Dispon�vel para Contas.
2. **Imutabilidade de Snapshots Homologados:** O Ramal 1 da RPC devolve fielmente os metadados cont�beis oficiais gravados no fechamento do dia (`is_closed = true`), blindando o hist�rico passado de qualquer oscila��o futura.

**N�o fazer:** Nunca substituir `reconciliations.bank_total` por `SUM(in - out)` em concilia��es di�rias.

## [2026-08-25] � [Feature ID: 283-congelamento-imutavel-snapshots-e-isolamento-historico-conciliacao]

**Contexto:** Garantia de imutabilidade dos dias fechados oficiais (17, 18, 19, 21 e 24/08) e corre��o da agrega��o de Contas a Pagar (Base Planilha + Despesas Extras).

**Regra aprendida:**
1. **Imutabilidade Cont�bil de Fechamentos (Period Close):** Uma vez que o dia � encerrado e aprovado com sucesso, a RPC e o painel devem exibir os dados consolidados do snapshot oficial, sem sofrer recalculo destrutivo por varia��es posteriores de estoque de OS no p�tio ou baixas em D+1.
2. **Duas Camadas em Contas a Pagar:**
   - **Camada 1 (Base da Planilha):** Importada de `BuscaContasAPagar.xls` e armazenada em `daily_snapshots.contas_a_pagar`.
   - **Camada 2 (Extras e Ajustes):** Lan�amentos manuais isolados em `daily_manual_bills`.
   - A soma ocorre estritamente na camada de exibi��o/RPC: $\text{Total Contas} = \text{Base} + \text{Extras}$.
   - Salvar o fechamento nunca pode sobrepor a Camada 1 com o valor da soma.

**N�o fazer:** Nunca misturar inputs de despesas manuais extras com a coluna base da planilha no banco de dados.

## [2026-08-24] � [Feature ID: 278-motor-calculo-direto-fontes-e-desduplicacao]

**Contexto:** Corre��o da apura��o direta dos arquivos brutos de concilia��o (OFX, Rede, OS ERP e Contas a Pagar), eliminando duplica��o de despesas e sobreposi��o de colunas de OS.

**Regra aprendida:**
1. **Desduplica��o de Contas a Pagar na RPC:** Quando daily_manual_bills armazena as contas detalhadas importadas do arquivo BuscaContasAPagar, _contas_manual deve usar SUM(amount) de daily_manual_bills diretamente. Nunca somar contas_base (snapshot) + contas_extras (daily_manual_bills) se ambas cont�m o mesmo lote de despesas.
2. **Parser Estrito de OS ERP:** Em ConferenciaOSxFinanceiro, a coluna R$ Total da OS (coluna 10) e Restante na OS (coluna 12) devem ser priorizadas. A coluna Total no Financeiro (coluna 13) vem zerada no ERP e N�O pode sobrescrever 	otalValue.
3. **Preserva��o Padr�o de Carryover de P�tio:** Ve�culos que constavam no p�tio de dias anteriores e n�o foram movimentados no relat�rio de hoje devem ser mantidos no p�tio como padr�o (status = original_status), evitando que o operador d� baixa acidental em carros em conserto.

**N�o fazer:** Nunca somar o total do arquivo com o total individual dos itens no banco de dados.

## [2026-08-24] � [Feature ID: 276-refinamento-filtro-vinculo-manual-pix-os]

**Contexto:** Refinamento dos candidatos a v�nculo manual de OS com dep�sitos de PIX no extrato banc�rio.

**Regra aprendida:**
1. **Isolamento por Filial:** O modal de v�nculo s� pode listar OSs pertencentes ao store_id da filial atual.
2. **Exclus�o de OSs J� Vinculadas:** Subquery/verifica��o contra ofx_transactions (matched_os_number IS NOT NULL) para n�o sugerir OSs cujo PIX j� foi conciliado.
3. **Bloqueio de Cart�o/Dinheiro:** OSs pagas 100% em Cart�o de Cr�dito/D�bito ou Dinheiro em Esp�cie (sem saldo em aberto) nunca devem ser sugeridas para dep�sitos de PIX.
4. **Score de Match Real:** O valor comparado para Match Exato � o pix_transfer_value ou saldo restante em aberto, e nunca o valor de cart�o.

**N�o fazer:** Nunca usar fallback de paid_value || total_value para dep�sitos de PIX quando pix_transfer_value = 0 em OSs quitadas por cart�o.

## [2026-08-24] � [Feature ID: 275-previsto-entradas-ofx-e-diferenca-pendente-por-loja]

**Contexto:** Padroniza��o da vis�o de concilia��o por filial para que o Previsto seja o Total de Entradas OFX creditadas no dia e a Diferen�a reflita exatamente o saldo de entradas N�O justificadas/identificadas.

**Regra aprendida:**
1. **Previsto por Filial:** $\sum \text{amount}$ de todas as entradas banc�rias OFX (	ype = in) do dia.
2. **Diferen�a por Filial:** $\text{Previsto} - (\text{Rede/Cart�o Liquidado} + \text{PIX OS Vinculados} + \text{Receitas Avulsas Justificadas})$.
3. O status da filial � conciliado se $|\text{Diferen�a}| \le 0.05$, sen�o divergente indicando pend�ncia de a��o do usu�rio.

**Risco identificado:** Abater transa��es de PIX da diferen�a sem v�nculo com OS ou justificativa manual, ocultando pend�ncias banc�rias leg�timas.

**N�o fazer:** Nunca abater PIX bruto do previsto sem checar se tem matched_os_number ou manual_category.

## [2026-08-24] � [Feature ID: 274-motor-automatch-rede-os-e-carryover-patio]

**Contexto:** Diverg�ncias entre concilia��o manual no Excel e sistema decorriam de: (1) OSs pagas na maquininha sem baixa no ERP pelo atendente (ex: Rei do M�dulo OS #1847 R$ 12.900) e (2) relat�rios do ERP filtrados por data de abertura do m�s corrente omitindo carros em p�tio abertos no m�s anterior (ex: Santo Andr� OS #2326 R$ 9.218,73).

**Regra aprendida:**
1. **Auto-Match Inteligente Maquininha ? OS:** Quando uma venda de cart�o da Rede entra no sistema para uma filial e cobre o valor de uma OS em aberto na mesma filial, o sistema deve dar baixa autom�tica (paid_value = total_value, status = finalizada), zerando o p�tio.
2. **Carry-Over Cumulativo de P�tio:** Carros em manuten��o em concilia��es anteriores n�o podem ser apagados/zerados s� porque n�o constam no relat�rio mensal do ERP; eles permanecem ativos no p�tio at� confirma��o de faturamento/baixa.

**Risco identificado:** Apagar o hist�rico de OSs antigas no upsert de novos relat�rios mensais, fazendo sumir valores leg�timos de p�tio.

**N�o fazer:** Nunca presumir que uma OS sumiu do p�tio s� porque n�o est� no arquivo de importa��o do dia.

## [2026-08-24] � [Feature ID: 273-varredura-calculos-rpc-e-pilares-saldo]

**Contexto:** O card principal SALDO BANCOS + DINHEIRO e o Caixa Atual da RPC get_daily_reconciliation_summary estavam omitindo dinheiro no cofre e cart�es a compensar, gerando distor��o no Fluxo de Caixa e no Valor Dispon�vel de Contas.

**Regra aprendida:**
1. O Card 1 deve refletir o somat�rio do Pilar 1: total_saldo_banco = Saldo OFX + Dinheiro no Cofre + Cart�es a Compensar.
2. O Caixa Atual � a soma dos 4 pilares din�micos: total_saldo_banco + dinheiro_mp + a_receber + na_loja_os.
3. Jamais alterar ou mutar a tabela daily_snapshots para for�ar fechamentos cont�beis; a RPC � a respons�vel pela computa��o din�mica em tempo de execu��o.

**Risco identificado:** Calcular Caixa Atual somando apenas saldos banc�rios puros, deixando o dinheiro f�sico das lojas invis�vel no patrim�nio.

**N�o fazer:** Nunca reescrever valores de snapshots gravados pelo usu�rio para ajustar discrep�ncias da RPC.

## [2026-08-24] � [Feature ID: 272-apuracao-dinheiro-loja-e-maquininhas-pendentes]

**Contexto:** Pagamentos de OSs em dinheiro f�sico estavam sendo agrupados indevidamente como PIX no importador e o dinheiro em cofre por filial vinha zerado (`-`), gerando diverg�ncia com o fechamento do Excel (onde Dom Pedro possu�a R$ 1.845,00 em cofre da OS #586, status N�O ENTROU).

**Regra aprendida:** 
1. **Separa��o Can�nica de Dinheiro F�sico:** Dinheiro n�o cai no extrato banc�rio. Deve ser extra�do em campo pr�prio `cash_value` no parser de OSs e registrado em `store_cash_vault` com `status: 'em_transito'`.
2. **Janela Cont�bil e Preven��o de Duplicidade:** OSs com pagamento em dinheiro de datas anteriores ao �ltimo fechamento consolidado (ex: Rudge R$ 1.900 de 18/08 e Beretta R$ 2.988,26 de 20/08) j� tiveram baixa cont�bil e N�O podem ser contabilizadas novamente no cofre do dia atual (`status: 'depositado'`).
3. **Composi��o do Saldo por Loja no Raio-X:** `Saldo Consolidado da Filial = Saldo Extrato OFX (Ita�) + Dinheiro no Cofre (em tr�nsito) + Maquininhas a Compensar (n�o entrou no OFX)`.

**Risco identificado:** Tratar dinheiro de relat�rios de OSs cumulativos como receita nova sem checar a data de baixa/�ltimo fechamento, duplicando o caixa f�sico das lojas.

**N�o fazer:** Nunca misturar a forma de pagamento `DINHEIRO` com `PIX/Transfer�ncia` no importador nem somar dinheiro de OSs finalizadas antes da janela atual da concilia��o.

## [2026-08-07] � [Feature ID: 141-fix-conciliacao-valor-contas-fluxo]

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
1. **Grid dos 5 Pilares:** O layout correto é grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 com cards individuais estilo 
ounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-sm.
2. **Sub-linhas alinhadas nos cards:** Card 1 (Saldo Bancos) mostra sub-linhas OFX: R$ ... e + Maq: + R$ ... em layout horizontal (lex justify-between) com ont-mono text-[11px], separados por order-t border-zinc-800/80.
3. **Cockpit de Fechamento em 3 Colunas Balanceadas:** �?rea inferior reorganizada em 3 colunas harmoniosas - Dinâmica de Caixa | Operação & Disponível | Balanço do Fechamento & Diferença Final.
4. **Tipografia dos pilares:** Valores principais usam 	ext-xl sm:text-2xl font-bold font-mono tracking-tight. Labels usam 	ext-[11px] font-bold text-zinc-400 uppercase tracking-wider.
5. **�?cones dos pilares:** Cada card tem um icon badge w-7 h-7 rounded-lg bg-{cor}-500/10 text-{cor}-400 flex items-center justify-center shrink-0 com ícone de 14px.
6. **Cores dos pilares:** Card 1 (Saldo Bancos) = cyan, Card 2 (Dinheiro MP) = emerald, uniformizar com zinc-950 como bg-canvas.

### Feature 238 - RPC Limpeza Atômica e Correção do Marco Zero
1. **RPC clear_all_financial_data():** Função PL/pgSQL com SECURITY DEFINER que trunca com CASCADE as 20 tabelas transacionais: ofx_transactions, pos_transactions, patio_os, estoque_os_pendente, 
econciliations, 
econciliacoes_triplas, daily_snapshots, dashboard_daily_logs, conciliation_daily_logs, conciliation_matches, manual_transactions, 
eceivables, import_logs, import_batches, cash_registers, 	ransactions, oficina_contas, oficina_os_cache, udit_logs, lerts.
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

## [2026-08-21] — [Feature ID: 262-restaurar-tabela-exclusiva-os-ausentes-preview]

**Contexto:** Auditoria e fechamento de ordens de serviço ativas no banco de dados que não constam na planilha mensal/diária do pátio.

**Regra aprendida:**
1. **Detecção Precisa de OSs Ausentes (`detectMissingOs`):** Buscar no Supabase ordens com status ativo (`em_aberto`, `pago_parcial`, `ABERTA`, `PENDENTE`) das filiais mapeadas e cruzar contra todas as OSs contidas nos arquivos importados (`results.osFiles`). As que sobrarem são as OSs ausentes.
2. **Persistência no Fechamento:** Ao confirmar o fechamento, as OSs ausentes modificadas pelo operador são atualizadas diretamente em `patio_os` com `total_value`, `paid_value`, `status` e `closed_at: targetDate` caso finalizadas.

**Risco identificado:** Deixar OSs órfãs no pátio indefinidamente se o relatório do mês deixar de trazê-las.

**Não fazer:** Nunca descartar silenciosamente OSs que deixaram de vir na planilha sem dar a chance ao operador de decidir o status final.

## [2026-08-21] — [Feature ID: 263-tabela-unificada-os-preview-com-filtros-e-edicao-livre]

**Contexto:** Unificação das ordens de serviço do dia (planilhas de pátio importadas) com as ordens em aberto de dias anteriores (banco de dados) para auditoria e conferência contábil antes do fechamento.

**Regra aprendida:**
1. **Unificação no Preview:** Agrupar `results.osFiles` e `missingOsList` em `allPreviewOsList` identificando a origem (`origin: 'imported' | 'missing'`).
2. **Mutação Imutável Reativa:** A edição de qualquer OS (da planilha ou do banco) atualiza imediatamente os cálculos globais de recebimentos do dia (`totalOs`), estoque em pátio (`totalPatioEstoqueGlobal`) e os saldos individuais de cada filial.
3. **Persistência Integral:** Ao confirmar o fechamento, as OSs importadas são gravadas em lote e quaisquer OSs ausentes modificadas são atualizadas diretamente na tabela `patio_os`.

**Risco identificado:** Dessincronização entre as OSs modificadas na UI e os reducers de faturamento/estoque das filiais.

**Não fazer:** Nunca separar as OSs em tabelas desconexas sem permitir a conferência consolidada da movimentação do dia.

## [2026-08-24] — [Feature ID: 264 & 265]

**Contexto:** Diagnóstico de Contas a Pagar e impacto de despesas manuais avulsas (`daily_manual_bills`) na Diferença Final.

**Regra aprendida:**
- `Subtotal Contas a Cobrir = Contas Base (Planilha) + Despesas Manuais Avulsas (daily_manual_bills) + Juros Rede`.
- Ao cadastrar uma despesa avulsa em `daily_manual_bills`, o total de contas a pagar aumenta, aumentando a necessidade de cobertura operacional e ampliando o déficit de fechamento se o faturamento não subir.
- Retiradas de Sócios ou aportes que explicam divergências de caixa devem ser tratados como Ajustes de Faturamento (`daily_revenue_adjustments`) ou Justificativas, e não como contas a pagar a fornecedores.

**Risco identificado:** Confundir despesa operacional a pagar com retirada/ajuste patrimonial.

**Não fazer:** Não somar despesas manuais duas vezes se a planilha importada já contém a conta em sua totalidade.

## [2026-08-24] — [Feature ID: 266 & 267]

**Contexto:** Alinhamento de conciliação com Excel oficial, âncora de dias úteis anteriores, sincronização granular de OSs e deduplicação de maquininhas.

**Regra aprendida:**
- A conciliação de segunda-feira deve sempre ancorar na última sexta-feira com fechamento consolidado (`caixa_atual > 0`), ignorando rascunhos vazios de fim de semana.
- Saldos bancários negativos do Itaú devem ser deduzidos na apuração do Caixa Atual Líquido (`Caixa Atual = Patrimônio Bruto - Negativo Itaú`).
- Transações de POS (Rede) devem possuir deduplicação determinística (`dedup_hash`) para evitar que relatórios importados em duplicidade gerem falsos alertas de "não entrou".
- OSs do pátio que estavam ativas no dia anterior e não constam no arquivo .xls de hoje devem ser auditadas pelo operador no Step 3 antes da consolidação.

**Risco identificado:** Reprocessamento de arquivos gerando duplicação em `pos_transactions` ou rascunhos de fim de semana quebrando o carry-over.

**Não fazer:** Nunca assumir que `date < target_date` trará o dia útil correto sem verificar se o fechamento anterior foi consolidado (`caixa_atual > 0`).

## 2026-08-26 � [Feature ID: 292]

**Contexto:** Desacoplamento do ciclo temporal de adquirentes (Rede/Cielo/Stone), corre��o de diverg�ncia de ~R$ 200 no extrato banc�rio de 26/08 e elimina��o de erros HTTP 400.

**Regra aprendida:**
- Vendas da maquininha em $D_0$ (`rede_liquido`) representam o Regime de Compet�ncia e entram 100% no Ativo de Cart�es a Compensar (Pilar 1).
- Cr�ditos banc�rios da Rede que caem hoje ($D_0$) no extrato representam a liquida��o financeira de $D_{-1}$ e j� comp�em o saldo em conta corrente (`saldo_bancos_ofx`).
- **NUNCA subtrair cr�ditos banc�rios de hoje das vendas de cart�o de hoje** no motor de concilia��o di�ria intra-dia (`nao_entrou = rede_liquido`).
- D�bitos banc�rios (sa�das) n�o devem ter bot�o "Justificar" para impedir que contas pagas sejam categorizadas indevidamente como receitas avulsas.
- Cr�ditos de lotes de adquirentes n�o devem ser vinculados a OSs individuais pelo operador (evita corrup��o da base e fadiga operacional); justificativas s�o restritas a tarifas e alugu�is de terminais.

**Risco identificado:** Tentar reconciliar o lote l�quido da adquirente diretamente contra ordens de servi�o brutas (com MDR descontada) causa 87% de erro humano e distorce o Caixa Atual ($G21$).

**N�o fazer:** Nunca reintroduzir cl�usulas hardcoded por filial como `s.id NOT IN ('st-01', 'st-05')`. O algoritmo deve ser 100% agn�stico e universal.

## 2026-08-26 � [Feature ID: 294]

**Contexto:** Duplica��o de Contas a Pagar ao importar despesas (soma dupla de `daily_manual_bills` + `snapshot.contas_a_pagar`) e exibi��o de `R$ NaN` em Maquininha/PIX no fechamento das 10 filiais.

**Regra aprendida:**
- **Contas a Pagar (Deduplica��o Can�nica):** A tabela `daily_manual_bills` � a **fonte oficial da verdade** para as contas do dia. Se existirem registros em `daily_manual_bills`, `contas_manual := SUM(daily_manual_bills)`. O campo `snapshot.contas_a_pagar` atua apenas como fallback quando n�o h� registros granulares. NUNCA some `snapshot.contas_a_pagar` junto com `daily_manual_bills`.
- **M�tricas por Filial & Anti-NaN:** No objeto de cada loja em `summary.stores`, a RPC deve retornar explicitamente `maquininha`, `rede_liquido`, `pix`, `pix_os`, `previsto_ofx` e `diferenca`. No frontend React, sempre utilize operadores de coalesc�ncia nula (`log.maquininha ?? log.rede_liquido ?? 0`) antes de passar valores para `<AnimatedNumber>`.

**Risco identificado:** A importa��o de despesas grava tanto os registros detalhados na tabela quanto atualiza o total no snapshot; consultas que somavam ambas as fontes geravam distor��o de 100% no subtotal de contas.

**N�o fazer:** Nunca some um acumulador em snapshot junto com as linhas detalhadas da tabela que geraram esse acumulador.

## 2026-08-26 � [Feature ID: 295]

**Contexto:** Dinheiro no cofre (`store_cash_vault`) n�o aparecia na filial correta na tabela por loja, e o Saldo Consolidado por filial n�o somava os tr�s componentes da conta.

**Regra aprendida:**
- **Saldo Consolidado por Filial:** O campo `saldo_banco` no array `stores` deve representar o saldo patrimonial completo da loja:
  $$\text{Saldo Consolidado} = \text{Extrato OFX (Ita�)} + \text{Dinheiro no Cofre} + \text{Maquininhas (A Compensar)}$$
- **Agrega��o de Cofre (`store_cash_vault`):** Deve ser agrupada por `store_id` na RPC para popular `dinheiro_loja` e a lista de `vault_entries`, viabilizando o bot�o "Dar Baixa" em dep�sitos pendentes na filial correta (ex: Santo Andr� - HD `st-08`).
- **Consist�ncia de Totais:** O total consolidado da tabela do modal (`SaldoBancosDetailModal`) deve ser matematicamente id�ntico ao valor exibido no card do topo ("SALDO BANCOS + DINHEIRO").

**N�o fazer:** Nunca deixe campos de agrega��o por loja hardcoded como `0` quando j� existe a tabela f�sica de suporte no banco de dados.

## 2026-08-26 � [Feature ID: 297]

**Contexto:** Falsa diferen�a de R$ 5k+ no fechamento por filial e descontinuidade de justificativas no extrato.

**Regra aprendida:**
- **Diferen�a Real por Filial:** A diverg�ncia de uma loja � calculada **estritamente pela soma de lan�amentos banc�rios �rf�os/pendentes** do dia:
  $$\text{Diferen�a da Filial} = \sum \text{OFX sem OS, sem Lote Rede D-1 e sem Justificativa}$$
  Vendas de maquininha de D0 s�o **A COMPENSAR** (entram no saldo do caixa, mas caem no banco em D+1/D+30) e NUNCA devem ser subtra�das do extrato de hoje.
- **Sincroniza��o de Justificativas:** O hook `useCategorizeOrphan` deve atualizar tanto `ofx_transactions` quanto `transactions` e `pos_transactions`. Ao justificar, o item ganha `manual_category` e a pend�ncia da filial zera imediatamente.

**N�o fazer:** Nunca subtraia vendas de maquininha de hoje das entradas banc�rias de hoje para calcular a diferen�a de uma loja.

## 2026-08-27 � [Feature ID: 298]

**Contexto:** Equaliza��o can�nica dos saldos das 10 filiais e fechamento do Caixa Atual com a Planilha Oficial (`CONCILIA��O 2608.xlsx`).

**Regra aprendida:**
- **Composi��o Can�nica de Saldo por Filial:**
  $$\text{Saldo Consolidado da Loja} = \text{Saldo OFX Puro} + \text{Cart�es A Compensar} + \text{Dinheiro no Cofre}$$
- **Preven��o de Double-Dipping em Saldos Devedores:** Os saldos negativos de contas correntes (ex: Planalto -R$ 3.845,74 e Santo Andr� -R$ 12.097,78, totalizando -R$ 15.943,52) j� s�o computados no somat�rio alg�brico das contas Ita� em $\mathbb{R}$. A m�trica `saldo_negativo_itau` � mantida estritamente para exibi��o de KPI/alerta no dashboard, nunca devendo ser deduzida uma segunda vez no c�lculo do Caixa Atual.
- **Caixa Atual Consolidado:** Resulta rigorosamente em **R$ 151.642,60** atrav�s da soma dos 4 Pilares ($P_1$: Bancos + Cofres + Cart�es = R$ 50.794,86, $P_2$: Dinheiro MP = R$ 15.323,00, $P_3$: A Receber = R$ 8.349,67, $P_4$: Na Loja OS = R$ 77.525,07).

**N�o fazer:** Nunca subtraia `saldo_negativo_itau` do Caixa Atual se `v_saldo_bancos` j� inclui os saldos devedores em sua soma alg�brica.

## 2026-08-27 � [Feature ID: 299]

**Contexto:** Blindagem definitiva de snapshots fechados contra muta��es retroativas e restaura��o do encadeamento de fechamento di�rio.

**Regra aprendida:**
- **Imutabilidade de Snapshots Fechados:** Dias com `is_closed = true` NUNCA devem ser recalculados dinamicamente via queries de `patio_os` ou `ofx_transactions`. A RPC `get_daily_reconciliation_summary` deve fazer curto-circuito e retornar diretamente os dados congelados do snapshot.
- **Ancoragem Temporal:** O `caixa_anterior` do dia D+1 l� diretamente o `caixa_atual` do snapshot de D. O congelamento de 26/08 em R$ 151.642,60 alimenta perfeitamente o dia 27/08.

**N�o fazer:** Nunca permita que muta��es em OSs de hoje recalculem o p�tio de dias passados que j� foram fechados.

## [2026-08-30] � [Feature ID: 314] Teste E2E e Fechamento da Concilia��o com Arquivos Reais de 27-08
**Contexto:** Valida��o ponta a ponta no localhost:8080 do Wizard de Ingest�o e Concilia��o com os 27 arquivos reais de 27/08/2026.
**Regra aprendida:**
<<<<<<< HEAD
- **Segregação de 5 Pilares no Fechamento:** Ativos Totais (Saldo Positivo + Dinheiro MP + A Receber + Pátio OS) subtraído do Cheque Especial compõem o Caixa Atual. O Fluxo de Caixa (Caixa Hoje - Caixa Ontem) deduzido do Faturamento do Dia deve cobrir exatamente o Subtotal de Contas a Pagar + Juros de Maquininha (Tolerância $\pm$ R$ 50,00).
- **Tratamento de Não-Faturamento:** Transferências entre filiais (Intercompany) e aportes dos sócios NUNCA devem somar ao faturamento contábil da empresa, recebendo a anotação `[NÃO SOMAR] [Apenas Conciliar]`.
**Risco identificado / Anti-pattern:** Nunca permitir que liquidações de adquirentes ou rendimentos bancários apareçam no painel de justificativas manuais de não-faturamento.

## [2026-08-31] — [Feature ID: 327] Alinhamento Integral dos 5 Pilares e Compensação Intra-Loja
**Contexto:** Erradicação de falsas divergências contábeis no fechamento de 31/08/2026 através do alinhamento pericial entre os arquivos brutos (OFX, Rede, OS, BuscaContas) e a planilha oficial do operador.
**Regra aprendida:**
1. **Compensação Intra-Loja de Cheque Especial vs. Rede:**
   Para cada filial $i$, o saldo líquido real é calculado antes da agregação holding:
   $$\text{Saldo Consolidado}_i = \text{Saldo OFX}_i + \text{Dinheiro em Cofre}_i + \text{Rede a Compensar}_i$$
   - Se $\text{Saldo Consolidado}_i < 0 \implies \text{Saldo Devedor Real} = |\text{Saldo Consolidado}_i|$ (Cheque Especial Líquido deduzido no Caixa Atual).
   - Se $\text{Saldo Consolidado}_i \ge 0 \implies \text{Saldo Positivo Real} = \text{Saldo Consolidado}_i$ (Ativo bancário superavitário).
2. **Aportes de Sócios com Impacto DRE:** Aportes bancários marcados para cobrir contas integram o `faturamento_periodo = faturamento_oi_base + faturamento_ajustes`, garantindo que o `Valor Disponível para Contas = Faturamento Total - Fluxo de Caixa` reflita a receita total do dia.
3. **Consolidação Total de Contas a Pagar:** O Subtotal de Contas integra $Contas Base + Pró-labore Daniel + Despesas Extras + Juros Rede$.
**Risco identificado / Anti-pattern:** Nunca subtrair cheque especial bruto do OFX sem abater as vendas de maquininhas que foram creditadas na mesma conta no dia, pois isso gera dupla penalização e distorce o Caixa Atual.

- **Segrega��o de 5 Pilares no Fechamento:** Ativos Totais (Saldo Positivo + Dinheiro MP + A Receber + P�tio OS) subtra�do do Cheque Especial comp�em o Caixa Atual. O Fluxo de Caixa (Caixa Hoje - Caixa Ontem) deduzido do Faturamento do Dia deve cobrir exatamente o Subtotal de Contas a Pagar + Juros de Maquininha (Toler�ncia $\pm$ R$ 50,00).
- **Tratamento de N�o-Faturamento:** Transfer�ncias entre filiais (Intercompany) e aportes dos s�cios NUNCA devem somar ao faturamento cont�bil da empresa, recebendo a anota��o `[N�O SOMAR] [Apenas Conciliar]`.
**Risco identificado / Anti-pattern:** Nunca permitir que liquida��es de adquirentes ou rendimentos banc�rios apare�am no painel de justificativas manuais de n�o-faturamento. (fix: normalize all workflow view_file paths to global skills directory)
=======
- **Segrega��o de 5 Pilares no Fechamento:** Ativos Totais (Saldo Positivo + Dinheiro MP + A Receber + P�tio OS) subtra�do do Cheque Especial comp�em o Caixa Atual. O Fluxo de Caixa (Caixa Hoje - Caixa Ontem) deduzido do Faturamento do Dia deve cobrir exatamente o Subtotal de Contas a Pagar + Juros de Maquininha (Toler�ncia $\pm$ R$ 50,00).
- **Tratamento de N�o-Faturamento:** Transfer�ncias entre filiais (Intercompany) e aportes dos s�cios NUNCA devem somar ao faturamento cont�bil da empresa, recebendo a anota��o `[N�O SOMAR] [Apenas Conciliar]`.
**Risco identificado / Anti-pattern:** Nunca permitir que liquida��es de adquirentes ou rendimentos banc�rios apare�am no painel de justificativas manuais de n�o-faturamento.
>>>>>>> 67d8357 (feat(314): auditoria de integridade de saldos, deduplicacao ofx multi-dias e ciclo rede)
