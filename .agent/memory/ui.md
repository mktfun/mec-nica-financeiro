## [2026-08-31] — [Feature ID: 321-motor-automatch-ia-e-unificacao-vinculo-pix-rede-wizard]

**Contexto:** Unificação do `ManualMatchOsModal.tsx` para gerenciar tanto PIX quanto vendas da Rede com o mesmo modal de alta afinidade e score (100, 80, 60), isolado estritamente pela filial da transação (`store_id`), e integração direta com o Step 1 do wizard (`Step1UnregisteredPayments.tsx`).

**Regras aprendidas:**
1. **Padrão Unificado de Match:**
   - O modal de vínculo exibe metadados ricos: NSU, bandeira e modalidade para cartões, e contraparte/banco para PIX.
   - Os candidatos a OS são ordenados pelo score de similaridade e menor diferença de saldo, exibindo badges `Match Nome + Valor`, `Match por Nome` ou `Match por Valor`.

## [2026-08-31] — [Feature ID: 320-persistencia-contas-manual-e-gestao-de-despesas]

**Contexto:** Adição do `EditBillModal` dentro de `ContasManualModal.tsx` para edição rápida de despesas com botão `Pencil`, e badge visual `Ajustado` no card de *Contas (Manual)* do `ResumoDiaPanel.tsx`.

## [2026-08-27] — [Feature ID: 310-novo-wizard-importacao-e-conciliacao-passo-a-passo]

**Contexto:** Nova esteira modular de importação e fechamento diário em `UnifiedReconciliationWizard.tsx`, estruturada em 5 etapas visuais (`0. Ingestão Global`, `1. Pagamentos sem OS`, `2. Justificativas`, `3. Cofre & Daniel`, `4. Fechamento Final`).

**Regras aprendidas:**
1. **Stepper de Navegação Superior:**
   - Tabs superiores numeradas (`0. Ingestão Global`, `1. Pagamentos sem OS`, etc.) com `border-b-2 border-emerald-500` ativo e sem fundos verdes arbitrários, mantendo a consistência do Dark UI Zinc-950.
2. **Vínculo Direto de 1 Clique à OS (`Step1UnregisteredPayments.tsx`):**
   - Modal com busca instantânea de OSs em aberto (`patio_os`) por placa, cliente, carro ou número de OS.
   - Cada card de OS possui botão *"Vincular (1 Clique)"*, aplicando a herança automática do valor e do meio de pagamento detectados na transação sem dropdowns extras.
3. **Justificativas Editáveis / Canceláveis (`Step2NonRevenueJustifications.tsx`):**
   - Card com botões de ação contextuais: botão primário para salvar, botão de edição para reabrir o formulário inline, e botão com `Undo2` para cancelar/desfazer a qualquer momento antes do fechamento.
4. **Card Pergunta Operacional (`Step3CashVaultDaniel.tsx`):**
   - Pergunta em destaque com botões de rádio estilizados `[SIM]` e `[NÃO]`, expandindo a tabela das 10 filiais apenas em caso afirmativo para não sobrecarregar visualmente o operador.
5. **Painel de Auditoria dos 5 Pilares (`Step4FinalAuditAndClose.tsx`):**
   - 5 cards com borda lateral esquerda (`border-l-4`), botão destacado de IA `gemini-3.5-flash-lite`, e hero card de semáforo com tolerância contábil de $\pm	ext{R\$}~50$.

**Risco identificado / Anti-pattern:** Nunca quebrar a experiência do operador com modais de confirmação desnecessários em ações determinísticas já informadas pela fonte do dado.

## [2026-08-26] — [Feature ID: 291-preservacao-total-transacoes-ofx-e-heranca-conciliacoes-historicas]

**Contexto:** Padrão de trava visual e filtro para transações conciliadas em outras datas.

