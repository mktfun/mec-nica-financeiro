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

**Contexto:** Implementação da esteira modular de conciliação diária dividida em Ingestão Global Unificada (uploads e inputs manuais juntos na entrada) e Wizard de Resolução em 4 Passos Focados (Vínculo direto de 1 clique à OS, Justificativas contábeis editáveis/canceláveis, Conferência de cofre do Daniel e Auditoria final com Gemini 3.5 Flash Lite).

**Regra aprendida:**
1. **Ingestão Global Unificada:** O sistema precisa ter em memória simultaneamente todos os arquivos (OFX das 10 filiais Itaú, Relatório de Vendas da Rede, Relatório de OSs do Pátio e Contas a Pagar) e inputs manuais preliminares (Data Alvo, Odômetro/Faturamento Acumulado) antes de abrir a resolução. Sem toda a massa de dados carregada, é impossível correlacionar PIX com OS ou diferenciar vendas de aportes/transferências.
2. **Vínculo Direto de 1 Clique à OS (Sem Redundância):**
   - Transações do extrato ou maquininha sem pagamento lançado na OS pelo gerente já possuem valor exato e forma de pagamento original (ex: `PIX`, `Crédito Visa`, `Débito Elo`).
   - O operador apenas seleciona a OS correspondente da loja no pátio. O sistema herda compulsoriamente o valor e a forma de pagamento que já vieram da transação, atualiza `patio_os.paid_value`, grava `payment_method`, rebate o saldo em aberto do Pátio (`NA LOJA OS`) e vincula a transação em `conciliation_matches` em 1 clique sem dropdowns redundantes.
3. **Justificativas Contábeis com Liberdade de Edição/Cancelamento:** Transações de não-faturamento (aportes, transferências entre lojas, estornos, tarifas) permitem edição completa e cancelamento a qualquer momento antes do fechamento final.
4. **Cofre e Recolhimento do Daniel:** O fluxo pergunta formalmente se o Daniel recolheu dinheiro nos cofres físicos das 10 filiais para depósito. Se positivo, baixa automaticamente a sangria em `store_cash_vault` (`status: 'depositado'`).
5. **Modelo Canônico de IA:** O modelo oficial padronizado para reconciliação assistida é compulsoriamente o **`gemini-3.5-flash-lite`** (em `llm-matcher.ts` e `useAiSettings.ts`).

**Risco identificado / Anti-pattern:** Nunca pedir para o operador preencher valor ou forma de pagamento ao vincular uma transação à OS quando esses dados já constam no registro de origem da maquininha ou do extrato.

## [2026-08-27] — [Feature ID: 303-correcao-faturamento-do-dia]

**Contexto:** Correção do cálculo e exibição do Card "Faturamento do Dia" para refletir com exatidão o faturamento líquido do próprio dia (diferença entre o odômetro de hoje e o de ontem: `Hoje - Ontem`), evitando a exibição do total acumulado do mês no card.

**Regra aprendida:**
1. **Faturamento do Dia = Odômetro Hoje - Odômetro Ontem:**
   - A coluna `daily_snapshots.faturamento` armazena o odômetro acumulado no mês (ex: `R$ 891.663,62` em 27/08).
   - O faturamento anterior vem do snapshot fechado imediatamente anterior (`date < target_date ORDER BY date DESC LIMIT 1`, ex: `R$ 867.870,82` em 26/08).
   - O faturamento líquido do dia é: `faturamento_oi_base = 891.663,62 - 867.870,82 = R$ 23.792,80`.
   - O Card "Faturamento do Dia" DEVE sempre exibir `faturamento_periodo` (`R$ 23.792,80`), NUNCA o odômetro acumulado.
2. **Exibição e Edição de Odômetro:** No modo de edição, o input aceita o odômetro acumulado, mas a interface calcula e exibe em tempo real `Dia: R$ 23.792,80 (Ant: R$ 867.870,82)` para transparência total ao operador.

**Risco identificado:** Se a RPC não carregar ou retornar `faturamento_anterior`, o frontend faz fallback para 0 e o faturamento do dia acaba igualando o valor bruto acumulado.

**Não fazer:** Nunca atribuir `v_faturamento_periodo := v_snapshot.faturamento` no Ramal 1 da RPC sem subtrair o faturamento anterior.

## [2026-08-27] — [Feature ID: 302-correcao-saldo-bancos-caixa-atual-e-acumulacao-ao-salvar]

**Contexto:** Correção de dois bugs críticos no fechamento diário: (A) acumulação do saldo_bancario a cada clique em "Salvar" e (B) Caixa Atual não deduzia o Cheque Especial.

**Regra aprendida:**
1. **saldo_bancario no snapshot = OFX líquido puro:** O campo `daily_snapshots.saldo_bancario` deve armazenar exclusivamente o `saldo_bancos_ofx` (soma líquida de `bank_total` das 10 contas Itaú). Cofre (`dinheiro_em_lojas`) e Maquininhas (`cartoes_a_compensar`) NÃO entram neste campo — eles são adicionados na composição do Pilar 1 (`total_saldo_banco_positivo`) na RPC ou no frontend.
2. **Caixa Atual = Ativos Brutos - Cheque Especial:** A fórmula canônica do frontend (e da RPC) é: `Caixa Atual = (total_saldo_banco_positivo + dinheiro_mp + a_receber + na_loja_os) - saldo_negativo_itau`. O `saldoNegativoItau` DEVE ser subtraído explicitamente — não apenas exibido como informativo.
3. **Loop de acumulação em snapshots:** Se o handleSave grava um campo X que a RPC depois lê como entrada para recalcular X, cria-se um loop que infla o valor a cada save. A solução é: a RPC sempre busca a fonte primária (tabelas transacionais como `reconciliations`), nunca o snapshot para campos calculáveis.

**Risco identificado:** O Ramal 1 da RPC, ao ler campos de snapshots históricos, pode retornar `saldo_bancos_positivo` diferente se as `reconciliations` forem retroativamente alteradas. Mitigação: o `caixa_atual` continua sendo autoridade do snapshot; apenas os sub-chips de positivo/negativo recalculam dos OFXs.

**Não fazer:**
- Nunca gravar `saldo_bancario = total_saldo_banco_positivo` (que já inclui cofre e rede) no snapshot — isso duplica esses valores na próxima leitura do Ramal 1.
- Nunca calcular `caixaAtualCalculado = saldo + dinheiro + aReceber + patio` sem subtrair `saldoNegativoItau` — o Cheque Especial é um passivo que reduz o caixa efetivo.

## [2026-08-27] — [Feature ID: 301-segregacao-saldo-negativo-cheque-especial-e-caixa-atual]

**Contexto:** Segregação contábil e visual estrita entre saldos bancários positivos e saldos devedores (cheque especial / limite), eliminando o abatimento antecipado do negativo dentro do Card de Bancos e realizando a dedução de forma transparente e única diretamente no Caixa Atual.

**Regra aprendida:**
1. **Composição do Card de Saldo Bancos + Dinheiro:**
   - O saldo OFX e o valor principal de destaque do Pilar 1 representam os **Ativos Brutos Disponíveis**: $\text{Saldo Bancos Positivos} + \text{Dinheiro em Cofre} + \text{Rede a Compensar}$.
   - Se houver contas em cheque especial / saldo negativo (`saldo_negativo_itau > 0`), o valor devedor é exibido em um **sub-card/pill dedicado em vermelho**: `(-) Cheque Esp.: - R$ XX.XXX,XX`.
2. **Dedução Única no Caixa Atual:**
   - A dedução do passivo de cheque especial ocorre **estritamente uma única vez** no fechamento do Caixa Atual:
     $$\text{Caixa Atual} = (\text{Total de Ativos Brutos}) - \text{Saldo Negativo (Cheque Especial)}$$
   - O Hero Card de Caixa Atual demonstra essa transparência em seu subtexto.
3. **Modal Raio-X de Saldos:**
   - Divide no cabeçalho: `OFX Positivo`, `(-) Cheque Especial`, `Cofre nas Lojas`, `A Compensar (Rede)` e `Líquido Disponível`, formatando as filiais devedoras em vermelho com badge `Cheque Esp.`.

**Não fazer:** Nunca subtrair o saldo de contas devedoras/negativas dentro do total bruto de bancos no Card de Bancos, pois isso mascara a liquidez real das filiais positivas e impede a conciliação clara do fechamento contábil.

## [2026-08-26] — [Feature ID: 291-preservacao-total-transacoes-ofx-e-heranca-conciliacoes-historicas]

**Contexto:** Preservação de 100% dos lançamentos contidos em arquivos OFX (incluindo fins de semana, feriados prolongados e datas retroativas/futuras) e herança automática de justificativas/OSs com trava de segurança (read-only / lock) para lançamentos pertencentes a conciliações anteriores ou posteriores.

**Regra aprendida:**
1. **Zero Descarte em Lotes Bancários (Finais de Semana e Feriados):**
   - O parser e o wizard de importação nunca devem cortar transações por data de liquidação. Todas as linhas `<STMTTRN>` são gravadas no banco.
2. **Herança e Lock Contábil para Outras Conciliações:**
   - Transações que já foram justificadas ou vinculadas a OSs em qualquer outra data contábil (ex: sexta 22/08 em lote de segunda 26/08) herdam os dados de conciliação e são travadas como `🔒 Conciliado em [DD/MM/AAAA]: [Categoria / OS]`.
   - O bloqueio de edição protege o fechamento homologado da data original de sofrer alterações acidentais.

**Não fazer:** Nunca assumir janela fixa de "D-1", pois finais de semana e feriados geram gaps de 3 a 5 dias que devem ser cobertos de forma dinâmica pelo histórico de conciliações.

## [2026-08-26] — [Feature ID: 290-extrato-bancario-completo-entradas-saidas-e-filtros]

**Contexto:** Refatoração completa da tela de Extrato Bancário da Filial (`StoreExtratoBancarioView.tsx`), eliminando a ocultação de débitos/saídas, introduzindo motor de Fuzzy Auto-Match de despesas com as contas a pagar importadas (`daily_manual_bills`), e adicionando filtros nativos com contadores dinâmicos e formato estrito de data DD/MM/AAAA.

**Regra aprendida:**
1. **Fuzzy Auto-Match de Saídas Bancárias com Despesas:**
   - Cada débito (`type === 'out'`) do extrato OFX é cruzado contra `daily_manual_bills` por tolerância de valor exato (R$ 0,05) e similaridade do nome do favorecido.
   - Débitos de boletos (ex: Servicekleen R$ 1.250) e saídas PIX (ex: FT3 Serviços R$ 60) são automaticamente vinculados e justificados com badge `🟢 Conta: [Favorecido]`, eliminando retrabalho manual.
