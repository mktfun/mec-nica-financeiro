## [2026-08-03] — [Feature ID: 058-ai-agent-ux-costs]

**Contexto:** O workspace do Agente de IA foi refatorado para ser um contêiner Single Page Application interno em `agente.tsx`. O usuário pode navegar entre Chat, Configurações, Logs e Custos sem sofrer um reload ou redirecionamento global.

**Regra aprendida:** Em vez de usar rotas globais do `@tanstack/react-router` para subseções muito conectadas ao contexto do usuário (como os logs daquele agente), utilize uma variável de estado `activeView` no componente pai que exibe e oculta painéis (como `ConfiguracoesPanel`, `CustosPanel`, `LogsAgentePanel`) sob demanda.

**Risco identificado:** Crescimento desordenado do arquivo `agente.tsx`. É crítico extrair sub-telas para arquivos separados na pasta `src/components/agente/` (e.g. `LogsAgentePanel.tsx`), e renderizá-los condicionalmente na view principal, garantindo um código limpo.

**Não fazer:** Não jogue a rota `/configuracoes` na barra lateral global se ela está intimamente ligada apenas ao contexto da ferramenta do Agente IA. O usuário deve focar no workspace.

## [2026-08-03] — [Feature ID: 062-dashboard-fintech-v2]

**Contexto:** O dashboard principal foi reescrito de um layout superficial (com atalhos e status dispersos) para uma grade executiva no estilo fintech. Foi criado um hook central `useDashboardV2` que faz 5 queries paralelas (reconciliations, patio_os, oficina_contas, stores) para construir os KPIs financeiros.

**Regra aprendida:** Em dashboards financeiros executivos, sempre exiba dados agregados centralizados (ex: "Saldo Total", "Diferença Final") no topo, com gráficos e tabelas detalhadas por loja na base. O uso de `Promise.all` com MÚLTIPLAS chamadas para o Supabase no mesmo hook é o padrão para montar a "Big Picture" sem forçar a UI a fazer múltiplos loadings fragmentados.

**Risco identificado:** Dados que dependem de crons (como `oficina_contas`) podem retornar valores vazios/zerados se a sincronização não tiver rodado. É preciso deixar claro na UI (via tooltips) a origem daquele dado.

**Não fazer:** Não misture status de sistema/tecnologia (ex: "Motor rodando") com os KPIs executivos no mesmo nível hierárquico. Status de background jobs deve ficar em sua respectiva tela (Conciliação) ou num banner discreto, deixando o espaço nobre para números.

## [2026-08-03] — [Feature ID: 063-dashboard-fintech-v3]

**Contexto:** O dashboard foi pivotado para basear todas as suas métricas financeiras (Saldo Total, Faturamento Atual, Caixa Atual) na "Última data de Conciliação" (max date em `reconciliations`) em vez de um "Mês Selecionado".
**Regra aprendida:** Em painéis financeiros focados em fechamento/caixa (Cash Flow Analytics), usar intervalos "Mensais" é um anti-pattern. A operação vive de "Qual o saldo do último fechamento?". A matemática deve ser guiada por pivôs temporais absolutos (último registro validado) e não agrupamentos mensais incompletos.
**Risco identificado:** Ao fazer queries globais em dados diários por loja (`reconciliations`), diferentes lojas podem ter a "última conciliação" em datas diferentes se uma atrasar. A query precisa considerar "a última data global", mas fazer fallback para a última da loja.
**Não fazer:** Nunca crie um Dashboard de conciliação agrupando faturamento por `Mês Atual` se as despesas não acompanham o mesmo compasso cronológico. Amarre tudo ao fechamento diário mais recente.