**Regras aprendidas:**
1. **Badge de Trava com Cadeado (Lock):**
   - Transações com `isLockedFromOtherDate === true` exibem badge `🔒 Conciliado em [DD/MM/AAAA]` e coluna de ações com `Somente Leitura`.
2. **Pill de Filtro Específico:**
   - Adicionar botão `[ 🔒 Outras Conciliações (N) ]` no cabeçalho de filtros para segmentação instantânea.

## [2026-08-26] — [Feature ID: 290-extrato-bancario-completo-entradas-saidas-e-filtros]

**Contexto:** Padrão de Extrato Bancário Completo por Filial com 4 cards de KPIs de fluxo, barra de filtros segmentados por status com contadores, busca em tempo real e badges coloridos para vínculos de OS, Rede e Contas Pagas.

**Regras aprendidas:**
1. **Filtros Segmentados com Contadores Dinâmicos:**
   - Botões compactos: `[ Todas (N) ]`, `[ ⚠️ Pendentes (N) ]` (âmbar se > 0), `[ Entradas (+N) ]` (verde), `[ Saídas (-N) ]` (vermelho), `[ Contas Pagas (N) ]` (teal), `[ Rede (N) ]` (azul), `[ PIX OS (N) ]` (roxo).
2. **Padrão Visual Estritamente Nativo:**
   - Manter paleta Zinc-950, cards Zinc-900 border-zinc-800, tipografia padrão do projeto e formatação mono para moeda pt-BR. Zero glassmorphism.

## [2026-08-25] — [Feature ID: 284-reestruturacao-modulo-recebiveis-por-loja-e-snapshot]

**Contexto:** Reestruturação da tela de Recebíveis (`src/routes/recebiveis.tsx`), espelhando 1:1 o padrão canônico de `src/routes/patio.tsx`.

**Regras aprendidas:**
1. **Padronização Canônica de Telas de Listagem Financeira:** Telas analíticas de segundo nível (Pátio, Recebíveis, Despesas) DEVEM seguir o mesmo padrão:
   - Header com Título, `<Badge variant="success">` para contadores em aberto, Input de busca, Dropdown de Loja (apenas lojas ativas) e botões de ação (`Button` padrão e `variant="outline"`).
   - 4 Summary Cards com `border-l-4` para métricas consolidadas instantâneas.
   - Abas de status (`TabBtn`) com border-b-2 discreto.
   - Timeline list dentro de `<Card className="p-0 overflow-hidden mt-4">` com `divide-y`, avatares circulares coloridos por status e paginação padrão.
2. **Eliminação de Cores Artificiais:** Não usar tons `bg-amber-500` soltos em botões mestre; usar `bg-[var(--color-primary)]` para botões primários e `border-white/10` para outline.
3. **Isolamento Estrito de Módulos:** Nunca mesclar fluxos não solicitados (ex: Auditoria de Taxas MDR) dentro da rota de Recebíveis/Boletos.

## [2026-08-24] — [Feature ID: 276-modal-vinculo-manual-pix]

**Contexto:** Props e comportamento de ManualMatchOsModal.tsx e StoreExtratoBancarioView.tsx.

**Regra aprendida:** Sempre repassar 	argetDate para modais de conciliação para permitir queries temporais precisas no React Query.

## [2026-08-10] — [Feature ID: 153-raw-imports-excel]

**Contexto:** O componente legado de botões e tabelas "Raio-X de Lotes" (`ImportSourceBadges`, `RawOfxTable`, etc.) era confuso, quebrado visualmente e não servia ao propósito de exibir os extratos reais importados de forma legível. Substituído por `ExtratosImportacaoModal.tsx`.

**Regra aprendida:** Visualizações de auditoria contábil bruta (como logs de importação OFX ou Maquininha) DEVEM obedecer uma tipografia condensada e layout de data-grid (Excel-like). Isso significa: uso intensivo de tabelas cruas, bordas simples (`border-collapse`), cores semânticas exatas (verde/vermelho), sem cards inflados ou badges decorativos perdidos. O usuário não quer abstração quando pede "Extratos Brutos".