2. **Data Limpa no Extrato:**
   - Exibir exclusivamente `DD/MM/AAAA`, sem horário, garantindo legibilidade e foco nos valores contábeis.

**Não fazer:** Nunca filtrar `type === 'in'` na visualização geral de extrato bancário, pois isso oculta os pagamentos e distorce a conferência do operador.

## [2026-08-26] — [Feature ID: 289-correcao-duplicacao-contas-manual-e-importacao]

**Contexto:** Resolução da divergência de R$ 35k em Contas a Cobrir no dia 26/08/2026, restaurando o valor correto de R$ 16.974,94 (Base BuscaContas) + R$ 1.864,89 (Juros Rede) = R$ 18.839,83 no Subtotal de Contas a Cobrir.

**Regra aprendida:**
1. **Composição do Subtotal de Contas a Cobrir:** O subtotal exibido no card inferior é composto estritamente por: `Subtotal = Contas (Manual) + Juros Rede + Devoluções Rede`.
2. **Contas (Manual) = Base Planilha + Extras:**
   - **Base Planilha:** O montante oficial do relatório de contas do ERP (`BuscaContasAPagar.xls`).
   - **Extras:** Despesas avulsas não faturadas ou não lançadas no ERP (ex: pró-labore, motoboy pontual).
   - Quando não há despesas avulsas cadastradas, `Extras` deve ser estritamente zero e não aparecer na UI.

**Não fazer:** Nunca duplicar o lote de contas importadas na visualização do painel.

## [2026-08-25] — [Feature ID: 286-automacao-recebiveis-boletos-transferencias-e-match-ofx]

**Contexto:** Automação completa do ciclo de vida de Boletos Bancários e Transferências Bancárias (débitos em conta, TED, DOC, depósitos identificados), incluindo cálculo determinístico de prazos de vencimento em dias úteis e feriados nacionais (Febraban/BACEN), segregação contábil contra dupla contagem no Caixa Atual, e conciliação automática com o extrato OFX.

**Regra aprendida:**
1. **Regras de Vencimento e Calendário Bancário:**
   - Transferências Bancárias / Débitos em Conta possuem prazo de liquidação padrão de **D+1 dia útil**.
   - Boletos Bancários parcelados (ex: `2x`, `30/60`, `3x`) são divididos proporcionalmente em N parcelas com vencimentos em D+30, D+60, prorrogando-se para o primeiro dia útil subsequente caso caiam em feriados ou finais de semana.
2. **Segregação Contábil (Pilar 3 vs Pilar 4):**
   - OSs com parcelamento a prazo geram títulos na entidade `public.receivables` (Pilar 3 A Receber). O valor do título migra para o Pilar 3 e não pode continuar como passivo em aberto no pátio físico (`patio_os` / Pilar 4 Na Loja OS), evitando dupla contagem de ativo no Caixa Atual.
3. **Idempotência de Recebíveis:**
   - A unicidade por `(store_id, os_number, installment)` impede duplicações em re-importações de arquivos no mesmo dia e preserva o histórico de títulos já liquidados (`status = 'recebido'`).

**Não fazer:** Nunca cadastrar manualmente títulos que já constem com forma de pagamento identificada na OS do ERP.

## [2026-08-25] — [Feature ID: 285-correcao-definitiva-rpc-conciliacao-e-limpeza-backend]

**Contexto:** Correção da RPC canônica de conciliação (`get_daily_reconciliation_summary`), eliminando colunas fantasmas (`pix_total`/`rede_total` em `reconciliations`) que quebravam o Ramal de dias fechados, e restauração do cálculo do Saldo Bancário das 10 filiais no Ramal de dias abertos (25/08) para computar o saldo patrimonial real em conta.

**Regra aprendida:**
1. **Diferença entre Saldo Bancário e Movimentação Líquida:** O Saldo Bancário no Pilar 1 de conciliação é uma grandeza patrimonial estática acumulada (`bank_total` das 10 contas Itaú). O fluxo de entradas menos saídas (`SUM(in - out)`) do extrato OFX do dia serve apenas como indicador informativo e não pode substituir o saldo patrimonial, sob pena de gerar distorções monumentais no Fluxo de Caixa e no Valor Disponível para Contas.
2. **Imutabilidade de Snapshots Homologados:** O Ramal 1 da RPC devolve fielmente os metadados contábeis oficiais gravados no fechamento do dia (`is_closed = true`), blindando o histórico passado de qualquer oscilação futura.

**Não fazer:** Nunca substituir `reconciliations.bank_total` por `SUM(in - out)` em conciliações diárias.

## [2026-08-25] — [Feature ID: 283-congelamento-imutavel-snapshots-e-isolamento-historico-conciliacao]

**Contexto:** Garantia de imutabilidade dos dias fechados oficiais (17, 18, 19, 21 e 24/08) e correção da agregação de Contas a Pagar (Base Planilha + Despesas Extras).

**Regra aprendida:**
1. **Imutabilidade Contábil de Fechamentos (Period Close):** Uma vez que o dia é encerrado e aprovado com sucesso, a RPC e o painel devem exibir os dados consolidados do snapshot oficial, sem sofrer recalculo destrutivo por variações posteriores de estoque de OS no pátio ou baixas em D+1.
2. **Duas Camadas em Contas a Pagar:**
   - **Camada 1 (Base da Planilha):** Importada de `BuscaContasAPagar.xls` e armazenada em `daily_snapshots.contas_a_pagar`.
   - **Camada 2 (Extras e Ajustes):** Lançamentos manuais isolados em `daily_manual_bills`.
   - A soma ocorre estritamente na camada de exibição/RPC: $\text{Total Contas} = \text{Base} + \text{Extras}$.
   - Salvar o fechamento nunca pode sobrepor a Camada 1 com o valor da soma.

**Não fazer:** Nunca misturar inputs de despesas manuais extras com a coluna base da planilha no banco de dados.

## [2026-08-24] — [Feature ID: 278-motor-calculo-direto-fontes-e-desduplicacao]

**Contexto:** Correção da apuração direta dos arquivos brutos de conciliação (OFX, Rede, OS ERP e Contas a Pagar), eliminando duplicação de despesas e sobreposição de colunas de OS.

**Regra aprendida:**
1. **Desduplicação de Contas a Pagar na RPC:** Quando daily_manual_bills armazena as contas detalhadas importadas do arquivo BuscaContasAPagar, _contas_manual deve usar SUM(amount) de daily_manual_bills diretamente. Nunca somar contas_base (snapshot) + contas_extras (daily_manual_bills) se ambas contêm o mesmo lote de despesas.
2. **Parser Estrito de OS ERP:** Em ConferenciaOSxFinanceiro, a coluna R$ Total da OS (coluna 10) e Restante na OS (coluna 12) devem ser priorizadas. A coluna Total no Financeiro (coluna 13) vem zerada no ERP e NÃO pode sobrescrever 	otalValue.
3. **Preservação Padrão de Carryover de Pátio:** Veículos que constavam no pátio de dias anteriores e não foram movimentados no relatório de hoje devem ser mantidos no pátio como padrão (status = original_status), evitando que o operador dê baixa acidental em carros em conserto.

**Não fazer:** Nunca somar o total do arquivo com o total individual dos itens no banco de dados.

## [2026-08-24] — [Feature ID: 276-refinamento-filtro-vinculo-manual-pix-os]

**Contexto:** Refinamento dos candidatos a vínculo manual de OS com depósitos de PIX no extrato bancário.

**Regra aprendida:**
1. **Isolamento por Filial:** O modal de vínculo só pode listar OSs pertencentes ao store_id da filial atual.
2. **Exclusão de OSs Já Vinculadas:** Subquery/verificação contra ofx_transactions (matched_os_number IS NOT NULL) para não sugerir OSs cujo PIX já foi conciliado.
3. **Bloqueio de Cartão/Dinheiro:** OSs pagas 100% em Cartão de Crédito/Débito ou Dinheiro em Espécie (sem saldo em aberto) nunca devem ser sugeridas para depósitos de PIX.
4. **Score de Match Real:** O valor comparado para Match Exato é o pix_transfer_value ou saldo restante em aberto, e nunca o valor de cartão.

**Não fazer:** Nunca usar fallback de paid_value || total_value para depósitos de PIX quando pix_transfer_value = 0 em OSs quitadas por cartão.

## [2026-08-24] — [Feature ID: 275-previsto-entradas-ofx-e-diferenca-pendente-por-loja]

**Contexto:** Padronização da visão de conciliação por filial para que o Previsto seja o Total de Entradas OFX creditadas no dia e a Diferença reflita exatamente o saldo de entradas NÃO justificadas/identificadas.

**Regra aprendida:**
1. **Previsto por Filial:** $\sum \text{amount}$ de todas as entradas bancárias OFX (	ype = in) do dia.
2. **Diferença por Filial:** $\text{Previsto} - (\text{Rede/Cartão Liquidado} + \text{PIX OS Vinculados} + \text{Receitas Avulsas Justificadas})$.
3. O status da filial é conciliado se $|\text{Diferença}| \le 0.05$, senão divergente indicando pendência de ação do usuário.

**Risco identificado:** Abater transações de PIX da diferença sem vínculo com OS ou justificativa manual, ocultando pendências bancárias legítimas.

**Não fazer:** Nunca abater PIX bruto do previsto sem checar se tem matched_os_number ou manual_category.

## [2026-08-24] — [Feature ID: 274-motor-automatch-rede-os-e-carryover-patio]

