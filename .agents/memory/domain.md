## [2026-08-03] — [Feature ID: 059-oficina-bot-automation]

**Contexto:** Sincronização automática das Ordens de Serviço (OS) e Contas a Pagar do Oficina Inteligente via Bot.

**Regra aprendida:** Cache Condicional. As OSs não finalizadas mudam constantemente e não devem ser cacheadas permanentemente. Ao fazer cache, só considere o cache válido se o status da OS for `FINALIZADO` (ou equivalente). Caso contrário, a OS deve ser buscada do sistema ao vivo (com timeout expandido) para garantir que valores faturados, peças e descrições estejam corretos e em sync com o fechamento do dia.

**Risco identificado:** Armazenar no banco de dados local uma OS "EM ANDAMENTO" e mostrá-la para a IA ou nos dashboards sem validar sua versão viva, gerando divergência na conciliação.

**Não fazer:** Nunca armazenar OS em cache infinito sem verificar se ela já foi dada como encerrada.