**Risco identificado:** Renderizar campos nulos ou formatações de data quebradas. Como a visualização é crua, `occurred_at` ou `fitid` nulos precisam exibir fallback visual como `—` para manter o alinhamento do grid perfeito.

**Não fazer:** Nunca separar componentes que compartilham contexto restrito em 10 arquivos minúsculos de UI de tabela, quando um único arquivo de Modal com funções de renderização coesas (`renderOfx()`, `renderRede()`) resolve o problema de maneira muito mais sustentável e simples no React, dada a alta similaridade e condensação.

## [2026-08-10] — [Feature ID: 156]

**Contexto:** Ocorreu um erro de regressão na tabela de detalhamento da conciliação (`BreakdownModal.tsx`) com o aviso `TypeError: s.ofx_in.map is not a function`. Isso foi causado porque uma Spec anterior (155) alterou o formato da resposta JSON da RPC do Supabase de flat (Arrays na raiz) para nested (Objetos aninhados com `transactions` e `total`) sem atualizar a tipagem do Front.

**Regra aprendida:** As props e acessores em tabelas JSX (.map) devem refletir precisamente a árvore de objetos da resposta Supabase. O `useConciliationBreakdown` foi atualizado para estruturar as sub-arrays (`{ total, transactions }`), e o JSX deve ler com safe-chaining (`ofx_in.transactions.map`).

**Risco identificado:** Alterar selects do PostgreSQL estruturados em `json_build_object` quebra a aplicação Frontend sem causar erros de compilação de banco.

**Não fazer:** Nunca reescreva o JSON de saída de uma RPC do Supabase sem varrer o hook React e o componente correspondente na mesma iteração de Spec.

## [2026-08-10] — [Feature IDs: 159, 160]

**Contexto:** Correção do fluxo de Sincronização Cloud. Injetado feedback via Toast na rotina assíncrona da nuvem e um campo Date nativo (HTML5) no Painel de Sincronização para alimentar o Bot.

**Regra aprendida:** O estado `importLogs` isolado numa tab/step tardia pode mascarar os processos background (VPS Bot). A UX exige um Toast instantâneo quando uma tarefa for enfileirada no backend para dar a resposta `ok` otimista para o usuário. 
Ao criar fluxos `onClick` que disparam Edge Functions lentas, sempre usar Toasts nativos independentemente de Logs de terminal que estejam escondidos.

**Risco identificado:** A dependência em Date object para fuso horário é perigosa. Passar puramente strings `YYYY-MM-DD` por `encodeURIComponent` até a VPS é o caminho mais seguro para evitar conflitos de TZ.

## [2026-08-10] — [Feature ID: 161]

**Contexto:** Criação do AgentRunnerModal. O botão estático de Sincronizar da Cloud foi convertido para uma UI imersiva de Agente (Vercel/OpenAI style) com collapsibles de `Framer Motion`. 

**Regra aprendida:** Em tarefas longas e assíncronas (como Web Scraping), o uso de uma sanfona animada que destrincha as Sub-tasks (`subSteps`) tira a sensação de que o App travou. O usuário ganha a percepção de que a IA está operando de fato. 

**Risco identificado:** Mockar os estados e tempos. Para ficar perfeito num App de produção severa, o ideal é usar WebSockets. Aqui usamos timeouts simulados mais um Polling final na tabela, para mitigar o delay.

## [2026-08-14] — [Feature ID: 197-odometer-faturamento-and-ui-cleanup]

**Contexto:** Trava de edição de inputs na conciliação e faxina visual no modal de importação centralizada.

