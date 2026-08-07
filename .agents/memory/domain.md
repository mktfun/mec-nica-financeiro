## [2026-08-03] â€” [Feature ID: 059-oficina-bot-automation]

**Contexto:** SincronizaÃ§Ã£o automÃ¡tica das Ordens de ServiÃ§o (OS) e Contas a Pagar do Oficina Inteligente via Bot.

**Regra aprendida:** Cache Condicional. As OSs nÃ£o finalizadas mudam constantemente e nÃ£o devem ser cacheadas permanentemente. Ao fazer cache, sÃ³ considere o cache vÃ¡lido se o status da OS for `FINALIZADO` (ou equivalente). Caso contrÃ¡rio, a OS deve ser buscada do sistema ao vivo (com timeout expandido) para garantir que valores faturados, peÃ§as e descriÃ§Ãµes estejam corretos e em sync com o fechamento do dia.

**Risco identificado:** Armazenar no banco de dados local uma OS "EM ANDAMENTO" e mostrÃ¡-la para a IA ou nos dashboards sem validar sua versÃ£o viva, gerando divergÃªncia na conciliaÃ§Ã£o.

**NÃ£o fazer:** Nunca armazenar OS em cache infinito sem verificar se ela jÃ¡ foi dada como encerrada.

## [2026-08-03] â€” [Feature ID: 069-faturamento-recebimentos]

**Contexto:** DefiniÃ§Ã£o da fonte de verdade para a mÃ©trica de "Faturamento DiÃ¡rio".

**Regra aprendida:** O Faturamento nunca deve ser derivado do valor bruto das Ordens de ServiÃ§o (`total_value` em `patio_os` ou `import_logs`). Na regra de negÃ³cios deste cliente, "Faturamento" significa **Recebimento de Caixa Real** (Dinheiro que entrou). Portanto, a mÃ©trica oficial de Faturamento deve SEMPRE espelhar as entradas financeiras da conciliaÃ§Ã£o (`transactions` onde `type = 'in'`).

**Risco identificado:** Basear relatÃ³rios financeiros (Macro Chart, Cards e Tabelas) em `total_value` das OSs causa divergÃªncia contÃ¡bil monstruosa com os recebimentos reais via Pix e Maquininha (Rede), invalidando o Dashboard.

**NÃ£o fazer:** Nunca utilize `patio_os` nem `import_logs` para somar "Faturamento". Faturamento = Soma de Entradas (`transactions` type='in') + LanÃ§amentos Manuais (`faturamento_outros_valor`).

## [2026-08-03] â€” [Feature ID: 072-bootstrap-legacy-data]

**Contexto:** O primeiro dia de uso de um sistema (Dia 1) nÃ£o tem dados do Dia 0 no banco, quebrando comparaÃ§Ãµes percentuais e cÃ¡lculos de Fluxo de Caixa (que dependem de `Saldo Atual - Saldo Anterior`).
**Regra aprendida:** "SÃ­ndrome do Sistema Virgem". Sempre forneÃ§a uma rota administrativa de Bootstrap (`/bootstrap`) para injeÃ§Ã£o manual das mÃ©tricas base do "Dia Zero" (Saldo BancÃ¡rio, Faturamento, Contas). Ã‰ a forma mais robusta de plugar dados legados do dia anterior sem escrever parsers frÃ¡geis para planilhas `.xlsx` antigas.
**Risco identificado:** MatemÃ¡tica do dashboard (`% vs ANTERIOR`) deve olhar para `faturamento_outros_valor` do dia anterior (`dateAnterior`), e nÃ£o apenas para transaÃ§Ãµes transacionadas, senÃ£o o painel nunca considerarÃ¡ os valores do Bootstrap.

## [2026-08-04] — [Feature ID: 075-fix-conciliation-bugs]

**Contexto:** Correção de cálculo no painel de Conciliação Global onde o Saldo Banco exibia R$ 17 milhões (sendo o saldo real de R$ 1.7 milhão multiplicado por 10 lojas).

**Regra aprendida:** O saldo bruto de uma conta bancária (<LEDGERBAL> do OFX) NÃO deve ser somado iterativamente para todas as filiais/lojas se elas compartilharem o mesmo arquivo corporativo ou matriz (Holding). Fazer o .reduce((acc, val) => acc + val.rawBalance) multiplica o caixa matriz N vezes. Para derivar o saldo global justo, utilize a soma rigorosa das transações isoladas de cada filial (ankInDate / soma de .in) para espelhar a arrecadação da ponta, garantindo que o Painel Global represente a soma fiel dos caixas isolados.

**Risco identificado:** Calcular métricas financeiras globais somando diretamente campos <LEDGERBAL> persistidos por filial sem um deduplicador estrito de Conta/Banco causa aberrações monetárias milionárias.