**Contexto:** Divergências entre conciliação manual no Excel e sistema decorriam de: (1) OSs pagas na maquininha sem baixa no ERP pelo atendente (ex: Rei do Módulo OS #1847 R$ 12.900) e (2) relatórios do ERP filtrados por data de abertura do mês corrente omitindo carros em pátio abertos no mês anterior (ex: Santo André OS #2326 R$ 9.218,73).

**Regra aprendida:**
1. **Auto-Match Inteligente Maquininha ↔ OS:** Quando uma venda de cartão da Rede entra no sistema para uma filial e cobre o valor de uma OS em aberto na mesma filial, o sistema deve dar baixa automática (paid_value = total_value, status = finalizada), zerando o pátio.
2. **Carry-Over Cumulativo de Pátio:** Carros em manutenção em conciliações anteriores não podem ser apagados/zerados só porque não constam no relatório mensal do ERP; eles permanecem ativos no pátio até confirmação de faturamento/baixa.

**Risco identificado:** Apagar o histórico de OSs antigas no upsert de novos relatórios mensais, fazendo sumir valores legítimos de pátio.

**Não fazer:** Nunca presumir que uma OS sumiu do pátio só porque não está no arquivo de importação do dia.

## [2026-08-24] — [Feature ID: 273-varredura-calculos-rpc-e-pilares-saldo]

**Contexto:** O card principal SALDO BANCOS + DINHEIRO e o Caixa Atual da RPC get_daily_reconciliation_summary estavam omitindo dinheiro no cofre e cartões a compensar, gerando distorção no Fluxo de Caixa e no Valor Disponível de Contas.

**Regra aprendida:**
1. O Card 1 deve refletir o somatório do Pilar 1: total_saldo_banco = Saldo OFX + Dinheiro no Cofre + Cartões a Compensar.
2. O Caixa Atual é a soma dos 4 pilares dinâmicos: total_saldo_banco + dinheiro_mp + a_receber + na_loja_os.
3. Jamais alterar ou mutar a tabela daily_snapshots para forçar fechamentos contábeis; a RPC é a responsável pela computação dinâmica em tempo de execução.

**Risco identificado:** Calcular Caixa Atual somando apenas saldos bancários puros, deixando o dinheiro físico das lojas invisível no patrimônio.

**Não fazer:** Nunca reescrever valores de snapshots gravados pelo usuário para ajustar discrepâncias da RPC.

## [2026-08-24] — [Feature ID: 272-apuracao-dinheiro-loja-e-maquininhas-pendentes]

**Contexto:** Pagamentos de OSs em dinheiro físico estavam sendo agrupados indevidamente como PIX no importador e o dinheiro em cofre por filial vinha zerado (`-`), gerando divergência com o fechamento do Excel (onde Dom Pedro possuía R$ 1.845,00 em cofre da OS #586, status NÃO ENTROU).

**Regra aprendida:** 
1. **Separação Canônica de Dinheiro Físico:** Dinheiro não cai no extrato bancário. Deve ser extraído em campo próprio `cash_value` no parser de OSs e registrado em `store_cash_vault` com `status: 'em_transito'`.
2. **Janela Contábil e Prevenção de Duplicidade:** OSs com pagamento em dinheiro de datas anteriores ao último fechamento consolidado (ex: Rudge R$ 1.900 de 18/08 e Beretta R$ 2.988,26 de 20/08) já tiveram baixa contábil e NÃO podem ser contabilizadas novamente no cofre do dia atual (`status: 'depositado'`).
3. **Composição do Saldo por Loja no Raio-X:** `Saldo Consolidado da Filial = Saldo Extrato OFX (Itaú) + Dinheiro no Cofre (em trânsito) + Maquininhas a Compensar (não entrou no OFX)`.

**Risco identificado:** Tratar dinheiro de relatórios de OSs cumulativos como receita nova sem checar a data de baixa/último fechamento, duplicando o caixa físico das lojas.

**Não fazer:** Nunca misturar a forma de pagamento `DINHEIRO` com `PIX/Transferência` no importador nem somar dinheiro de OSs finalizadas antes da janela atual da conciliação.

## [2026-08-07] — [Feature ID: 141-fix-conciliacao-valor-contas-fluxo]

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

**Regra aprendida:** Nunca atrelar matematicamente despesas importadas do banco (`ofx_out`) diretamente na fÃ³rmula da conciliaÃ§Ã£o diÃ¡ria global se o processo de importaÃ§Ã£o englobar dias nÃ£o equivalentes ao `target_date`. A conciliaÃ§Ã£o exige que a "conta" seja um valor exato inputado manualmente e salvo estaticamente no `daily_snapshots`.

**Risco identificado:** HidrataÃ§Ã£o de valores. A interface precisa forÃ§ar o React a carregar o valor histÃ³rico salvo para aquela data toda vez que o `selectedDate` mudar, caso contrÃ¡rio o valor de hoje transborda acidentalmente para dias jÃ¡ fechados do passado.

**NÃ£o fazer:** Nunca misturar o valor brutamente somado do extrato `ofx_out_total` com a "DiferenÃ§a" final do sistema. O extrato sÃ³ serve como Raio-X ou auditoria, e o `inputForCalculation` obedece apenas a variÃ¡veis controladas.
  
## [2026-08-11] - [Feature ID: 165/166]

**Contexto:** ImplantaÃ§Ã£o de Saldo Inicial (Marco Zero Global) lido de planilha Excel, forÃ§ando a auditoria manual diÃ¡ria de passivos pendentes.

**Regra aprendida:** O Excel do "Marco Zero" nÃ£o agrupa lojas por aba, mas sim por linha dentro das abas globais (SALDO, OS). O parser deve ler a planilha linha a linha, identificar o nome da loja na Coluna A e usar dicionÃ¡rios para agrupar saldos e OSs extraÃ­das por `storeName`. A UI deve, atravÃ©s do `storeName`, usar fuzzy matching para auto-selecionar o Store ID sem obrigar cliques manuais, enquanto exibe blocos isolados por loja.

**Risco identificado:** Assumir que o nome da aba representa o bloco de dados (ex: Aba SALDO). Isso mistura saldos de filiais diferentes. AlÃ©m disso, ocultar as baixas de OSs antigas sem obrigar auditoria criaria um passivo infinito.

**NÃ£o fazer:** Nunca parsear Excel de mÃºltiplas filiais assumindo que 1 aba = 1 entidade sem antes inspecionar os dados. Nunca permitir importaÃ§Ã£o diÃ¡ria de conciliaÃ§Ã£o sem forÃ§ar a resoluÃ§Ã£o do estoque passivo pendente (step 2.5).

## [2026-08-12] - [Feature ID: 167-marco-zero-parser-fix]

**Contexto:** RefatoraÃ§Ã£o do Parser do Marco Zero para evitar criaÃ§Ã£o de "lojas fantasmas" devido a rÃ³tulos de saldo na mesma coluna que nomes de lojas.

**Regra aprendida:** O parser de um arquivo Excel consolidado nÃ£o deve confiar cegamente que a primeira coluna preenchida de uma linha seja sempre um agrupador (como Loja). Ã‰ necessÃ¡rio usar um "Stateful Parser", verificando rigorosamente contra um dicionÃ¡rio oficial (`REDE_STORE_MAPPING`). RÃ³tulos adicionais na mesma coluna ("CartÃ£o DÃ©bito", "Saldo Banco ItaÃº") nÃ£o devem gerar lojas novas, mas sim injetar seus respectivos valores (presentes em outras colunas) na Ãºltima loja vÃ¡lida detectada.

**Risco identificado:** Qualquer rÃ³tulo desconhecido criar entidades falsas no importador, sujando toda a base global.

**NÃ£o fazer:** Nunca assumir que toda linha de um Excel sem cabeÃ§alhos rigorosos define uma entidade nova. Use validaÃ§Ã£o estrita (`isKnownStore`) antes de abrir blocos em memÃ³ria para agregar dados.
  
## [2026-08-12] - [Feature ID: 168-marco-zero-columns]  
  
**Contexto:** Refatoracao final do Marco Zero para tratar saldos globais vs OSs locais separadamente e injetar o snapshot diario inicial.  
  
**Regra aprendida:** 1) O Excel de Marco Zero consolida Caixa Atual, Dinheiro MP, A Receber e Negativo como um BLOCO GLOBAL (Colunas G e H), e nao dados repetidos por loja. O parser deve separar a extracao global da extracao por filial. 2) A implantacao do Marco Zero DEVE exigir uma Data retroativa e salvar obrigatoriamente um registro na tabela daily_snapshots para ancorar o Caixa Anterior do dia seguinte.  
  
**Risco identificado:** Tratar blocos globais (Dinheiro MP) como propriedades das lojas multiplicaria o dinheiro ficticiamente N vezes. Alem disso, nao salvar o snapshot no banco faria com que o fluxo de caixa iniciasse sem um 'Caixa Anterior' valido.  
  
**Nao fazer:** Nunca misture dados que foram concebidos de forma global (como Saldo Conta Itau e Dinheiro MP centralizado) dentro de modelos locais (store). Nunca permita uma importacao de marco zero sem data base ancorada num daily_snapshot. 

## [2026-08-13] â€” [Feature ID: 179-fix-dashboard-math]

**Contexto:** CorreÃ§Ã£o da matemÃ¡tica financeira do Dashboard e motor RPC de cÃ¡lculo global (Caixa Atual, DiferenÃ§a, A Receber e PÃ¡tio) a pedido expresso do cliente.

**Regra aprendida:** 
- O "Saldo Banco ItaÃº" Ã© puramente a soma das entradas importadas do arquivo OFX sem subtraÃ§Ãµes fantasmas de saldos negativos do ItaÃº. 
- A fÃ³rmula mestra da DiferenÃ§a na conciliaÃ§Ã£o Ã© estritamente: `(Faturamento_Atual - Fluxo_Caixa) - (Contas_a_Pagar + Juros_Rede)`.
- Faturamento Atual (ou LÃ­quido) refere-se Ãºnica e exclusivamente Ã s entradas puras importadas do OFX.

**Risco identificado:** A RPC no banco de dados e o hook no frontend calculando valores redundantes (como subtrair no banco e depois no React) causando dessincronia irreparÃ¡vel da fonte da verdade financeira.

**NÃ£o fazer:** Nunca misture a variÃ¡vel "A Receber Manual" com os valores somados das OSs (PÃ¡tio). Eles devem existir de forma independente na lÃ³gica do sistema. Nunca subtraia saldo negativo na composiÃ§Ã£o do "Caixa Atual" se os saldos base jÃ¡ incluem o saldo bancÃ¡rio real.

## [2026-08-13] â€” [Feature ID: 186-refatoracao-marco-zero]

**Contexto:** A data de implantaÃ§Ã£o do Marco Zero exibia a UI operacional diÃ¡ria cheia de divergÃªncias e o banco corrompia saldos. Refatorado com RPC atÃ´mica, download de logs `.json` e UI dedicada de Estado Inicial.

**Regra aprendida:** 
1. O Marco Zero representa um **Estado Inicial da Loja (Leitura de Lastro Legado)**. Na tela de ConciliaÃ§Ã£o DiÃ¡ria (`/conciliacao`), ao acessar uma data com `metadata.is_marco_zero = true`, a UI DEVE alternar para a visÃ£o simplificada ("Estado Inicial Implantado") exibindo apenas os saldos legados e a confirmaÃ§Ã£o de integridade.
2. A RPC `process_marco_zero_import` isola o escopo por `store_id` e salva o snapshot inicial para ancorar o "Caixa Anterior" dos dias subsequentes.

**Risco identificado:** Exibir botÃµes operacionais de conciliaÃ§Ã£o bancÃ¡ria diÃ¡ria na data do Marco Zero gera divergÃªncias fantasmas porque o Marco Zero nÃ£o possui extratos OFX de entradas/saÃ­das operacionais daquele dia.