**Regra aprendida:**
1. **Modo Leitura por Padrão (isEditing):** O painel de conciliação diária (ResumoDiaPanel.tsx) deve abrir como visualização estática sólida com números formatados (AnimatedNumber) e badges. Apenas o botão 'Editar Fechamento' habilita os campos de formulário, prevenindo re-renderizações e disparos acidentais de mutações.
2. **Botões de Confirmação Explícitos:** No modo de edição, exibir sempre 'Salvar Alterações' (gravação em lote) e 'Cancelar' (restauração segura do estado).
3. **Modal de Importação Despoluído:** Eliminar steppers multi-circulares gigantes do topo do modal. Logs técnicos e saídas de terminal devem ser recolhidos em accordion/details colapsável monospaced sob demanda (Logs de Depuração).

**Risco identificado:** Deixar inputs controlados soltos no topo da conciliação que atualizam o banco de dados a cada tecla pressionada.

**Não fazer:** Nunca misturar steppers visuais com logs crus de terminal na mesma viewport sem colapsamento.

## [2026-08-14] — [Feature ID: 198-manual-os-diff-resolution-in-import-modal]

**Contexto:** Tabela de ajuste manual direto para OSs ausentes na etapa de pré-visualização (Step 3) do modal de importação centralizada.

**Regra aprendida:**
1. **Grid de Edição Inline no Preview:** Na tela de preview de importação, quando detectadas OSs ativas ausentes na planilha, exibir card com tabela contendo inputs livres numéricos para Total, Pago e Select de Status.
2. **Destaque Visual:** Linhas modificadas pelo operador ganham destaque sutil de fundo (`bg-amber-500/5`) para fácil conferência antes de salvar.

**Risco identificado:** Poluir o fluxo de importação com múltiplos sub-modais confusos. A tabela inline integrada no Step 3 mantém o fluxo fluido e direto.

**Não fazer:** Nunca disparar requisições de update ao banco a cada tecla digitada dentro da tabela de preview.

## [2026-08-14] — [Feature ID: 199-unified-single-flow-import-modal]

**Contexto:** Modal `ImportConciliacaoModal.tsx` em Dark UI sólido (Zinc-950) de 2 colunas responsivas para importação e fechamento diário.

**Regra aprendida:**
1. **Dark UI Sólido (Sem Glassmorphism):** O modal utiliza fundo `bg-zinc-950`, cards `bg-zinc-900` com bordas `border-zinc-800` e botão de ação primária em `bg-emerald-600`, atendendo integralmente ao contraste WCAG 2.1 AA.
2. **Foco e Teclado:** Inputs manuais possuem anel de foco `focus:ring-2 focus:ring-emerald-500` com fontes em escala >= 16px para evitar fadiga visual.

**Risco identificado:** Transparências ou efeitos visuais excessivos que prejudicam a leitura rápida de tabelas financeiras de alta densidade.

**Não fazer:** Nunca misturar steppers temporais com painéis estáticos de dados quando todas as variáveis do fechamento precisam ser ajustadas antes de gravar.

## [2026-08-14] — [Feature ID: 200-202-import-reactive-flow-and-marco-zero]

**Contexto:** `DailyImportView.tsx` em tela cheia com Dark UI sólido (Zinc-950/Zinc-900/Zinc-800).

**Regra aprendida:**
1. **Transparência de Código (JSON Inspector):** Blocos de código colapsáveis (`<details>`) estilizados como terminal (`bg-zinc-950 font-mono text-xs text-emerald-400`) aumentam a confiança do operador e facilitam depuração em tempo real.
2. **Trava de Segurança em Inputs Manuais:** Inputs numéricos críticos de fechamento (`Odômetro`, `Dinheiro MP`, `A Receber`, `Contas`) devem possuir botão de trava/destrava (`isManualLocked`) para evitar alterações não intencionais durante conferências rápidas.

**Risco identificado:** Falta de feedback visual durante operações em lote com múltiplos arquivos e transações.

**Não fazer:** Nunca disparar mutações em lote no Supabase sem fornecer barra de progresso por fases e terminal de logs com timestamp.

