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
**Risco identificado:** Não fazer: Não misture sumarizações globais (Dashboard V2) com cálculos parciais locais. A fonte da verdade para "Contas a Pagar" parou de ser a API externa `oficina_contas` e passou a ser estritamente o Extrato OFX (`transactions`, amount < 0).

### Dashboard Layout Patterns (Macro Chart)
- **Painéis Consolidados (Full-Width):** Sempre prefira painéis panorâmicos ("Hero Cards") posicionados no topo absoluto da visualização, ocupando **todas as colunas** (ex: `xl:col-span-4`). Evite enjaular gráficos macrocópicos em grids parciais (como `xl:col-span-3`). A largura 100% (Widescreen) eleva o padrão visual.
- **Gráficos Horizontais e Finos:** Para gráficos Hero, prefira layouts horizontais achatados (`min-h-[220px]`). Mova as legendas para o Header (alinhadas ao topo) em vez de poluírem o espaço do gráfico, garantindo um visual de "cockpit" limpo e minimalista. Eixos Y devem ser mantidos visíveis mas extremamente discretos (ex: notation compact "15 mil").
- **ComposedChart com Escala Dinâmica:** Ao exibir métricas financeiras cruzadas (Saldo, Faturamento e Contas), utilize um `ComposedChart` agrupando as linhas. O eixo de tempo **não deve ser um last-N-days rígido**, mas sim uma escala dinâmica baseada nas datas do **mês de referência selecionado**. Isso garante flexibilidade conforme os dados são importados do mês.
**Não fazer:** Nunca crie um Dashboard de conciliação agrupando faturamento por `Mês Atual` se as despesas não acompanham o mesmo compasso cronológico. Amarre tudo ao fechamento diário mais recente.

## [2026-08-03] — [Feature ID: 064-dashboard-fintech-v4]

**Contexto:** O usuário não conseguia voltar para dias anteriores, pois a dashboard forçava a última data disponível automaticamente. Além disso, a tabela de lojas estava muito espremida com a adição das métricas de Pátio.
**Regra aprendida:** Em painéis amarrados à "Última Conciliação" global, é obrigatório prover um seletor de data (`<input type="date">`) permitindo o **Time Travel** para fechamentos anteriores. Se o usuário abrir o painel num domingo sem dados, a interface precisa exibir a data mais próxima no passado que tenha dados ou permitir explicitamente a navegação.
**Risco identificado:** Adicionar muitas colunas em tabelas de `Dashboard` rapidamente "espreme" os dados. Se for preciso adicionar sub-métricas (ex: Qtd e Valor de veículos no pátio), deve-se usar flex-col para empilhá-las em uma única `td` usando tipografia menor, garantindo a preservação da largura das colunas principais de dinheiro.
## [2026-08-03] — [Feature ID: 070-faturamento-vs-contas-chart]

**Contexto:** O gráfico "Faturamento × Contas" apresentava problemas de UX: eixos apertados, palavras quebradas no meio ("Santo \n André - HD"), barras muito finas (aspecto amador) e ocultação forçada de valores (exigindo hover no Tooltip).
**Regra aprendida:** Em gráficos verticais de `BarChart` no Recharts exibindo nomes de entidades (como Lojas/Filiais), NUNCA deixe o YAxis com `width` padrão estreito. Ajuste `width={130}` ou mais, combine com uma função `shortenName` (que remove artigos irrelevantes, não apenas os abrevie) e insira `<LabelList position="right">` na ponta da barra para que o usuário não dependa do mouse (Tooltip) em views executivas ou mobile.
**Risco identificado:** word-break feio em nomes compostos e visual pobre "fora-da-caixa" em charts nativos.
**Não fazer:** Nunca entregue um gráfico de barras num dashboard Premium sem engordar as barras (`barSize={14+}`) e sem aplicar `radius` nos cantos. Gráficos com barras finas passam uma imagem barata ao software.