**Não fazer:** Nunca some saldos bancários estáticos (ank_total, awBalance, <LEDGERBAL>) iterando as lojas caso não exista segregação de Conta Corrente no parser. Para totais globais, prefira a soma determinística de fluxo (entradas e saídas).

## [2026-08-04] — [Feature ID: 076]

**Contexto:** Correção de Pátio Pendente retroativo (Na Loja OS) e erro de 93k de caixa.

**Regra aprendida:** Se uma tela exibe o estado consolidado de um dia passado (como Pátio Pendente), NUNCA calcule on-the-fly usando tabelas LIVE (como patio_os). O valor DEVE ser gravado em um snapshot (econciliations). Além disso, rotinas de Bootstrap (Carga de Dia Zero) são responsáveis por popular OBRIGATORIAMENTE o Caixa Atual com a SOMA TOTAL de todos os saldos herdados. Se o Bootstrap salvar Caixa Atual = 0, o cálculo de Fluxo de Caixa (Caixa Hoje - Caixa Ontem) fará o caixa inteiro entrar no fluxo, gerando rombo artificial no Disponível.

**Risco identificado:** Achar que tabelas operacionais live refletem o passado.

**Não fazer:** Fazer upsert no Daily Snapshots no Bootstrap sem popular explicitamente o caixa_atual com todos os dinheiros reais informados na tela.

## [2026-08-04] - [Feature ID: 077]

**Contexto:** Automação de Contas a Pagar e Outros Faturamentos via OFX.

**Regra aprendida:** O cálculo de Despesas (Contas a Pagar) e Faturamento Avulso (Outros Faturamentos) deixou de ser manual no Importador. A fonte da verdade agora é 100% o OFX Global. 'Contas a Pagar' é a soma direta de TODAS as transações de saída (type='out') do extrato. 'Outros Faturamentos' é a soma das entradas (type='in') deduzindo as parcelas identificadas como transferências PIX das Ordens de Serviço (OS). O front-end usa o hook \useConciliacaoResumo\ para calcular esses globais on-the-fly.

**Risco identificado:** Achar que esses valores vêm do snapshot (daily_snapshots.contas_a_pagar) na tela de conciliação diária. A tela de conciliação atualiza esses totais dinamicamente no componente e SÓ GRAVA no snapshot quando o usuário aperta o botão de Gravar Fechamento.

**Não fazer:** Inserir inputs manuais na tela de importação para despesas que já estão mapeadas e documentadas no Extrato Bancário.

## [2026-08-04] - [Feature ID: 078]

**Contexto:** Pátio Pendente (Na Loja OS) colapsando para 0 ao trocar de dia.

**Regra aprendida:** O Pátio Pendente de uma oficina atua como uma conta corrente de devedores. Como as integrações ao vivo ('patio_os') costumam não ter OSs legadas antigas (que só constam em controles do Excel), o 'Na Loja OS' para o dia corrente NUNCA deve ser derivado puramente da tabela viva se ela estiver incompleta. Ao carregar as métricas do dia, o sistema DEVE usar uma query de fallback (ex: '.lte(date).order(date, desc)') para herdar e carregar o 'na_loja_os' do último snapshot conhecido daquela loja, preservando assim o valor da dívida legada até que o usuário grave explicitamente o fechamento do novo dia.

**Risco identificado:** Calcular dívidas históricas acumuladas ('Na Loja OS') baseando-se apenas em integrações novas ('patio_os') gera um falso positivo de R$ 0,00, quebrando a conciliação.

**Não fazer:** Nunca consultar o Pátio Pendente para o dia corrente usando '.eq(date)' estrito sem fallback para o último snapshot válido.

## [2026-08-05] - [Feature ID: 081-stop-maquininha-duplication]

**Contexto:** A tela do Extrato Bancário por loja exibia todas as transações da Rede (maquininha) duplicadas. O Faturamento Atual no Dashboard estava dobrado em relação ao valor real. O bug ocorria porque o CentralImportWizard.tsx injetava os dados da Rede (XLSX) na tabela 	ransactions junto com o OFX — mas o OFX já continha os lançamentos reais de recebimento da Rede quando o dinheiro entrou na conta.

**Regra aprendida:** A tabela 	ransactions é exclusivamente o Livro-Razão (Ledger) do Extrato Bancário. Apenas transações parseadas do arquivo OFX devem ser inseridas nela. Vendas da Maquininha e relatórios da Rede são Recebíveis (tabela eceivables), não transações bancárias realizadas. NUNCA insira na 	ransactions dados oriundos de planilhas da Rede ou Maquininha — esses documentos representam expectativas de recebimento, não entradas bancárias confirmadas.

**Risco identificado:** O useDashboardV2 soma todas as 	ransactions onde 	ype = 'in' para calcular Faturamento. Se a Rede for inserida em 	ransactions, o Faturamento dobra (OFX + Rede = 2x a mesma entrada).