## [2026-08-17] — [Feature IDs: 214, 215, 216 — Loja Detalhes, Gráficos Analíticos e Evolução Temporal]

**Contexto:** Redesenho completo da tela de detalhes da loja (`/loja/$lojaId`) com gráfico Donut contextual (`LojaPieCharts.tsx`), gráfico de evolução diária em 3 linhas (`LojaEvolutionChart.tsx`), fixação do saldo bancário no último OFX importado e blindagem de datas a partir do Marco Zero (13/08/2026).

**Regra aprendida:**
1. **Gráfico Donut Contextual por Aba:** Em vez de botões manuais redundantes dentro do card do gráfico, o Donut Chart deve derivar seu modo automaticamente da aba selecionada na tabela (`Extrato` -> Geral Receita x Despesa, `Saídas` -> Despesas por Fornecedor em cores macro, `Entradas` -> Receitas por Origem).
2. **Gráfico de Linhas Triplo de Evolução Diária:** O componente `LojaEvolutionChart` renderiza 3 curvas temporais diárias (Entradas em Verde `#10b981`, Saídas em Coral `#f43f5e` e Saldo Líquido em Azul `#3b82f6`) com tratamento defensivo para períodos de 1 único dia.
3. **Saldo em Conta Desacoplado do Filtro de Data:** O card de Saldo da Loja e Valor Disponível deve refletir de forma fixa a posição patrimonial real mais recente do extrato OFX, independente do intervalo de datas selecionado para visualização do extrato.

**Risco identificado:** Excesso de fatias minúsculas no gráfico de despesas por fornecedor causando poluição visual.

**Não fazer:** Nunca renderizar fornecedores com representatividade < 2.5% como fatias individuais no gráfico de pizza; consolidar sempre em 'Outros Fornecedores'.

## [2026-08-17] — [Feature ID: 217]

**Contexto:** Implementação do módulo `MdrAuditView.tsx` e prevenção de TDZ ReferenceError em wizards de importação.

**Regra aprendida:**
- Todos os hooks de estado, mutation e queries (`useStores`, `useCentralImport`, `useNavigate`, etc.) DEVEM ser declarados no topo absoluto dos componentes funcionais antes de qualquer callback, helper ou `useEffect` que possa referenciá-los. No bundle minificado de produção, variáveis declaradas após callbacks que as fecham em closure disparam `ReferenceError: Cannot access 'X' before initialization`.
- O design de auditoria de taxas utiliza KPIs de topo (Zinc-950), badges com semáforo (`Conforme`, `Atenção`, `Divergente`), comparativo gráfico em Recharts e botão de exportação CSV para contestação rápida com a adquirente.

**Risco identificado:** Callbacks criados no topo que fecham sobre variáveis de hooks declaradas mais abaixo.

**Não fazer:** Nunca declarar hooks após funções de utilidade interna ou handlers no corpo do componente.

## [2026-08-21] — [Feature ID: 261]

**Contexto:** Inclusão de tabela interativa de edição livre de Ordens de Serviço (Valor Total, Total Pago e Status) no Step 3 de conferência da importação centralizada, e ajuste de nomenclatura para Saldo Total Bancário (OFX).

**Regra aprendida:**
- Na etapa de preview/conferência de importações de pátio (`CentralImportWizard.tsx`), exibir SEMPRE a tabela completa de todas as OSs importadas (`results.osFiles`) com inputs editáveis numéricos (`total_value`, `paid_value`) e status selector.
- As alterações do usuário devem mutar reativamente o estado do parser (`results.osFiles` via `setResults`), recalculando instantaneamente os cards de resumo do topo (`Total OS`, `Estoque em Pátio`) e as previsões por loja.
- A tabela deve incluir paginação elegante (50 itens por página), busca rápida instantânea por OS/placa/filial, filtro por loja e filtro por status, com badge de `Editado` para destacar linhas customizadas.

