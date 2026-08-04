## [2026-08-03] ‚Äî [Feature ID: 059-oficina-bot-automation]

**Contexto:** Sincroniza√ß√£o autom√°tica das Ordens de Servi√ßo (OS) e Contas a Pagar do Oficina Inteligente via Bot.

**Regra aprendida:** Cache Condicional. As OSs n√£o finalizadas mudam constantemente e n√£o devem ser cacheadas permanentemente. Ao fazer cache, s√≥ considere o cache v√°lido se o status da OS for `FINALIZADO` (ou equivalente). Caso contr√°rio, a OS deve ser buscada do sistema ao vivo (com timeout expandido) para garantir que valores faturados, pe√ßas e descri√ß√µes estejam corretos e em sync com o fechamento do dia.

**Risco identificado:** Armazenar no banco de dados local uma OS "EM ANDAMENTO" e mostr√°-la para a IA ou nos dashboards sem validar sua vers√£o viva, gerando diverg√™ncia na concilia√ß√£o.

**N√£o fazer:** Nunca armazenar OS em cache infinito sem verificar se ela j√° foi dada como encerrada.

## [2026-08-03] ‚Äî [Feature ID: 069-faturamento-recebimentos]

**Contexto:** Defini√ß√£o da fonte de verdade para a m√©trica de "Faturamento Di√°rio".

**Regra aprendida:** O Faturamento nunca deve ser derivado do valor bruto das Ordens de Servi√ßo (`total_value` em `patio_os` ou `import_logs`). Na regra de neg√≥cios deste cliente, "Faturamento" significa **Recebimento de Caixa Real** (Dinheiro que entrou). Portanto, a m√©trica oficial de Faturamento deve SEMPRE espelhar as entradas financeiras da concilia√ß√£o (`transactions` onde `type = 'in'`).

**Risco identificado:** Basear relat√≥rios financeiros (Macro Chart, Cards e Tabelas) em `total_value` das OSs causa diverg√™ncia cont√°bil monstruosa com os recebimentos reais via Pix e Maquininha (Rede), invalidando o Dashboard.

**N√£o fazer:** Nunca utilize `patio_os` nem `import_logs` para somar "Faturamento". Faturamento = Soma de Entradas (`transactions` type='in') + Lan√ßamentos Manuais (`faturamento_outros_valor`).

## [2026-08-03] ‚Äî [Feature ID: 072-bootstrap-legacy-data]

**Contexto:** O primeiro dia de uso de um sistema (Dia 1) n√£o tem dados do Dia 0 no banco, quebrando compara√ß√µes percentuais e c√°lculos de Fluxo de Caixa (que dependem de `Saldo Atual - Saldo Anterior`).
**Regra aprendida:** "S√≠ndrome do Sistema Virgem". Sempre forne√ßa uma rota administrativa de Bootstrap (`/bootstrap`) para inje√ß√£o manual das m√©tricas base do "Dia Zero" (Saldo Banc√°rio, Faturamento, Contas). √â a forma mais robusta de plugar dados legados do dia anterior sem escrever parsers fr√°geis para planilhas `.xlsx` antigas.
**Risco identificado:** Matem√°tica do dashboard (`% vs ANTERIOR`) deve olhar para `faturamento_outros_valor` do dia anterior (`dateAnterior`), e n√£o apenas para transa√ß√µes transacionadas, sen√£o o painel nunca considerar√° os valores do Bootstrap.

## [2026-08-04] ó [Feature ID: 075-fix-conciliation-bugs]

**Contexto:** CorreÁ„o de c·lculo no painel de ConciliaÁ„o Global onde o Saldo Banco exibia R$ 17 milhıes (sendo o saldo real de R$ 1.7 milh„o multiplicado por 10 lojas).

**Regra aprendida:** O saldo bruto de uma conta banc·ria (<LEDGERBAL> do OFX) N√O deve ser somado iterativamente para todas as filiais/lojas se elas compartilharem o mesmo arquivo corporativo ou matriz (Holding). Fazer o .reduce((acc, val) => acc + val.rawBalance) multiplica o caixa matriz N vezes. Para derivar o saldo global justo, utilize a soma rigorosa das transaÁıes isoladas de cada filial (ankInDate / soma de .in) para espelhar a arrecadaÁ„o da ponta, garantindo que o Painel Global represente a soma fiel dos caixas isolados.

**Risco identificado:** Calcular mÈtricas financeiras globais somando diretamente campos <LEDGERBAL> persistidos por filial sem um deduplicador estrito de Conta/Banco causa aberraÁıes monet·rias milion·rias.

**N„o fazer:** Nunca some saldos banc·rios est·ticos (ank_total, awBalance, <LEDGERBAL>) iterando as lojas caso n„o exista segregaÁ„o de Conta Corrente no parser. Para totais globais, prefira a soma determinÌstica de fluxo (entradas e saÌdas).

## [2026-08-04] ó [Feature ID: 076]

**Contexto:** CorreÁ„o de P·tio Pendente retroativo (Na Loja OS) e erro de 93k de caixa.

**Regra aprendida:** Se uma tela exibe o estado consolidado de um dia passado (como P·tio Pendente), NUNCA calcule on-the-fly usando tabelas LIVE (como patio_os). O valor DEVE ser gravado em um snapshot (econciliations). AlÈm disso, rotinas de Bootstrap (Carga de Dia Zero) s„o respons·veis por popular OBRIGATORIAMENTE o Caixa Atual com a SOMA TOTAL de todos os saldos herdados. Se o Bootstrap salvar Caixa Atual = 0, o c·lculo de Fluxo de Caixa (Caixa Hoje - Caixa Ontem) far· o caixa inteiro entrar no fluxo, gerando rombo artificial no DisponÌvel.

**Risco identificado:** Achar que tabelas operacionais live refletem o passado.

**N„o fazer:** Fazer upsert no Daily Snapshots no Bootstrap sem popular explicitamente o caixa_atual com todos os dinheiros reais informados na tela.
