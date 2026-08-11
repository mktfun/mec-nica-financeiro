## [2026-08-10] — [Feature ID: 147]

**Contexto:** O calendário de conciliação permitia navegação livre e forçava a entrada no dia "hoje" por padrão. Como a base de cálculo (caixa anterior) de um dia depende fortemente da última conciliação efetiva, entrar num domingo vazio e salvar quebrava a lógica de fluxo de caixa para a segunda-feira.

**Regra aprendida:** Em sistemas de conciliação contínua dependentes de snapshots (caixa do dia anterior), a interface NUNCA deve permitir o usuário acessar ou salvar dias que não contenham nenhuma movimentação bancária registrada ou snapshot prévio. O calendário e as paginações devem estar restritos 100% aos dias válidos (via consulta de DISTINCT dates em tabelas base).

**Risco identificado:** Permitir navegação cega por offset (+1/-1 dia) em vez de array de dados reais.

**Não fazer:** Nunca inicializar calendários de conciliação fechada com `new Date()` cego se o dashboard exibe fechamento retroativo e contínuo. Inicialize sempre na última data cronológica com dados.

## [2026-08-07] — [Feature ID: 146]

**Contexto:** O sistema estava perdendo despesas do OFX que foram baixadas e processadas hoje (target_date), mas cujas datas da transação original (occurred_at) eram de dias anteriores. A view substituía a data-alvo de conciliação pela data física.

**Regra aprendida:** Em importações bancárias para sistemas de conciliação diária, as transações físicas possuem seu momento `occurred_at` original, mas DEVEM possuir e ser unificadas via uma `target_date` que indica em que conciliação diária aquela despesa/receita foi atribuída. Nunca substitua um pelo outro.

**Risco identificado:** Forçar o `target_date` como sendo o `TO_CHAR(occurred_at, 'YYYY-MM-DD')` diretamente na View quebra a lógica de retroatividade de arquivos OFX que agrupam lançamentos passados.

**Não fazer:** Nunca crie views contábeis ou de transações que removam a data de contexto da importação, mantendo apenas a data da ocorrência original. A contabilidade da loja é fechada no "caixa", logo a transação passa a valer na data em que o fluxo foi consolidado.

## [2026-08-11] — [Feature ID: 162]

**Contexto:** A extração automatizada (via Playwright) de faturamentos/OS pode falhar se o portal da oficina inteligente ficar fora do ar, travando toda a conciliação diária da loja se não houver um fallback de inserção manual flexível.

**Regra aprendida:** Motores de sincronização em nuvem e scrapers *devem sempre* prever um fluxo secundário manual (Fallback UI) que assuma a injeção daquele tipo de dado no cálculo final quando o scraper exaure suas tentativas (retries). O cálculo e o Auto-Save devem ser polimórficos, operando da mesma forma quer o array de dados venha do Scraper Automático ou do Input Manual de Fallback.

**Risco identificado:** Bot não responder por horas e bloquear 100% das conciliações financeiras da franqueadora.

**Não fazer:** Nunca construa integrações vitais sem rotas de fallback e nunca faça funções de cálculo contábil dependerem estritamente do formato da API, abstraia antes.
  
## [2026-08-11] — [Feature ID: 164]  
**Contexto:** Remoção do robô de scraping e transição para o modelo de conciliação híbrida usando a tabela estoque_os_pendente.  
**Regra aprendida:** O robô de scraping falha em capturar o longo prazo. O controle de OSs não pagas no momento da abertura (Estoque Passivo) deve ser feito inserindo OSs em estoque_os_pendente com status PENDENTE. O " Na "Loja é a soma do valor_os dessa tabela. O Wizard agora possui o Passo 3.5 que cruza OFX (sem pai) contra o estoque_os_pendente, dando baixa mudando status para PAGA e data_baixa.  
**Risco identificado:** Consultar a tabela patio_os para dados atualizados trará dados congelados e causará divergências na conciliação, pois o bot foi aposentado.  
**Não fazer:** NÃO recriar componentes atrelados à edge function/AgentRunnerModal. A importação diária não depende mais do scraping cloud. 