**Risco identificado:** Atraso ou descompasso entre a edição local de uma OS e os reducers de faturamento e pátio. A mutação direta e imutável de `results.osFiles` garante sincronia de fonte única de verdade.

**Não fazer:** Nunca forçar o usuário a aprovar um fechamento de OSs sem uma tabela aberta onde ele possa visualizar e retificar valores de ordens de serviço caso o relatório do ERP tenha vindo com inconsistências.


## [2026-08-21] — [Feature ID: 262-restaurar-tabela-exclusiva-os-ausentes-preview]

**Contexto:** Restauração e isolamento da tabela exclusiva de OSs Ausentes no Step 3 de conferência da importação centralizada (`CentralImportWizard.tsx`).

**Regra aprendida:**
- No Step 3 do Wizard, NUNCA renderizar uma tabela massiva com todas as centenas de OSs da planilha recém-importada, pois esses dados já foram atualizados diretamente pelo arquivo.
- O único grupo de OSs que necessita de intervenção manual e inputs editáveis são as **OSs Ausentes / Órfãs** (aquelas que estão ativas no banco de dados mas NÃO vieram no relatório importado do pátio).
- A tabela de OSs ausentes deve exibir badge âmbar, barra de busca por placa/OS/loja, inputs de `total_value`, `paid_value` e seletor de `status` (`em_aberto`, `pago_parcial`, `finalizado`, `cancelado`), calculando em tempo real o `Saldo Pendente`.

**Risco identificado:** Poluição visual com centenas de OSs desnecessárias que ocultam as poucas ordens que realmente exigem auditoria.

**Não fazer:** Nunca misturar ordens presentes no arquivo com ordens ausentes em tabelas genéricas não filtradas.

## [2026-08-21] — [Feature ID: 263-tabela-unificada-os-preview-com-filtros-e-edicao-livre]

**Contexto:** O operador necessita visualizar e auditar permanentemente todas as Ordens de Serviço no Step 3 de conferência da importação (`CentralImportWizard.tsx`), com controles de filtro rápido por pílulas com contadores.

**Regra aprendida:**
- A tabela de Ordens de Serviço no Step 3 do Wizard NUNCA deve ser ocultada condicionalmente. Deve exibir a lista unificada (`allPreviewOsList`) consolidando ordens dos arquivos importados e ordens ausentes do banco.
- Incluir 4 pílulas de filtro rápido no topo com badges de contagem dinâmica:
  1. `Todas as OSs ({all})`
  2. `Ausentes no Relatório ({missing})`
  3. `Recebimentos do Dia ({paidToday})`
  4. `Estoque em Pátio ({openYard})`
- Todas as linhas dispõem de inputs inline editáveis para `total_value`, `paid_value` e seletor de `status`, com badge de `[Planilha do Dia]`, `[Ausente no Relatório]` ou `[Editado]`.

**Risco identificado:** Ocultar a tabela quando uma sub-condição for vazia, deixando o usuário sem visibilidade das centenas de OSs carregadas.

**Não fazer:** Nunca esconder a tabela de conferência de OSs no preview quando houver arquivos de OS importados.

## [2026-08-24] — [Feature ID: 264 & 265]

**Contexto:** Painel de Auditoria Pré-Fechamento (`DiagnosticPanel.tsx`) no Step 3 e transparência no Card de Contas (`ResumoDiaPanel.tsx`).

**Regra aprendida:**
- O `DiagnosticPanel` roda no Step 3 do `CentralImportWizard` confrontando os 5 pilares patrimoniais (Pátio, Banco OFX, Dinheiro MP, A Receber, Contas) contra as médias dos últimos 5 dias, com tolerância dinâmica de `max(R$ 500, 2% do faturamento)`.
- O card de Contas no `ResumoDiaPanel` detalha visualmente `Base Planilha` + `Extras Manuais` + `Juros Rede`, evitando confusão sobre a formação do subtotal.
- Padrão visual: Dark UI (Zinc-950/Zinc-900), sem balões de chat, sem linguagem de IA, tipografia Inter/mono.