**NÃ£o fazer:** Nunca renderizar calculadoras de divergÃªncia bancÃ¡ria diÃ¡ria padrÃ£o em uma data marcada com `is_marco_zero: true`.
  
## [2026-08-13] - [Feature ID: 187-gestao-os-legadas]  
  
**Contexto:** GestÆo das OSs importadas pelo fluxo do Marco Zero na visÆo di ria da filial.  
  
**Regra aprendida:** As datas de Marco Zero usam uma visÆo de tabela dedicada (LegacyOsTable) ao inv‚s do dashboard de concilia‡Æo normal, pois nÆo possuem movimenta‡Æo OFX. A liquida‡Æo manual ou em lote dessas OSs via RPC ajusta reativamente o contador Na Loja OS.  
  
**Risco identificado:** Risco de contagem duplicada ou dupla baixa. A RPC liquidate_legacy_os valida a execu‡Æo at“mica WHERE status = 'em_aberto'.  
  
**NÆo fazer:** NÆo misturar OSs do Marco Zero (saldo inicial legadas) com o fluxo de concilia‡Æo di rio (aba de CartÆo/Pix), pois as OSs legadas j  tiveram seu caixa original depositado no passado, devendo constar apenas a baixa do passivo. 

## [2026-08-13] - [Feature ID: 191-fix-calculo-diferenca-final]

**Contexto:** O valor disponivel para contas da conciliacao pode ser matematicamente negativo se o fluxo de caixa for excessivo em comparacao ao faturamento do periodo (indicando que a loja esta usando saldo anterior). Ao deduzir as despesas (Juros + Contas) deste saldo disponivel negativo, a formula A - B estava gerando -A - B (somando as dividas em magnitude).

**Regra aprendida:** Em balancos de fechamento de caixa, sempre aplique Math.abs() ao confrontar o saldo/massa disponivel com o montante de despesas, se o objetivo da rubrica final for demonstrar apenas a variacao pura (ex: Diferenca Final = Math.abs(Valor Disp. Contas) - Despesas). Isso alinha o balanco com o que e fisicamente compreensivel (tenho 90k, devo 90k, diferenca 0).

## [2026-08-13] - [Feature ID: 192-fix-ofx-precision]

**Contexto:** Ao importar extratos bancarios (.OFX), o parser genÃ©rico removia o separador decimal caso houvesse apenas um unico digito pos-virgula, por entender que tratava-se de erro ou formatacao ruim. Isso acarretava perdas de milhares de reais (fator 10x) em saldos de matrizes grandes como a Jabaquara.

**Regra aprendida:** Tags monetarias sensiveis a fraude/erro (como <LEDGERBAL> <BALAMT>) nao devem usar extractNumber ou replaces baseados em regex [^0-9]. Devem usar a base nativa (parseFloat) combinada com elevacao matematica a centavos (Math.round(val * 100) / 100) para travar decimais.

## [2026-08-13] - [Feature ID: 193-fix-global-reconciliation]

**Contexto:** O saldo global (Saldo Banco ItaÃ©) na tela de conciliaÃ§Ã£o apresentava valores inflados (ex: 6.5M). Isso ocorreu porque o cÃ¡lculo RPC `get_dashboard_metrics` estava usando a soma das transaÃ§Ãµes (maq + pix) em vez de usar estritamente o `bank_total` original processado de cada banco, alÃ©m de existirem registros corrompidos na base legada antes do fix 192.

**Regra aprendida:** AgregaÃ§Ãµes de saldo bancÃ¡rio `bank_total` globais nÃ£o podem ser reconstruÃ­das por faturamentos indiretos na RPC. A RPC global de dashboard deve sempre fazer JOIN e SUM na tabela `reconciliations` (coluna `bank_total`) que retÃ©m a fonte real da verdade do OFX.

## [2026-08-13] - [Feature ID: 194]-restore-previous-parser-and-fix-decimals-and-math

**Contexto:** Os valores importados do OFX perdiam a precisÃ£o decimal quando terminavam em dÃ­zima de um dÃ­gito (ex: `.9`, `.5`) devido a uma falha na funÃ§Ã£o legada `extractNumber`. AlÃ©m disso, a diferenÃ§a final da conciliaÃ§Ã£o somava sinais negativos em cascata.

**Regra aprendida:** Todo parse de moeda vinda do OFX (TRNAMT, BALAMT, LIMIT) deve ser literalmente convertido usando `parseFloat(` apÃ±s replace de vÃ­rgula, e multiplicado por 100 com `Math.round(*float* * 100)` para garantir centavos exatos. A subtraÃ§Ã£o de diferenÃ§as de caixa deve sempre confrontar a magnitude absoluta (`Math.abs()`) do disponÃ­vel contra as contas.


## [2026-08-14] â€” [Feature ID: 195-fix-na-loja-os-math]

**Contexto:** O card "NA LOJA OS" exibia R$ 1.596.629,29 de forma persistente mesmo apÃ³s limpar as importaÃ§Ãµes diÃ¡rias de pÃ¡tio na UI, porque a tabela `estoque_os_pendente` (Marco Zero legado) estava sendo somada na mÃ©trica de fechamento diÃ¡rio.

**Regra aprendida:** AgregaÃ§Ãµes de fechamento diÃ¡rio (`get_dashboard_metrics` e `calculate_daily_conciliation`) devem refletir estritamente a movimentaÃ§Ã£o corrente/transitÃ³ria do pÃ¡tio (`patio_os`). Dados estÃ¡ticos/passivos de legado (Marco Zero / `estoque_os_pendente`) nÃ£o devem ser somados diretamente aos cards de fechamento diÃ¡rio sem uma segmentaÃ§Ã£o ou card explÃ­cito.

**Risco identificado:** Misturar passivo legado com fluxo de pÃ¡tio ativo faz o usuÃ¡rio acreditar que o botÃ£o de reset/lixeira da importaÃ§Ã£o falhou.

**NÃ£o fazer:** Nunca misturar saldos estÃ¡ticos de tabelas de histÃ³rico Marco Zero diretamente em totais operacionais diÃ¡rios sem um card ou flag exclusivo.


## [2026-08-14] â€” [Feature ID: 196]

**Contexto:** DelegaÃ§Ã£o total dos cÃ¡lculos de conciliaÃ§Ã£o e agregaÃ§Ã£o de saldos das 10 lojas para o PostgreSQL atravÃ©s da RPC `get_daily_reconciliation_summary`.

**Regra aprendida:**
1. Faturamento LÃ­quido do fechamento diÃ¡rio Ã© a soma direta de entradas puras do OFX no dia (`type = 'in'`), e nÃ£o a subtraÃ§Ã£o de faturamentos acumulados passados.
2. ConsolidaÃ§Ã£o de saldos das 10 lojas no PostgreSQL deve usar `DISTINCT ON (store_id) store_id, bank_total FROM reconciliations WHERE date <= p_date ORDER BY store_id, date DESC` para garantir que lojas sem movimentaÃ§Ã£o no dia exato nÃ£o fiquem de fora do somatÃ³rio geral.
3. NÃ£o executar mÃºltiplos `.reduce()` ou mÃºltiplas queries pesadas no client React para mÃ©tricas de conciliaÃ§Ã£o.

**Risco identificado:** A tabela `ofx_transactions` usa colunas `target_date`, `counterpart_name`, `fitid` e valores `'in'`/`'out'`, e nÃ£o `description`, `date` ou `'CREDIT'`.

**NÃ£o fazer:** Nunca calcular consolidaÃ§Ã£o diÃ¡ria agregando transaÃ§Ãµes no client-side nem subtrair faturamento acumulado do mÃªs de entradas diÃ¡rias isoladas.

## [2026-08-14] â€” [Feature ID: 197-odometer-faturamento-and-ui-cleanup]

**Contexto:** O faturamento digitado na conciliaÃ§Ã£o segue a lÃ³gica de "odÃ´metro" (leitura acumulada do mÃªs atÃ© hoje). O faturamento real (lÃ­quido) do dia Ã© a diferenÃ§a incremental: Faturamento LÃ­quido (Dia) = Faturamento Acumulado Hoje (Input) - Faturamento Acumulado Ontem (Ant). O valor digitado hoje Ã© salvo em daily_snapshots.faturamento para servir de base Ant para amanhÃ£.

**Regra aprendida:**
1. Faturamento tipo OdÃ´metro: O input do operador Ã© o acumulado histÃ³rico do mÃªs. O faturamento diÃ¡rio Ã© calculado subtraindo o faturamento_anterior (se > 0).
2. Valor Disp. Contas utiliza diretamente o faturamento lÃ­quido do perÃ­odo (Faturamento LÃ­quido - Fluxo de Caixa).
3. O daily_snapshots.faturamento deve armazenar o valor acumulado bruto (leitura do odÃ´metro) para manter a integridade da cadeia de snapshots.

**Risco identificado:** DigitaÃ§Ã£o acidental de uma leitura inferior Ã  anterior gerando faturamento lÃ­quido negativo. A UI deve exibir em destaque o comparativo com a leitura anterior.

**NÃ£o fazer:** Nunca subtrair receitas individuais de OFX do faturamento sem respeitar a leitura acumulada como verdade mestre do fechamento.

## [2026-08-14] â€” [Feature ID: 198-manual-os-diff-resolution-in-import-modal]

**Contexto:** ResoluÃ§Ã£o manual de OSs ausentes no modal de importaÃ§Ã£o centralizada para ordens antigas do pÃ¡tio que nÃ£o constam no recorte mensal do ERP.

**Regra aprendida:**
1. **Controle Manual Estrito de OSs Ã“rfÃ£s:** O sistema deve detectar no client-side quais OSs ativas no banco de dados nÃ£o vieram no relatÃ³rio importado do mÃªs atual e renderizar uma tabela simples para ediÃ§Ã£o direta de `Valor Total`, `Total Pago` e `Status`.
2. **Sem Baixas MÃ¡gicas / AutomÃ¡ticas:** O operador ajusta os valores e status livremente na tabela.
3. **PersistÃªncia em Lote:** As alteraÃ§Ãµes das OSs ausentes sÃ³ sÃ£o persistidas no Supabase ao confirmar o lote final de importaÃ§Ã£o, garantindo atomicidade e conferÃªncia prÃ©via.

**Risco identificado:** Sobrescrever ou deletar ordens ativas do pÃ¡tio simplesmente porque nÃ£o constam na planilha mensal recente.

**NÃ£o fazer:** Nunca aplicar baixas automÃ¡ticas ou inferir liquidaÃ§Ã£o de ordens sem confirmaÃ§Ã£o explÃ­cita do operador.

