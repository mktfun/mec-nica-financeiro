## [2026-08-03] — [Feature ID: 059-oficina-bot-automation]

**Contexto:** Sincronização automática das Ordens de Serviço (OS) e Contas a Pagar do Oficina Inteligente via Bot.

**Regra aprendida:** Cache Condicional. As OSs não finalizadas mudam constantemente e não devem ser cacheadas permanentemente. Ao fazer cache, só considere o cache válido se o status da OS for `FINALIZADO` (ou equivalente). Caso contrário, a OS deve ser buscada do sistema ao vivo (com timeout expandido) para garantir que valores faturados, peças e descrições estejam corretos e em sync com o fechamento do dia.

**Risco identificado:** Armazenar no banco de dados local uma OS "EM ANDAMENTO" e mostrá-la para a IA ou nos dashboards sem validar sua versão viva, gerando divergência na conciliação.

**Não fazer:** Nunca armazenar OS em cache infinito sem verificar se ela já foi dada como encerrada.

## [2026-08-03] — [Feature ID: 069-faturamento-recebimentos]

**Contexto:** Definição da fonte de verdade para a métrica de "Faturamento Diário".

**Regra aprendida:** O Faturamento nunca deve ser derivado do valor bruto das Ordens de Serviço (`total_value` em `patio_os` ou `import_logs`). Na regra de negócios deste cliente, "Faturamento" significa **Recebimento de Caixa Real** (Dinheiro que entrou). Portanto, a métrica oficial de Faturamento deve SEMPRE espelhar as entradas financeiras da conciliação (`transactions` onde `type = 'in'`).

**Risco identificado:** Basear relatórios financeiros (Macro Chart, Cards e Tabelas) em `total_value` das OSs causa divergência contábil monstruosa com os recebimentos reais via Pix e Maquininha (Rede), invalidando o Dashboard.

**Não fazer:** Nunca utilize `patio_os` nem `import_logs` para somar "Faturamento". Faturamento = Soma de Entradas (`transactions` type='in') + Lançamentos Manuais (`faturamento_outros_valor`).