## [2026-08-24] — [Feature ID: 266 & 267]

**Contexto:** Editor de OSs Ausentes no Pátio (`MissingPatioOsEditor.tsx`) no Step 3 da importação centralizada.

**Regra aprendida:**
- O `MissingPatioOsEditor` renderiza no Step 3 de `CentralImportWizard` permitindo ao operador editar o Valor Total, Valor Pago e Status das OSs que sumiram do relatório do pátio de hoje.
- O componente exibe um card de resumo financeiro comparando Saldo Original vs Saldo Novo e o Impacto Líquido (Δ R$) em tempo real.
- Padrão visual: Dark UI sólido (Zinc-900 / Zinc-950), badges âmbar e botões de ação rápida em lote.

## [2026-08-24] — [Feature ID: 269 — Simplificação Step 3 OSs e Diagnóstico de Juros/Rede]

**Contexto:** Eliminação da duplicidade de cards/tabelas de OSs na Step 3 do `CentralImportWizard.tsx`. O usuário precisava apenas do card focado nas OSs ausentes para ajuste manual.

**Regra aprendida:**
- Na Step 3 de importação, NUNCA renderizar duas tabelas de OSs simultâneas (uma de ausentes e outra geral redundante de 300+ linhas). O operador necessita estritamente do card `<MissingPatioOsEditor />` para concentrar a auditoria nas OSs que de fato exigem intervenção manual.
- O estoque em pátio total (`computedTotalPatioEstoque`) deve ser calculado diretamente da soma das OSs dos arquivos importados + OSs ativas ausentes no banco, sem depender de listas secundárias no DOM.

**Risco identificado:** Renderizar tabelas pesadas de centenas de linhas de preview que poluem visualmente e confundem o operador durante a validação prévia.

**Não fazer:** Nunca duplicar componentes de listagem e edição de OSs na mesma etapa do Wizard.

## [2026-08-24] — [Feature ID: 271 — Redesign da Conciliação por Loja em 3 Abas]

**Contexto:** A tela `/conciliacao/$lojaId` continha 4 abas redundantes e confusas (duas abas de cartão idênticas, PIX isolado com status contraditórios e ausência de tabela dedicada de OSs).

**Regra aprendida:**
- A tela de cada filial deve ser estruturada estritamente em **3 abas limpas e sem redundância**:
  1. `StoreCartaoMaquininhaView`: Unifica vendas em cartão, MDR retido e status de liquidação bancária (*Liquidado* vs *A Compensar*).
  2. `StoreExtratoBancarioView`: Formato cronológico de extrato bancário real, identificando com clareza lotes de adquirente, PIX/TED vinculados a OSs, receitas avulsas justificadas e pendentes (com ações rápidas de vincular/justificar/desvincular).
  3. `StoreOrdensServicoView`: Tabela dedicada de todas as OSs daquela loja, cálculo de saldo em pátio, botão de `+ Nova OS Manual` e edição de valores/status com recálculo em cascata.

**Risco identificado:** Criar abas com dados redundantes ou status visuais que parecem contraditórios (ex: "Aguardando extrato" com badge verde).

**Não fazer:** Nunca separar maquininha em duas abas que mostram os mesmos lançamentos, e nunca isolar PIX do Extrato Bancário global da conta da filial.


## 2026-08-26 — [Feature ID: 297]

**Contexto:** Unificação visual do cabeçalho da página de detalhe da loja (`conciliacao.$lojaId.tsx`).

**Regra aprendida:**
- **Header Unificado da Filial:** Substituído o bloco de 4 cards redundante pelo **Card Consolidado de Fechamento por Filial**, apresentando as 6 métricas padronizadas: Saldo Bancos + Cartões, Maquininha, PIX, Na Loja OS, Previsto e Status/Diferença, alinhando a experiência visual da home com a página da loja.