## [2026-08-14] â€” [Feature ID: 199-unified-single-flow-import-modal]

**Contexto:** UnificaÃ§Ã£o do fluxo de importaÃ§Ã£o e fechamento diÃ¡rio em um modal Single-Flow de 2 colunas com persistÃªncia centralizada de mapeamentos de lojas no Supabase.

**Regra aprendida:**
1. **PersistÃªncia Centralizada de Mapeamento de Lojas:** Os vÃ­nculos entre os identificadores dos arquivos (aliases) e as lojas cadastradas devem ser persistidos na tabela `store_file_mappings` no Supabase. Isso garante que nunca seja necessÃ¡rio refazer os matches ao trocar de navegador ou sessÃ£o.
2. **Layout em Bloco Ãšnico (Sem Steppers):** A interface de importaÃ§Ã£o e fechamento concentra a dropzone, o reconhecimento de lojas, os inputs globais do dia (odÃ´metro, dinheiro MP, a receber, contas manual) e o grid de OSs Ã³rfÃ£s em uma Ãºnica visualizaÃ§Ã£o em 2 colunas.
3. **PersistÃªncia em Lote:** O fechamento e a importaÃ§Ã£o sÃ£o enviados ao Supabase em um Ãºnico lote atÃ´mico atravÃ©s do botÃ£o "Confirmar e Gravar Fechamento".

**Risco identificado:** Perda de matches de lojas em novos navegadores caso dependa exclusivamente de `localStorage`.

**NÃ£o fazer:** Nunca armazenar mapeamentos de infraestrutura financeira apenas no storage local do browser.

## [2026-08-14] â€” [Feature ID: 200-202-import-reactive-flow-and-marco-zero]

**Contexto:** Central de ImportaÃ§Ãµes em tela cheia com estados reativos, normalizaÃ§Ã£o estrita de constraints de OFX (in/out), carga de Marco Zero e Inspetor JSON de conciliaÃ§Ã£o.

**Regra aprendida:**
1. **NormalizaÃ§Ã£o Estrita em `ofx_transactions`:** A coluna `type` na tabela `ofx_transactions` do PostgreSQL possui a restriÃ§Ã£o `CHECK (type IN ('in', 'out'))`. Qualquer payload deve normalizar entradas e saÃ­das estritamente para `'in'` ou `'out'` e manter o valor `amount` sempre positivo (`Math.abs`).
2. **Jornada de Estados Reativos (Sem Stepper Linear):** A interface de importaÃ§Ã£o deve reagir organicamente Ã  seleÃ§Ã£o de arquivos (Dropzone -> Previews de Dados Brutos -> Logs de Auto-Match -> EdiÃ§Ã£o de OSs Ã“rfÃ£s -> Trava de Inputs Manuais -> Inspetor JSON -> GravaÃ§Ã£o com Barra de Progresso).
3. **Carga de Marco Zero Integrada:** O parser de implantaÃ§Ã£o (`parseMarcoZeroPlanilha` / `process_marco_zero_import`) deve coexistir na central de importaÃ§Ã£o como modo selecionÃ¡vel, sem misturar saldos iniciais com o fechamento diÃ¡rio regular.

**Risco identificado:** ModalizaÃ§Ã£o forÃ§ada espreme dados de alta densidade em telas complexas.

**NÃ£o fazer:** Nunca esconder o payload JSON de conciliaÃ§Ã£o nem comprimir tabelas financeiras de auditoria dentro de popups com rolagem dupla.

## [2026-08-15] â€” [Feature ID: 210 e 211]

**Contexto:** SincronizaÃ§Ã£o do Dashboard macro com a ConciliaÃ§Ã£o e liberaÃ§Ã£o de categorizaÃ§Ã£o livre de transaÃ§Ãµes bancÃ¡rias Ã³rfÃ£s.

**Regra aprendida:**
1. A comparaÃ§Ã£o de faturamento diÃ¡rio com o dia anterior deve subtrair o odÃ´metro do dia D pelo odÃ´metro de D-1, e o odÃ´metro de D-1 pelo de D-2, garantindo comparaÃ§Ã£o maÃ§Ã£ com maÃ§Ã£ (faturamento do dia vs faturamento do dia).
2. TransaÃ§Ãµes de maquininha na Aba 1 de cada loja devem ser confrontadas com os crÃ©ditos de adquirente que entraram no OFX daquela filial (e nÃ£o com a soma total do pÃ¡tio).
3. O modal de justificativa de Ã³rfÃ£os permite digitaÃ§Ã£o livre de qualquer texto de categoria no banco.

**Risco identificado:** Comparar o faturamento diÃ¡rio (ex: R$ 75k) contra o acumulado do odÃ´metro (R$ 369k) gerava uma falsa queda de -79.7%.

**NÃ£o fazer:** Nunca atrelar a totalidade das OSs em aberto de uma loja a uma Ãºnica linha de extrato da adquirente.

## [2026-08-17] â€” [Feature IDs: 214, 215, 216 â€” Extrato AnalÃ­tico por Loja e Marco Zero]

**Contexto:** UnificaÃ§Ã£o do extrato por loja com cÃ¡lculo de despesas por fornecedor e evoluÃ§Ã£o em 3 linhas diÃ¡rias.

**Regra aprendida:**
1. **Marco Zero como Limite MÃ­nimo Universal:** O Marco Zero de 13/08/2026 define a data inicial oficial do sistema. Qualquer relatÃ³rio, extrato ou filtro deve ter como limite mÃ­nimo `2026-08-13`.
2. **Saldo Real vs MovimentaÃ§Ã£o PeriÃ³dica:** O saldo em conta bancÃ¡ria (Saldo da Loja) representa o saldo da conta e Ã© fixo no Ãºltimo OFX importado. As mÃ©tricas de Entradas, SaÃ­das e Resultado LÃ­quido pertencem estritamente ao perÃ­odo filtrado.

## [2026-08-17] â€” [Feature ID: 217]

**Contexto:** ImplementaÃ§Ã£o de auditoria de taxas de maquininhas (MDR) multi-loja e cÃ¡lculo de desvio contratual contra a adquirente (Rede).

**Regra aprendida:** 
- A taxa MDR efetiva real cobrada em cada transaÃ§Ã£o deve ser calculada pela relaÃ§Ã£o entre valor lÃ­quido e valor bruto atualizado:
  $$\text{MDR Efetiva (\%)} = (1 - (\text{valor\_liquido} / \text{valor\_venda\_atualizado})) \times 100$$
- A divergÃªncia contratual ocorre quando a taxa efetiva supera a taxa de referÃªncia do contrato (`pos_fee_contracts`) com tolerÃ¢ncia de atÃ© 0.30\%. CobranÃ§as com delta positivo configuram cobranÃ§a a maior (prejuÃ­zo recuperÃ¡vel).
- Em operaÃ§Ãµes multi-loja (1:N), a adquirente emite extratos com nÃºmero de estabelecimento (PV), CNPJ ou RazÃ£o Social que devem ser mapeados para o `store_id` unificado das 9 filiais.

**Risco identificado:** A adquirente pode aplicar antecipaÃ§Ã£o automÃ¡tica ou descontos operacionais (aluguel de POS) que afetam o valor lÃ­quido da venda se nÃ£o isolados linha a linha.

**NÃ£o fazer:** Nunca calcular o MDR pela mÃ©dia simples das vendas sem ponderar pelo valor bruto transacionado de cada bandeira/modalidade.

## [2026-08-19] - [Feature IDs: 237, 238, 239 - Redesign ResumoDiaPanel, RPC Limpeza Marco Zero, Modal Maquininhas Widescreen]

**Contexto:** TrÃªs specs lanÃ§adas no mesmo commit que evoluem o cockpit financeiro de fechamento diÃ¡rio e corrigem problemas crÃ­ticos de RPC no Supabase.

**Regra aprendida:**

### Feature 237 - Redesign Visual e DescompressÃ£o do Painel de Resumo do Dia (ResumoDiaPanel.tsx)
1. **Grid dos 5 Pilares:** O layout correto Ã© grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 com cards individuais estilo 
ounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-sm.
2. **Sub-linhas alinhadas nos cards:** Card 1 (Saldo Bancos) mostra sub-linhas OFX: R$ ... e + Maq: + R$ ... em layout horizontal (lex justify-between) com ont-mono text-[11px], separados por order-t border-zinc-800/80.
3. **Cockpit de Fechamento em 3 Colunas Balanceadas:** Ã�rea inferior reorganizada em 3 colunas harmoniosas - DinÃ¢mica de Caixa | OperaÃ§Ã£o & DisponÃ­vel | BalanÃ§o do Fechamento & DiferenÃ§a Final.
4. **Tipografia dos pilares:** Valores principais usam 	ext-xl sm:text-2xl font-bold font-mono tracking-tight. Labels usam 	ext-[11px] font-bold text-zinc-400 uppercase tracking-wider.
5. **Ã�cones dos pilares:** Cada card tem um icon badge w-7 h-7 rounded-lg bg-{cor}-500/10 text-{cor}-400 flex items-center justify-center shrink-0 com Ã­cone de 14px.
6. **Cores dos pilares:** Card 1 (Saldo Bancos) = cyan, Card 2 (Dinheiro MP) = emerald, uniformizar com zinc-950 como bg-canvas.

### Feature 238 - RPC Limpeza AtÃ´mica e CorreÃ§Ã£o do Marco Zero
1. **RPC clear_all_financial_data():** FunÃ§Ã£o PL/pgSQL com SECURITY DEFINER que trunca com CASCADE as 20 tabelas transacionais: ofx_transactions, pos_transactions, patio_os, estoque_os_pendente, 
econciliations, 
econciliacoes_triplas, daily_snapshots, dashboard_daily_logs, conciliation_daily_logs, conciliation_matches, manual_transactions, 
eceivables, import_logs, import_batches, cash_registers, 	ransactions, oficina_contas, oficina_os_cache, udit_logs, lerts.
2. **Fix crÃ­tico da RPC process_marco_zero_import:** Erro operator does not exist: date = text Ã© resolvido com _target_date date := p_target_date::date. Sempre fazer casting explÃ­cito de datas em RPCs PL/pgSQL.
3. **Saldo Inicial do Marco Zero (14/08/2026):** Saldo BancÃ¡rio = R$ 170.244,95 | Dinheiro em Caixa = R$ 13.066,00 | A Receber = R$ 10.694,50 | Estoque/OS PÃ¡tio = R$ 107.229,76 | PatrimÃ´nio Inicial = R$ 289.386,12.
4. **marcoZeroParser.ts Atualizado:** Varredura multi-linha da aba SALDO - o nome da loja estÃ¡ em uma linha e o saldo bancÃ¡rio (Saldo Banco ItaÃº:) estÃ¡ na linha seguinte. currentStoreContext Ã© mantido entre linhas para capturar corretamente o saldo de cada loja.
5. **Desbloqueio do seletor de datas:** Hook useAvailableConciliacaoDates indexa automaticamente datas de pos_transactions, patio_os, ofx_transactions, daily_snapshots e o dia atual, garantindo navegaÃ§Ã£o fluida sem travamento.