**Não fazer:** Nunca faça 	xsToInsert.push(...) com dados de esults.maquininhaItems ou esults.redeResults. Esses itens devem ir APENAS para eceivables via savePatioOsAndReceivables.


## [2026-08-06] Regras de Parsing de OS e REDE (Feature 103)
- **Oficina Inteligente (OS):** O Excel exporta a coluna de pagamento como 'Total Pagto na OS'. O parser deve sempre proteger o índice de \	otalValue\ para não ser engolido por \Pagto\, e deve buscar por \'pagto'\ ou \'pgto'\ para mapear corretamente o \paid_value\. Se o \paid_value\ for 0 indevidamente, o motor de conciliação aborta o vínculo com a REDE, julgando a OS \em_aberto\.
- **REDE:** Arquivos de Maquininha REDE (\Extrato Simples Conferência\) não têm colunas perfeitamente indexadas. O parser deve SEMPRE ler dinamicamente (usando \indIndex\) no cabeçalho (geralmente linha 1 ou 2) buscando \'valor bruto'\, \'valor líquido'\, \'estabelecimento'\ e \'meio de pagamento'\.
# #   [ 2 0 2 6 - 0 8 - 0 6 ]   R e g r a s   d e   M a p e a m e n t o   d e   L o j a s   ( F e a t u r e   1 0 5 ) 
 -   * * U I : * *   N u n c a   m i s t u r e   o   m a p e a m e n t o   d e   O r d e n s   d e   S e r v i o   ( q u e   u s a m   o   n o m e   d a   p l a n i l h a )   c o m   o   m a p e a m e n t o   d a   R e d e / M a q u i n i n h a   ( q u e   u s a m   c a m p o s   d e   e s t a b e l e c i m e n t o )   n a   m e s m a   l i s t a .   A   U I   d e v e   s e m p r e   s e p a r a r   v i s u a l m e n t e   p o r   ' O S   ( P t i o ) '   e   ' M a q u i n i n h a s   ( R e d e ) ' . 
 -   * * P a r s e r   R e d e : * *   A   c o l u n a   ' n m e r o   d o   e s t a b e l e c i m e n t o '   v e m   a n t e s   d e   ' n o m e   d o   e s t a b e l e c i m e n t o '   e m   p l a n i l h a s   d a   R e d e .   S e   o   p a r s e r   u s a r   u m   ' i n c l u d e s '   g e n r i c o   p a r a   b u s c a r   o   n d i c e   d a   l o j a ,   e l e   i r   e n g o l i r   o   n m e r o   ( 1 0 1 4 2 2 9 9 7 )   e m   v e z   d o   n o m e   ( ' H D   M P ' ) .   S E M P R E   u s e   u m a   c h e c a g e m   r e s t r i t a   q u e   n e g u e   ' n m e r o '   a o   b u s c a r   p e l o   n o m e ,   o u   u s e   m a t c h i n g   e x a t o .  
 
## [2026-08-07] - [Feature ID: 118]

**Contexto:** CorreÃ§Ã£o dos cÃ¡lculos avanÃ§ados do dashboard (fluxo de caixa absurdo, falta de somatÃ³rio da conta global, juros genÃ©ricos e contas evaporando).

**Regra aprendida:** 
- O cÃ¡lculo de fluxo de caixa nunca deve depender cegamente de p_date - 1 day porque finais de semana ou dias nÃ£o logados causam lacunas e resultam num fluxo de caixa totalmente distorcido (ex: R$ +180.000). Use sempre o Ãºltimo saldo vÃ¡lido antes da data atual (ORDER BY date DESC LIMIT 1).
- Saldos bancÃ¡rios globais salvos na reconciliaÃ§Ã£o devem ser agrupados a nÃ­vel de tabela econciliations e nÃ£o limitados aos IDs existentes na tabela stores, para garantir que saldos de contas globais (store_id IS NULL) sejam incluÃ­dos.
- Na extraÃ§Ã£o de taxas do parseamento, deve-se sempre procurar por colunas explÃ­citas (Taxa, Juros, Tarifa) antes de inferir uma diferenÃ§a bruta-lÃ­quida genÃ©rica que pode ser inflada por outros componentes como antecipaÃ§Ã£o.

**Risco identificado:** A matemÃ¡tica de contas globais e fluxos dependia de correspondÃªncias perfeitas contÃ­nuas, sem prever que o cliente pudesse fazer importaÃ§Ã£o com chave GLOBAL no frontend que mapeia para 
ull no backend.

**NÃ£o fazer:** Nunca restrinja relatÃ³rios de caixa a source = 'ofx' quando 	ype = 'out', pois isso mata registros manuais ou de planilhas. Use apenas a intenÃ§Ã£o de dÃ©bito (	ype = 'out').