## 2026-08-27 — [Feature ID: 298]

**Contexto:** Exibição de saldos devedores (cheque especial) e decomposição do saldo por filial.

**Regra aprendida:**
- Filiais com saldo consolidado negativo (`log.saldo_banco < 0`) devem exibir o valor em `text-rose-400` para alerta visual instantâneo de conta devedora/exposição a cheque especial, com breakdown detalhando OFX, Maquininha e Cofre.

## 2026-08-27 — [Feature ID: 299]

**Contexto:** Interface de fechamento com botões explícitos de Salvar Fechamento e Editar Fechamento.

**Regra aprendida:**
- O painel de resumo diário (`ResumoDiaPanel.tsx`) deve apresentar botões claros de "Editar Fechamento" e "Salvar Fechamento", acompanhados de badge de status (`Fechamento Blindado & Consolidado` vs `Conciliação Aberta`), gravando compulsoriamente `is_closed: true` ao salvar.

## 2026-08-27 — [Feature ID: 308]

**Contexto:** Padronização do Modal de OSs do Pátio (`PatioOsDetailModal.tsx`), painel das 6 métricas executivas na visão da filial e abas canônicas sem background.

**Regra aprendida:**
- **Modal de OSs do Pátio:** Deve utilizar rigorosamente os 4 Summary Cards canônicos com borda lateral esquerda grossa (`border-l-4`), tipografia mono tabular para valores contábeis (`<AmountCell>`), badges com indicador de ponto (`Badge variant="warning" dot` e `variant="brand" dot`) e toolbar de filtros integrada à paleta `bg-[var(--bg-surface)]`.
- **Abas da Filial sem Fundo Verde:** Abas de navegação interna (`conciliacao.$lojaId.tsx`) devem seguir 1:1 o estilo plano de `src/routes/patio.tsx`, com `border-b-2 border-emerald-500 text-white font-semibold` na aba ativa e **SEM NENHUM BACKGROUND** (`bg-emerald-500/5` é terminantemente proibido).
- **Painel Executivo da Filial:** A visão individual da loja deve conter o mesmo painel escuro de 6 métricas (`SALDO TOTAL`, `Maquininha`, `PIX`, `Na Loja OS`, `Previsto`, `Diferença`) visto na home de fechamento, garantindo paridade cognitiva instantânea ao operador.

**Risco identificado:** Tentar adicionar backgrounds coloridos ou estilização ad-hoc nas abas de navegação descaracteriza a consistência visual em relação a outras telas densas como o Pátio.

**Não fazer:** Nunca usar `bg-emerald-500/5` ou cartões com bordas ad-hoc em modais contábeis.


## [2026-08-30] — [Feature ID: 314] Teste E2E e Automação de Screenshots do Wizard
**Contexto:** Automação via Playwright com injeção direta de múltiplos arquivos reais e captura de screenshots de cada step do assistente.
**Regra aprendida:**
- **Seletores e Scroll de Wizard:** Em telas longas com múltiplas contas/filiais (ex: 10 contas OFX), botões de navegação devem ser rolados para a visão (`scrollIntoViewIfNeeded()`) antes do clique interativo.
- **Formulário de Justificativa Canônico:** Manter paridade total entre o Passo 5 (`Step2NonRevenueJustifications.tsx`) e a tela de extrato (`OrphanCategorizationModal.tsx`), com dois botões de impacto claros (`Somar ao Faturamento` vs `Apenas Conciliar`), chips rápidos de categorias e campo de observação contábil.
**Risco identificado / Anti-pattern:** Não utilizar `<select>` puro para decisões financeiras de alto impacto; preferir botões de cards visuais com ícones representativos (`TrendingUp` e `Ban`).