### Feature 239 - Modal Maquininhas 2XL e Refinamento dos Cards de Lojas
1. **Modal.tsx com suporte a size="2xl":** Adicionado 2xl: "max-w-6xl" (1152px) ao mapa de tamanhos do componente central de modais. Usar size="2xl" para modais de alta densidade de dados.
2. **MaquininhasDetailModal.tsx:** 4 KPIs espaÃ§osos com cards individuais e tipografia de alta fidelidade. Tabela de conciliaÃ§Ã£o tripla expandida sem scroll horizontal, com badges ENTROU, PARCIAL, NÃƒO ENTROU.
3. **Cards das Filiais em conciliacao.index.tsx:** Layout 2-Tier: NÃ­vel 1 (identidade: indicador de conformidade, nome, chip st-XX, badge de maquininha, diferenÃ§a apurada, botÃ£o Raio-X) + NÃ­vel 2 (grid das 6 mÃ©tricas: SALDO BANCOS, MAQUININHA, PIX, NA LOJA OS, PREVISTO, DIFERENÃ‡A).
4. **ResoluÃ§Ã£o de conflitos PostgreSQL:** Sempre verificar sobrecargas (overloads) antes de criar RPCs com mesmo nome mas assinaturas diferentes. Fazer DROP FUNCTION das versÃµes conflitantes antes de recriar.

**Risco identificado:** Conflito de sobrecarga de RPCs no PostgreSQL causa erro de ambiguidade (unction X is not unique) ao invocar via Supabase JS Client.

**NÃ£o fazer:** Nunca criar uma nova versÃ£o de RPC sem primeiro verificar e eliminar sobrecargas existentes com DROP FUNCTION public.nome_rpc(tipos_args).

### Feature 240 - Fix de DevoluÃ§Ãµes da Rede e Janela Temporal de OS no PÃ¡tio (2026-08-19)
1. **DevoluÃ§Ãµes da Rede (Conta a Pagar):** TransaÃ§Ãµes de estorno/chargeback/devoluÃ§Ã£o da maquininha Rede NÃƒO devem ser somadas no Pilar 1 (CartÃµes a Compensar / Saldo Bancos). Elas representam obrigaÃ§Ãµes/saÃ­das para a empresa e sÃ£o obrigatoriamente somadas em `v_subtotal_contas` no Pilar 5 (Contas do Dia / Contas a Pagar).
2. **ClassificaÃ§Ã£o em `pos_transactions`:** Coluna `transaction_type text NOT NULL DEFAULT 'venda' CHECK (transaction_type IN ('venda', 'devolucao'))`. DevoluÃ§Ãµes detectadas por `net_amount < 0`, `gross_amount < 0` ou regex `/devolu|estorn|cancel|chargeback|reversal/`.
3. **Ã‚ncora Temporal em `patio_os` (`last_payment_date`):** Quando uma OS tem pagamentos parciais atualizados em data posterior Ã  data consultada (`last_payment_date > p_date`), a RPC `get_daily_reconciliation_summary` desconsidera o pagamento futuro e mantÃ©m o saldo pendente Ã­ntegro na data histÃ³rica. OSs legadas sem `last_payment_date` (NULL) utilizam `paid_value` atual, mantendo zero regressÃ£o.
4. **Interface Visual:** Pilar 5 em `ResumoDiaPanel.tsx` exibe sub-linha `DevoluÃ§Ãµes REDE: - R$ X` (apenas quando `devolucoes_rede > 0`). `MaquininhasDetailModal.tsx` exibe 5Âº KPI Card `DevoluÃ§Ãµes / Estornos` com badge Pilar 5.

**Risco identificado:** A ausÃªncia de Ã¢ncora temporal no `paid_value` de `patio_os` fazia com que pagamentos recebidos hoje alterassem retroativamente o "Na Loja OS" de dias anteriores. A segregaÃ§Ã£o de devoluÃ§Ãµes sem coluna de tipo infle o saldo do Pilar 1.

**NÃ£o fazer:** Nunca misturar estornos/devoluÃ§Ãµes de POS no somatÃ³rio de vendas lÃ­quidas a compensar. DevoluÃ§Ã£o de POS Ã© passivo/saÃ­da de caixa.

### Feature 241 - RestauraÃ§Ã£o do Design Original dos Cards de Lojas e Painel de Resumo do Dia (2026-08-19)
1. **Design System & Tokens Consistentes:** O padrÃ£o visual do projeto utiliza estritamente as variÃ¡veis CSS do tema (`var(--bg-surface)`, `var(--bg-surface-elevated)`, `var(--border-subtle)`, `var(--text-primary)`, `var(--color-primary)`, `var(--color-accent-teal)`, etc.) e gradientes suaves de cabeÃ§alho (`from-[var(--bg-surface)] to-[var(--bg-surface-elevated)]`). NÃ£o substituir por classes brutas `zinc-900`/`zinc-950` que quebram a consistÃªncia estÃ©tica do produto.
2. **Layout dos Cards de Lojas (`conciliacao.index.tsx`):** Layout horizontal contÃ­nuo clÃ¡ssico em nÃ­vel Ãºnico (`flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6`):
   - Esquerda: Barra lateral de conformidade (`w-2 h-14 rounded-full`), Nome da Loja, Badges `ENTROU` / `NÃƒO ENTROU (+ R$ ...)`, ID.
   - Direita: Envelope escuro contÃ­nuo (`bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5`) com 6 colunas proporcionais (`Saldo Bancos + CartÃµes`, `Maquininha`, `PIX`, `Na Loja OS`, `Previsto`, `DiferenÃ§a`).
   - BotÃ£o flutuante "Raio-X" no canto superior direito visÃ­vel no hover.
3. **Painel de Resumo do Dia (`ResumoDiaPanel.tsx`):**
   - 5 Pilares no grid clÃ¡ssico `grid-cols-2 md:grid-cols-5 gap-4` com cores e whisper dots.
   - Cockpit inferior de 2 colunas: Esquerda (2/3) ConsolidaÃ§Ã£o do Dia + Direita (1/3) DiferenÃ§a Final com badge de tolerÃ¢ncia (Â± R$ 50).
   - Preservadas as devoluÃ§Ãµes da Rede no Pilar 5 e no subtotal de contas da Spec 240.

**Risco identificado:** Tentar "modernizar" o layout alterando containers de 1 nÃ­vel para 2 tiers ou substituindo o design system gera poluiÃ§Ã£o visual e rejeiÃ§Ã£o imediata do usuÃ¡rio.

**NÃ£o fazer:** Nunca quebrar a harmonia horizontal dos cards de filiais nem abandonar as variÃ¡veis de design system do projeto.

## [2026-08-21] â€” [Feature ID: 258-motor-conciliacao-autonoma-zero-touch-com-auto-healing]

**Contexto:** O fechamento de conciliaÃ§Ã£o diÃ¡ria podia apresentar divergÃªncias contÃ¡beis (ex: dinheiro no cofre em data divergente, aportes intercompany de sÃ³cios no extrato OFX sem contrapartida de faturamento, ou efeito cascata de snapshots retroativos). O usuÃ¡rio nÃ£o queria intervir manualmente nem abrir chat de IA; exigiu que o prÃ³prio motor de importaÃ§Ã£o investigasse de forma 100% autÃ´noma e aplicasse as regras contÃ¡beis periciais atÃ© zerar o fechamento.

**Regra aprendida:**
1. **Regra de Auto-Healing em Loop:** A RPC `run_autonomous_reconciliation_loop(p_date)` executa atÃ© 3 ciclos de auto-cura pericial determinÃ­stica:
   - *Assinatura NumÃ©rica de Cofre:* Se o delta bater com um item de `store_cash_vault` com `entry_date < target_date`, reancora a entrada para a data alvo.
   - *Aportes Intercompany de SÃ³cios:* Identifica crÃ©ditos de PIX de sÃ³cios (`DANIEL`, `ROGERIO`, `RAPHAEL`, etc.) nos OFX e auto-cadastra em `daily_revenue_adjustments` (`type = 'aporte'`).
   - *Partidas Dobradas:* Se houver aporte no faturamento sem despesa correspondente no ERP, regulariza a contrapartida de despesa em `daily_manual_bills`.
   - *Integridade de Caixa Anterior:* Garante que o Caixa Anterior seja estritamente o Caixa Atual consolidado do dia Ãºtil anterior.
2. **Zero AlucinaÃ§Ã£o (Constitution Guardrail):** A IA Ã© expressamente proibida de criar transaÃ§Ãµes com valores fictÃ­cios; todo ajuste deve ter como base um `fitid` de OFX real, um registro de cofre real ou um item do contas a pagar.

**Risco identificado:** Executar mutaÃ§Ãµes de auto-cura sem persistÃªncia de log pericial. Mitigado gravando a tabela `reconciliation_audit_logs` com o histÃ³rico completo de deltas (inicial e final) e passos executados.

**NÃ£o fazer:** Nunca exigir que o usuÃ¡rio abra ferramentas manuais para regularizar assimetrias evidentes de extrato ou datas de cofre que a inteligÃªncia pericial consegue deduzir e corrigir deterministicamente.

## [2026-08-21] â€” [Feature ID: 256-importacao-contas-a-pagar-e-conciliacao-aportes-intercompany]

**Contexto:** O valor de Contas a Pagar era inserido de forma manual ou global. Foi implementado o parser analÃ­tico do arquivo `BuscaContasAPagar.xls` (Oficina Inteligente / ERP), mapeamento das 10 filiais pela coluna `Emp`, categorizaÃ§Ã£o inteligente de despesas (SÃ³cios, CartÃ£o/Tech, PeÃ§as, Despesas BancÃ¡rias, Uber OS) e motor de cruzamento triangular de aportes/transferÃªncias entre lojas e sÃ³cios.

**Regra aprendida:**
1. **Estrutura do BuscaContasAPagar.xls:**
   - O arquivo possui linha de cabeÃ§alho variÃ¡vel e linha final de totalizador geral que deve ser ignorada para evitar duplicaÃ§Ã£o do valor total (`195.066,04`).
   - Mapeamento de lojas pela coluna `Emp` normalizada (`MPJorgeBeretta` -> `st-03`, `ReiDoModulo` -> `st-09`, `MPpiraporinha` -> `st-05`, etc.).
   - ExtraÃ§Ã£o de OS em Uber: Recibos com padrÃ£o `UBER OS[0-9]+` tÃªm o nÃºmero da OS extraÃ­do automaticamente para vinculaÃ§Ã£o de custo logÃ­stico ao pÃ¡tio.
