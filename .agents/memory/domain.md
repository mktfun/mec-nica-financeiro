## [2026-08-03] — [Feature ID: 059-oficina-bot-automation]

**Contexto:** Sincronização automática das Ordens de Serviço (OS) e Contas a Pagar do Oficina Inteligente via Bot.

**Regra aprendida:** Cache Condicional. As OSs não finalizadas mudam constantemente e não devem ser cacheadas permanentemente. Ao fazer cache, só considere o cache válido se o status da OS for `FINALIZADO` (ou equivalente). Caso contrário, a OS deve ser buscada do sistema ao vivo (com timeout expandido) para garantir que valores faturados, peças e descrições estejam corretos e em sync com o fechamento do dia.

**Risco identificado:** Armazenar no banco de dados local uma OS "EM ANDAMENTO" e mostrá-la para a IA ou nos dashboards sem validar sua versão viva, gerando divergência na conciliação.

**Não fazer:** Nunca armazenar OS em cache infinito sem verificar se ela já foi dada como encerrada.

## [2026-08-03] — [Feature ID: 068-faturamento-patio-os]

**Contexto:** Definição da fonte de verdade para a métrica de "Faturamento Diário".

**Regra aprendida:** O Faturamento de Ordens de Serviço nunca deve ser derivado de logs de importação pontuais (`import_logs`). Ele deve ser calculado dinamicamente com base na data de encerramento da OS. Em `patio_os`, a soma de `total_value` das OSs onde `closed_at` pertence à data alvo é o valor faturado verdadeiro e imutável.

**Risco identificado:** Basear relatórios financeiros (Macro Chart) em `import_logs.total_os` causa lacunas no histórico caso o log falhe ou as planilhas não tenham sido submetidas em dias específicos, mesmo com as OSs finalizadas existindo no sistema (Pátio).

**Não fazer:** Nunca utilize `import_logs` como repositório principal de Faturamento. Ele serve apenas como log sistêmico. Toda e qualquer métrica de Faturamento deve provir do `patio_os` (`closed_at`).