2. **Cruzamento Triangular Intercompany:**
   - Quando um sÃ³cio retira de uma loja (despesa do ERP) e aporta em outra loja (crÃ©dito no OFX):
     - Registra o Aporte no Faturamento (`daily_revenue_adjustments`).
     - Vincula a retirada do ERP da loja de origem (`daily_manual_bills`).
     - LanÃ§a o delta residual nÃ£o faturado como despesa manual (`daily_manual_bills` com tag *"Aporte Intercompany Residual"*).
     - Isso zera o fechamento pericial com partidas dobradas transparentes.

**Risco identificado:** Tratar PIX de cliente como aporte de sÃ³cio. Mitigado com cadastro formal e chaves PIX em `intercompany_entities`.

**NÃ£o fazer:** Nunca descartar despesas com nomes novos; sempre aplicar fallback para `outros` e permitir reclassificaÃ§Ã£o em 1 clique no modal.

## [2026-08-21] â€” [Feature ID: 259-exclusao-cirurgica-por-data-e-correcao-exclusao-imports]

**Contexto:** O botÃ£o de exclusÃ£o de lote no histÃ³rico de importaÃ§Ãµes disparava pop-ups de `alert()` nativos bloqueantes e nÃ£o existia mecanismo para resetar apenas os dados de um dia especÃ­fico (como o dia 21) para reprocessamento limpo sem perder o Marco Zero ou o histÃ³rico de outros dias.

**Regra aprendida:**
1. **ExclusÃ£o CirÃºrgica por Data (`purge_daily_financial_data`):**
   - Deve apagar de forma transacional apenas os registros correspondentes ao `p_date` selecionado (snapshots, reconciliaÃ§Ãµes, conciliation_matches, extratos OFX, maquininhas, despesas manuais, logs de auditoria e contas a pagar).
   - NÃ£o toca em lojas, Marco Zero, regras contÃ¡beis nem em outros dias do calendÃ¡rio.
2. **EliminaÃ§Ã£o de `alert()`:** Todas as aÃ§Ãµes de mutaÃ§Ã£o e exclusÃ£o devem sempre usar `toast.success` ou `toast.error` (Sonner) para evitar travar a thread da UI.
3. **Ponto de Retorno (Checkpoint):** Em operaÃ§Ãµes periciais de conciliaÃ§Ã£o, sempre fornecer backup estruturado em JSON com script de restore em 1 comando (`node scratch/restore_checkpoint_day_21.cjs`).

**Risco identificado:** Apagar dados globais por engano se a data for nula. Mitigado com verificaÃ§Ã£o estrita `IF p_date IS NULL THEN RAISE EXCEPTION` na RPC Postgres.

**NÃ£o fazer:** Nunca usar `clear_all_financial_data` para refazer apenas um dia; sempre usar a exclusÃ£o cirÃºrgica por data.

## [2026-08-21] â€” [Feature ID: 260-atualizacao-os-pendentes-e-conciliacao-orfas]

**Contexto:** OSs em aberto no pÃ¡tio nÃ£o eram baixadas automaticamente quando o cliente realizava o pagamento via PIX (extrato OFX) ou cartÃ£o (Rede) em dias posteriores, deixando as transaÃ§Ãµes bancÃ¡rias como Ã³rfÃ£s e a OS como pendente. AlÃ©m disso, o valor analÃ­tico de Contas a Pagar nÃ£o auto-preenchia o campo de entrada do fechamento.

**Regra aprendida:**
1. **Pareamento Inteligente por Saldo Pendente (`auto_match_transactions`):**
   - O motor busca OSs com `status IN ('em_aberto', 'pago_parcial')` da filial correspondente.
   - Prioriza correspondÃªncia com o **Saldo Pendente** (`total_value - paid_value`), depois PIX e depois Valor Total.
   - Atualiza a OS: incrementa `paid_value`, define `status = 'finalizado'`, preenche `closed_at = p_date`, vincula `matched_ofx_id` e gera o registro em `conciliation_matches`.
2. **Auto-Preenchimento de Contas a Pagar:** Quando um lote analÃ­tico de contas a pagar Ã© importado (`results.contasPagarResults`), o formulÃ¡rio de valores manuais Ã© auto-preenchido e sinalizado para evitar digitaÃ§Ã£o manual redundante.
3. **Visibilidade de Estoque em PÃ¡tio:** No Card de OS do preview, exibir sempre os pagamentos do dia e o total ativo de veÃ­culos/serviÃ§os em pÃ¡tio.

**Risco identificado:** Parear uma OS de outra filial ou com valor aproximado incorreto. Mitigado com correspondÃªncia estrita por `store_id` e tolerÃ¢ncia de 0.05 centavos.

**NÃ£o fazer:** Nunca exigir `closed_at >= D-3` para OSs em aberto, pois OSs podem ter sido abertas hÃ¡ mais tempo no pÃ¡tio e quitadas hoje.

## [2026-08-21] â€” [Feature ID: 261-saldo-total-ofx-e-tabela-edicao-os-preview]

**Contexto:** O extrato bancÃ¡rio (OFX) importado contÃ©m o saldo acumulado dos extratos das filiais. O operador precisa conferir o valor consolidado do extrato sob o tÃ­tulo "Saldo Total BancÃ¡rio (OFX)" e poder auditar/editar o Valor Total da OS e o Total Pago diretamente no Step 3 de conferÃªncia da importaÃ§Ã£o.

**Regra aprendida:**
1. **Nomenclatura do Card BancÃ¡rio:** O Card 3 da Central de ImportaÃ§Ã£o exibe "Saldo Total BancÃ¡rio (OFX)", refletindo com transparÃªncia o montante consolidado dos extratos bancÃ¡rios importados e o nÃºmero total de lanÃ§amentos.
2. **EdiÃ§Ã£o Livre de OSs no Preview:** Na etapa 3 do Wizard, disponibilizar tabela pesquisÃ¡vel e paginada de todas as OSs importadas com inputs editÃ¡veis para `total_value`, `paid_value` e seletor de `status`.
3. **PersistÃªncia Reativa dos Valores Editados:** Toda alteraÃ§Ã£o feita pelo usuÃ¡rio recalcula os cards do topo em tempo real e Ã© gravada diretamente nas tabelas `patio_os`, `reconciliations` e `daily_snapshots` ao confirmar o fechamento.

**Risco identificado:** Tentar restringir o extrato bancÃ¡rio por data quando o operador precisa da conferÃªncia global do saldo em conta.

**NÃ£o fazer:** Nunca ocultar ou bloquear a ediÃ§Ã£o de valores de OSs quando o operador detecta que uma ordem de serviÃ§o veio com valor divergente da planilha original.

## [2026-08-21] â€” [Feature ID: 262-restaurar-tabela-exclusiva-os-ausentes-preview]

**Contexto:** Auditoria e fechamento de ordens de serviÃ§o ativas no banco de dados que nÃ£o constam na planilha mensal/diÃ¡ria do pÃ¡tio.

**Regra aprendida:**
1. **DetecÃ§Ã£o Precisa de OSs Ausentes (`detectMissingOs`):** Buscar no Supabase ordens com status ativo (`em_aberto`, `pago_parcial`, `ABERTA`, `PENDENTE`) das filiais mapeadas e cruzar contra todas as OSs contidas nos arquivos importados (`results.osFiles`). As que sobrarem sÃ£o as OSs ausentes.
2. **PersistÃªncia no Fechamento:** Ao confirmar o fechamento, as OSs ausentes modificadas pelo operador sÃ£o atualizadas diretamente em `patio_os` com `total_value`, `paid_value`, `status` e `closed_at: targetDate` caso finalizadas.

**Risco identificado:** Deixar OSs Ã³rfÃ£s no pÃ¡tio indefinidamente se o relatÃ³rio do mÃªs deixar de trazÃª-las.

**NÃ£o fazer:** Nunca descartar silenciosamente OSs que deixaram de vir na planilha sem dar a chance ao operador de decidir o status final.

## [2026-08-21] â€” [Feature ID: 263-tabela-unificada-os-preview-com-filtros-e-edicao-livre]

**Contexto:** UnificaÃ§Ã£o das ordens de serviÃ§o do dia (planilhas de pÃ¡tio importadas) com as ordens em aberto de dias anteriores (banco de dados) para auditoria e conferÃªncia contÃ¡bil antes do fechamento.

**Regra aprendida:**
1. **UnificaÃ§Ã£o no Preview:** Agrupar `results.osFiles` e `missingOsList` em `allPreviewOsList` identificando a origem (`origin: 'imported' | 'missing'`).
2. **MutaÃ§Ã£o ImutÃ¡vel Reativa:** A ediÃ§Ã£o de qualquer OS (da planilha ou do banco) atualiza imediatamente os cÃ¡lculos globais de recebimentos do dia (`totalOs`), estoque em pÃ¡tio (`totalPatioEstoqueGlobal`) e os saldos individuais de cada filial.
3. **PersistÃªncia Integral:** Ao confirmar o fechamento, as OSs importadas sÃ£o gravadas em lote e quaisquer OSs ausentes modificadas sÃ£o atualizadas diretamente na tabela `patio_os`.

**Risco identificado:** DessincronizaÃ§Ã£o entre as OSs modificadas na UI e os reducers de faturamento/estoque das filiais.

**NÃ£o fazer:** Nunca separar as OSs em tabelas desconexas sem permitir a conferÃªncia consolidada da movimentaÃ§Ã£o do dia.

## [2026-08-24] â€” [Feature ID: 264 & 265]

**Contexto:** DiagnÃ³stico de Contas a Pagar e impacto de despesas manuais avulsas (`daily_manual_bills`) na DiferenÃ§a Final.

**Regra aprendida:**
- `Subtotal Contas a Cobrir = Contas Base (Planilha) + Despesas Manuais Avulsas (daily_manual_bills) + Juros Rede`.
- Ao cadastrar uma despesa avulsa em `daily_manual_bills`, o total de contas a pagar aumenta, aumentando a necessidade de cobertura operacional e ampliando o dÃ©ficit de fechamento se o faturamento nÃ£o subir.
- Retiradas de SÃ³cios ou aportes que explicam divergÃªncias de caixa devem ser tratados como Ajustes de Faturamento (`daily_revenue_adjustments`) ou Justificativas, e nÃ£o como contas a pagar a fornecedores.

**Risco identificado:** Confundir despesa operacional a pagar com retirada/ajuste patrimonial.

**NÃ£o fazer:** NÃ£o somar despesas manuais duas vezes se a planilha importada jÃ¡ contÃ©m a conta em sua totalidade.

## [2026-08-24] â€” [Feature ID: 266 & 267]

**Contexto:** Alinhamento de conciliaÃ§Ã£o com Excel oficial, Ã¢ncora de dias Ãºteis anteriores, sincronizaÃ§Ã£o granular de OSs e deduplicaÃ§Ã£o de maquininhas.

**Regra aprendida:**
- A conciliaÃ§Ã£o de segunda-feira deve sempre ancorar na Ãºltima sexta-feira com fechamento consolidado (`caixa_atual > 0`), ignorando rascunhos vazios de fim de semana.
- Saldos bancÃ¡rios negativos do ItaÃº devem ser deduzidos na apuraÃ§Ã£o do Caixa Atual LÃ­quido (`Caixa Atual = PatrimÃ´nio Bruto - Negativo ItaÃº`).
- TransaÃ§Ãµes de POS (Rede) devem possuir deduplicaÃ§Ã£o determinÃ­stica (`dedup_hash`) para evitar que relatÃ³rios importados em duplicidade gerem falsos alertas de "nÃ£o entrou".
- OSs do pÃ¡tio que estavam ativas no dia anterior e nÃ£o constam no arquivo .xls de hoje devem ser auditadas pelo operador no Step 3 antes da consolidaÃ§Ã£o.

**Risco identificado:** Reprocessamento de arquivos gerando duplicaÃ§Ã£o em `pos_transactions` ou rascunhos de fim de semana quebrando o carry-over.

**NÃ£o fazer:** Nunca assumir que `date < target_date` trarÃ¡ o dia Ãºtil correto sem verificar se o fechamento anterior foi consolidado (`caixa_atual > 0`).

## 2026-08-26 — [Feature ID: 292]

**Contexto:** Desacoplamento do ciclo temporal de adquirentes (Rede/Cielo/Stone), correção de divergência de ~R$ 200 no extrato bancário de 26/08 e eliminação de erros HTTP 400.

**Regra aprendida:**
- Vendas da maquininha em $D_0$ (`rede_liquido`) representam o Regime de Competência e entram 100% no Ativo de Cartões a Compensar (Pilar 1).
- Créditos bancários da Rede que caem hoje ($D_0$) no extrato representam a liquidação financeira de $D_{-1}$ e já compõem o saldo em conta corrente (`saldo_bancos_ofx`).
- **NUNCA subtrair créditos bancários de hoje das vendas de cartão de hoje** no motor de conciliação diária intra-dia (`nao_entrou = rede_liquido`).
- Débitos bancários (saídas) não devem ter botão "Justificar" para impedir que contas pagas sejam categorizadas indevidamente como receitas avulsas.
- Créditos de lotes de adquirentes não devem ser vinculados a OSs individuais pelo operador (evita corrupção da base e fadiga operacional); justificativas são restritas a tarifas e aluguéis de terminais.

**Risco identificado:** Tentar reconciliar o lote líquido da adquirente diretamente contra ordens de serviço brutas (com MDR descontada) causa 87% de erro humano e distorce o Caixa Atual ($G21$).

**Não fazer:** Nunca reintroduzir cláusulas hardcoded por filial como `s.id NOT IN ('st-01', 'st-05')`. O algoritmo deve ser 100% agnóstico e universal.

## 2026-08-26 — [Feature ID: 294]

**Contexto:** Duplicação de Contas a Pagar ao importar despesas (soma dupla de `daily_manual_bills` + `snapshot.contas_a_pagar`) e exibição de `R$ NaN` em Maquininha/PIX no fechamento das 10 filiais.

**Regra aprendida:**
- **Contas a Pagar (Deduplicação Canônica):** A tabela `daily_manual_bills` é a **fonte oficial da verdade** para as contas do dia. Se existirem registros em `daily_manual_bills`, `contas_manual := SUM(daily_manual_bills)`. O campo `snapshot.contas_a_pagar` atua apenas como fallback quando não há registros granulares. NUNCA some `snapshot.contas_a_pagar` junto com `daily_manual_bills`.
- **Métricas por Filial & Anti-NaN:** No objeto de cada loja em `summary.stores`, a RPC deve retornar explicitamente `maquininha`, `rede_liquido`, `pix`, `pix_os`, `previsto_ofx` e `diferenca`. No frontend React, sempre utilize operadores de coalescência nula (`log.maquininha ?? log.rede_liquido ?? 0`) antes de passar valores para `<AnimatedNumber>`.

**Risco identificado:** A importação de despesas grava tanto os registros detalhados na tabela quanto atualiza o total no snapshot; consultas que somavam ambas as fontes geravam distorção de 100% no subtotal de contas.

**Não fazer:** Nunca some um acumulador em snapshot junto com as linhas detalhadas da tabela que geraram esse acumulador.

## 2026-08-26 — [Feature ID: 295]

**Contexto:** Dinheiro no cofre (`store_cash_vault`) não aparecia na filial correta na tabela por loja, e o Saldo Consolidado por filial não somava os três componentes da conta.

**Regra aprendida:**
- **Saldo Consolidado por Filial:** O campo `saldo_banco` no array `stores` deve representar o saldo patrimonial completo da loja:
  $$\text{Saldo Consolidado} = \text{Extrato OFX (Itaú)} + \text{Dinheiro no Cofre} + \text{Maquininhas (A Compensar)}$$
- **Agregação de Cofre (`store_cash_vault`):** Deve ser agrupada por `store_id` na RPC para popular `dinheiro_loja` e a lista de `vault_entries`, viabilizando o botão "Dar Baixa" em depósitos pendentes na filial correta (ex: Santo André - HD `st-08`).
- **Consistência de Totais:** O total consolidado da tabela do modal (`SaldoBancosDetailModal`) deve ser matematicamente idêntico ao valor exibido no card do topo ("SALDO BANCOS + DINHEIRO").

**Não fazer:** Nunca deixe campos de agregação por loja hardcoded como `0` quando já existe a tabela física de suporte no banco de dados.

## 2026-08-26 — [Feature ID: 297]

**Contexto:** Falsa diferença de R$ 5k+ no fechamento por filial e descontinuidade de justificativas no extrato.

**Regra aprendida:**
- **Diferença Real por Filial:** A divergência de uma loja é calculada **estritamente pela soma de lançamentos bancários órfãos/pendentes** do dia:
  $$\text{Diferença da Filial} = \sum \text{OFX sem OS, sem Lote Rede D-1 e sem Justificativa}$$
  Vendas de maquininha de D0 são **A COMPENSAR** (entram no saldo do caixa, mas caem no banco em D+1/D+30) e NUNCA devem ser subtraídas do extrato de hoje.
- **Sincronização de Justificativas:** O hook `useCategorizeOrphan` deve atualizar tanto `ofx_transactions` quanto `transactions` e `pos_transactions`. Ao justificar, o item ganha `manual_category` e a pendência da filial zera imediatamente.

**Não fazer:** Nunca subtraia vendas de maquininha de hoje das entradas bancárias de hoje para calcular a diferença de uma loja.

## 2026-08-27 — [Feature ID: 298]

**Contexto:** Equalização canônica dos saldos das 10 filiais e fechamento do Caixa Atual com a Planilha Oficial (`CONCILIAÇÃO 2608.xlsx`).

**Regra aprendida:**
- **Composição Canônica de Saldo por Filial:**
  $$\text{Saldo Consolidado da Loja} = \text{Saldo OFX Puro} + \text{Cartões A Compensar} + \text{Dinheiro no Cofre}$$
- **Prevenção de Double-Dipping em Saldos Devedores:** Os saldos negativos de contas correntes (ex: Planalto -R$ 3.845,74 e Santo André -R$ 12.097,78, totalizando -R$ 15.943,52) já são computados no somatório algébrico das contas Itaú em $\mathbb{R}$. A métrica `saldo_negativo_itau` é mantida estritamente para exibição de KPI/alerta no dashboard, nunca devendo ser deduzida uma segunda vez no cálculo do Caixa Atual.
- **Caixa Atual Consolidado:** Resulta rigorosamente em **R$ 151.642,60** através da soma dos 4 Pilares ($P_1$: Bancos + Cofres + Cartões = R$ 50.794,86, $P_2$: Dinheiro MP = R$ 15.323,00, $P_3$: A Receber = R$ 8.349,67, $P_4$: Na Loja OS = R$ 77.525,07).

**Não fazer:** Nunca subtraia `saldo_negativo_itau` do Caixa Atual se `v_saldo_bancos` já inclui os saldos devedores em sua soma algébrica.

## 2026-08-27 — [Feature ID: 299]

**Contexto:** Blindagem definitiva de snapshots fechados contra mutações retroativas e restauração do encadeamento de fechamento diário.

**Regra aprendida:**
- **Imutabilidade de Snapshots Fechados:** Dias com `is_closed = true` NUNCA devem ser recalculados dinamicamente via queries de `patio_os` ou `ofx_transactions`. A RPC `get_daily_reconciliation_summary` deve fazer curto-circuito e retornar diretamente os dados congelados do snapshot.
- **Ancoragem Temporal:** O `caixa_anterior` do dia D+1 lê diretamente o `caixa_atual` do snapshot de D. O congelamento de 26/08 em R$ 151.642,60 alimenta perfeitamente o dia 27/08.

**Não fazer:** Nunca permita que mutações em OSs de hoje recalculem o pátio de dias passados que já foram fechados.

## [2026-08-30] — [Feature ID: 314] Teste E2E e Fechamento da Conciliação com Arquivos Reais de 27-08
**Contexto:** Validação ponta a ponta no localhost:8080 do Wizard de Ingestão e Conciliação com os 27 arquivos reais de 27/08/2026.
**Regra aprendida:**
- **Segregação de 5 Pilares no Fechamento:** Ativos Totais (Saldo Positivo + Dinheiro MP + A Receber + Pátio OS) subtraído do Cheque Especial compõem o Caixa Atual. O Fluxo de Caixa (Caixa Hoje - Caixa Ontem) deduzido do Faturamento do Dia deve cobrir exatamente o Subtotal de Contas a Pagar + Juros de Maquininha (Tolerância $\pm$ R$ 50,00).
- **Tratamento de Não-Faturamento:** Transferências entre filiais (Intercompany) e aportes dos sócios NUNCA devem somar ao faturamento contábil da empresa, recebendo a anotação `[NÃO SOMAR] [Apenas Conciliar]`.
**Risco identificado / Anti-pattern:** Nunca permitir que liquidações de adquirentes ou rendimentos bancários apareçam no painel de justificativas manuais de não-faturamento.
