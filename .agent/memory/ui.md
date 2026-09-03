## [2026-09-03] — [Feature ID: 362-fix-os-rejeitadas-e-filtro-ausentes-relatorio]

**Contexto:** Implementação do modo "Apenas Fora do Relatório" em `PatioExcelStoreAccordion.tsx` com Segmented Control e quitação direta por botão de 1-clique, atendendo à necessidade do operador de auditar apenas as ordens de pátio não constantes da planilha do dia.

**Regra aprendida:**
1. **Segregação Estrita: Totalizadores Globais Master vs Tabela Filtrada (`PatioExcelStoreAccordion.tsx`):**
   - Em grades contábeis com filtros visuais parciais (`filterMode: 'outside_report' | 'all'`), os KPIs consolidados (Total OS, Total Pago, Aberto) e os totalizadores do cabeçalho da loja DEVEM continuar sendo computados sobre o array master completo de `osItems`.
   - O filtro afeta estritamente o `filteredItems` consumido pelo `<tbody>`. Isso impede que o faturamento da loja aparente ter caído para R$ 0,00 quando o operador estiver no modo de conferência de pendências.
2. **Empty State Contextual e Informativo:**
   - No modo "Apenas Fora do Relatório", filiais cujas OSs vieram 100% no relatório devem exibir uma mensagem de conformidade verde com `CheckCircle2` (*"Todas as OSs desta filial vieram no relatório. Nenhuma ordem pendente de atualização manual em [Loja]"*), evitando que o operador presuma erro de carregamento.
3. **Ações de Quitação Rápida sem Popover:**
   - Para OSs pendentes fora do relatório, fornecer um botão direto *"Baixar"* na linha que quita o valor integral e marca `isModified: true`, poupando dezenas de cliques em popovers durante a rotina matinal.

---

## [2026-09-03] — [Feature ID: 361-fluxo-ingestao-controlada-4-etapas-com-bifurcacao-chat]

**Contexto:** Implementação da Bifurcação Inicial da Central de Fechamento Diário (`/importacoes?tab=diario`), remoção de poluição visual (banner supérfluo de virada de mês/carro) e criação do Modo Manual Passo a Passo em 4 Fases (100% Sem IA / ZERO LLM) vs Modo Conversacional Hydra em Tela Cheia (Com IA).

**Regra aprendida:**
1. **Bifurcação Consciente na Entrada (`FechamentoModeSelector.tsx`):**
   - O operador deve ter escolha deliberada de modalidade logo no início do dia via 2 cards institucionais de alto contraste: Modo Manual Passo a Passo (Sem IA) vs Modo Conversacional Hydra (Com IA).
   - Não impor automação de IA para quem prefere controle manual por tabelas e grades Excel.
2. **Esteira Manual Controlada em 4 Fases Estritas (`FechamentoManualWizard.tsx`):**
   - A importação caótica de 40 arquivos de uma vez foi segregada em 4 etapas sequenciais com dropzone e tela de conferência dedicada por tipo de arquivo:
     - **Fase 1:** Só OSs do pátio com `PatioExcelStoreAccordion` e edição inline de pendentes.
     - **Fase 2:** Só Vendas Rede com pré-matching balcão x OS (`match_stage2_rede_os`), visualização de sobras e desempate via `SmartResolutionStrip`.
     - **Fase 3:** Só 10 OFX Itaú com batimento PIX x OS e apuração de lotes de cartões Rede creditados vs a compensar ($D+1$).
     - **Fase 4:** Só Contas a Pagar com batimento de saídas, receitas extras via `RevenueAdjustmentsCard` e selagem contábil oficial.
3. **Persistência de Sessão e Não-Interrupção no F5:**
   - O estado da esteira manual e o modo selecionado são salvos em `reconciliation_pipeline_sessions`, permitindo ao operador atualizar a página sem perder o progresso.

---

## [2026-09-03] — [Feature ID: 360-conciliacao-conversacional-fullscreen-chat]

**Contexto:** Implementação do Workspace Conversacional de Conciliação em Tela Cheia com a IA Hydra, eliminação de clichês de "vibecoding de IA" (zero emojis, zero gradientes roxos extravagantes) e adoção de Dark UI Zinc-950 corporativa com atalhos de teclado.

**Regra aprendida:**
1. **Design System Corporativo Sóbrio em Chats Financeiros:**
   - Interfaces financeiras voltadas para fechamento e auditoria não devem utilizar emojis nem mascotes de robô informais.
   - Usar tipografia monospaçada para valores contábeis (`font-mono tabular-nums`), ícones exclusivamente funcionais da biblioteca `lucide-react` (`Building2`, `Check`, `X`, `FileText`) e cores semânticas sóbrias (`emerald-400` para conformidade, `rose-400` para divergência).
2. **Cartões de Decisão Inline com Atalhos Físicos (`InlineDecisionCard.tsx`):**
   - Em vez de modais flutuantes que bloqueiam a visão do histórico, propostas de conciliação geradas pela IA devem ser renderizadas inline dentro do próprio fluxo do balão esquerdo do assistente.
   - Suportar atalhos de teclado globais seguros (`1`/`Enter` para confirmar, `2`/`Esc` para rejeitar) com guarda estrita contra interceptação de digitação em inputs/textareas.
3. **Alternância Não-Disruptiva de Rota (`src/routes/conciliacao.index.tsx`):**
   - Ao adicionar modos de exibição (ex: `view: 'classic' | 'chat'`), NUNCA tornar o search param obrigatório no `validateSearch` do TanStack Router, pois isso quebra chamadas de navegação existentes em outras rotas filhas. Ler preferência de `localStorage` e URL query params com fallback resiliente.

---

## [2026-09-02] — [Feature ID: 358-motor-conciliacao-lojas-ofx-e-equalizacao-0209]

**Contexto:** Blindagem contra campos zerados em `ConciliacaoLojasView.tsx` e `StoreCardModulo1.tsx`, pré-compressão Canvas de screenshots no Dropzone do OCR e criação do componente `RevenueAdjustmentsCard.tsx`.

**Regra aprendida:**
1. **Fallbacks Inline Resilientes no Split Dual (`ConciliacaoLojasView.tsx`):**
   - Ao consumir objetos de filiais, o frontend NUNCA deve depender exclusivamente de chaves específicas de uma única migração.
   - Deve encadear `rawLog?.entradas_conciliadas ?? rawLog?.entradas_previsto ?? ((ofx_maquininhas || 0) + (pix_total || 0) + (entradas_justificadas || 0))` e `Math.max(0, ofxEntradas - concEntradas)`. Isso erradica a renderização de colunas zeradas com badges enganosos de "100% Conciliado".
2. **Pré-Compressão de Imagens em Canvas no Cliente (`OcrBatchDropzoneAndPaste.tsx`):**
   - Prints do sistema em 1080p/1440p (3MB a 8MB) DEVEM ser redimensionados no navegador via HTML5 Canvas para max 1280px e exportados como JPEG 82%. Isso reduz o pacote para ~180KB (redução de 95%), eliminando gargalos de rede, estouro de memória e timeouts no Vision.
3. **Gerenciador Nativo de Receitas Extras (`RevenueAdjustmentsCard.tsx`):**
   - Lançamentos corporativos de faturamento (aluguéis, rateios, estornos) devem ter interface visual direta no Step 3 de inputs manuais, com soma em tempo real ao faturamento total.

---

## [2026-09-02] — [Feature ID: 354-controle-os-excel-accordion-por-loja]

**Contexto:** Implementação da visualização de Controle de OS Estilo Planilha Excel por Loja em blocos expansíveis (Accordion) com tabela de split completa (Pix, Crédito, Débito, Dinheiro, Total Pago, Restante) e mini popover flutuante para lançamentos múltiplos/cumulativos na própria linha.

**Regra aprendida:**
1. **Excel UI & Lançamentos em Linha (`PatioExcelStoreAccordion.tsx`):**
   - Apresentar as lojas como blocos sanfona independentes com métricas em tempo real (`Total OS`, `Total Pago`, `Restante`).
   - Salvar o estado de expansão/recolhimento das lojas em `localStorage` (`patio_expanded_stores:v2`).
   - Usar mini popover inline (com atalho `[ ⚡ Usar restante ]` e botão `Zerar`) para lançar múltiplos meios de pagamento sem modais intrusivos.
   - Decompor visualmente os splits de pagamento nas colunas correspondentes e recalcular automaticamente `paid_value` e `pending_value`.

---

## [2026-09-02] — [Feature ID: 353-redesign-clean-patio-e-faturamento-manual]

**Contexto:** Redesign radical e simplificação de UI no Step 1.5 (Pátio sem planilhas) e Step 3 (Valores Manuais), eliminando poluição visual ("cockpit de avião") em favor de um layout Dark UI Zinc-950 sóbrio, com botões 1-clique essenciais e formulários inline compactos.

**Regra aprendida:**
1. **Ergonomia e Densidade de Informação em Pátio (`PatioManualStoreGrid.tsx`):**
   - Evitar sobrecarregar tabelas com dezenas de botões e badges concorrentes.
   - Fornecer 3 botões claros de pagamento (`[ PIX ]`, `[ Cartão ]`, `[ Dinheiro ]`) e formulário de adição rápida de OS em apenas 3 campos essenciais (`Nº OS`, `Valor R$`, `Forma de Pagamento`).
2. **Grid Unificado e Consistente de 4 Cards Manuais (`CentralImportWizard.tsx`):**
   - Evitar bifurcar o layout do Step 3 com calculadoras volumosas.
   - Manter sempre os 4 cards simétricos (`Faturamento/Odômetro`, `Dinheiro MP`, `A Receber`, `Contas a Pagar`), inserindo a sugestão calculada do Mapa de Metas de forma discreta (`💡 Sugestão [Usar]`) diretamente dentro do primeiro card.

---

## [2026-09-02] — [Feature ID: 352-fix-runtime-car-icon-import]

**Contexto:** Correção de importação do ícone `Car` de `lucide-react` em `CentralImportWizard.tsx` para sanar o erro em tempo de execução `ReferenceError: Car is not defined`.

**Regra aprendida:**
1. **Importação Explícita de Ícones Lucide:**
   - Todo e qualquer componente visual instanciado em JSX (`<Car />`, `<Zap />`, etc.) deve estar explicitamente incluído no bloco de desestruturação de `lucide-react` do arquivo pai para evitar falhas de runtime na montagem do componente no browser.

---

## [2026-09-02] — [Feature ID: 351-fix-case-sensitive-ui-button-imports]

**Contexto:** Correção de case sensitivity em importações de componentes UI (`Button` em vez de `button`) para compatibilidade com ambiente Linux / Lovable / Cloudflare.

**Regra aprendida:**
1. **Case-Sensitivity Estrito em Imports de UI (`src/components/ui/`):**
   - Sempre usar PascalCase idêntico ao arquivo no disco (`import { Button } from '@/components/ui/Button'`).
   - A diretiva `"forceConsistentCasingInFileNames": true` no `tsconfig.json` atua como guardrail estático.

---

## [2026-09-02] — [Feature ID: 350-faturamento-assistido-mapa-metas-e-gestao-patio-sem-os]

**Contexto:** Criação dos componentes `PatioManualStoreGrid.tsx` e `PatioManagementDualModal.tsx` com 2 abas (Gestão Manual com chips de 1-clique para formas de pagamento e Ingestão OCR), e `AssistedRevenueCalculator.tsx` para o cálculo automático de faturamento no Step 3 na ausência de arquivos XLS de OS.

**Regra aprendida:**
1. **Chips Rápidos de 1-Clique para Meios de Pagamento (`PatioManualStoreGrid.tsx`):**
   - Ao fornecer chips rápidos (`[ ⚡ PIX ]`, `[ ⚡ Crédito ]`, `[ ⚡ Débito ]`, `[ ⚡ Dinheiro ]`), popular instantaneamente tanto o valor pago quanto a coluna numérica específica de split (`pix_transfer_value`, `credit_value`, `debit_value`, `cash_value`) para permitir o auto-match determinístico subsequente com o extrato OFX e a Rede.
2. **Calculadora Condicional Assistida de Faturamento (`AssistedRevenueCalculator.tsx`):**
   - Exibir a equação interativa `(Faturamento Conciliação Ant. - Faturamento Mês Ant.) + Faturamento Mapa de Metas = Faturamento Sugerido` **estritamente quando `results.osFiles.length === 0`**, mantendo o odômetro padrão 100% inalterado quando houver planilhas de OS.

---

## [2026-09-01] — [Feature ID: 335-justificativa-saidas-ofx-e-equalizacao-matematica-cards]

**Contexto:** Atualização do modal `OrphanCategorizationModal.tsx` para suporte polimórfico a saídas (com temas visuais Rose, categorias de despesas e seleção de impacto no Contas a Pagar vs Apenas Conciliar) e liberação do botão "Justificar / Editar" em débitos na view `StoreExtratoBancarioView.tsx`. Atualização dos sub-rótulos descritivos do Split Dual no `StoreCardModulo1.tsx`.

**Regra aprendida:**
1. **Modal Polimórfico de Transações Órfãs (`OrphanCategorizationModal.tsx`):**
   - Se `transactionType === 'out'`: adota paleta Rose, categorias de fornecedores, autopeças, pró-labore, impostos, e toggle explícito de destino contábil.
   - Se `transactionType === 'in'`: adota paleta Emerald/Purple, categorias de aportes, seguros, transferências e toggle para faturamento.
2. **Sub-rótulos Explicativos nos Cards:**
   - Exibir no bloco de Entradas: `OFX Entradas (Lote Rede D-1 / Crédito no Banco) | Conciliado (Lotes Identificados) | Dif. a Justificar`.
   - Exibir no bloco de Saídas: `Saídas OFX (Débito no Banco) | Contas / Boletos (Despesas da Loja) | Dif. a Justificar`.

---

## [2026-09-01] — [Feature ID: 334-transparencia-entradas-ofx-empilhamento-cards-rpc]

**Contexto:** Refatoração de layout no `StoreCardModulo1.tsx` com `Vertical Stack` (linhas individuais para Saldo Total, Rede Total e Saldo em Pátio) evitando compressão horizontal e truncamento de texto.

**Regra aprendida:**
1. **Vertical Stack em Cartões de Painel:**
   - Em layouts compactos com números monetários de até 8 dígitos e badges adjacentes, empilhar verticalmente os blocos evita estouro de largura e garante legibilidade sem truncamentos `...`.

---

## [2026-09-01] — [Feature ID: 279-correcao-fechamento-por-filial-e-detalhamento-lojas]

**Contexto:** Modularização do card de filiais em `StoreCardModulo1.tsx` e container `ConciliacaoLojasView.tsx` com Dark UI Zinc-950 e preservação de data na navegação.

**Regra aprendida:**
1. **Componentização Modular de Cards de Loja:**
   - O layout das 6 métricas (Saldo Total, Maquininha, PIX, Na Loja OS, Previsto, Diferença) foi isolado em `StoreCardModulo1.tsx` com a interface `StoreCardData`, eliminando casts `(rawLog as any)` e duplicações de código.
2. **Badges de Status Informativas:**
   - `ENTROU` (emerald), `A COMPENSAR (+ R$)` (amber), `DIVERGÊNCIA` (rose), `SEM MOVIMENTO` (zinc).
3. **Preservação de Contexto Temporal na Navegação:**
   - Ao navegar de `/conciliacao` para `/conciliacao/:lojaId` e retornar, o link deve sempre repassar o search param `search={{ date: targetDate }}` para não perder a data selecionada pelo usuário.

## [2026-09-01] — [Feature ID: 315-correcao-rpc-conciliacao-e-blindagem-snapshots]

**Contexto:** Implementação de guarda visual de integridade `isStoreBreakdownCorrupted` e resolução resiliente de propriedades por filial na interface de conciliação diária.

**Regra aprendida:**
1. **Guarda Visual Anti-Corrupção em Painéis de Ação:**
   - Quando o detalhamento das 10 filiais estiver zerado enquanto houver movimentação macro consolidada, o botão "Salvar Fechamento" deve ser desabilitado (`disabled={isStoreBreakdownCorrupted}`) com classe `disabled:opacity-50 disabled:cursor-not-allowed` e tooltip de advertência para evitar salvamento de dados inválidos.
2. **Resolução Resiliente de Propriedades de Lojas:**
   - Em `conciliacao.index.tsx`, utilizar fallback encadeado: `saldo_banco ?? saldo_banco_itau ?? saldo_banco_ofx`, `maquininha ?? rede_liquido`, `pix ?? pix_os`, `na_loja_os ?? patio_os`, garantindo que os cards das filiais sempre renderizem corretamente tanto em modo aberto quanto em modo de snapshot histórico.

## [2026-08-31] — [Feature ID: 328-equalizacao-definitiva-5-pilares-conciliacao-3108]

**Contexto:** Atualização dos Header Cards no `SaldoBancosDetailModal.tsx` e `ResumoDiaPanel.tsx` para apresentar de forma clara e segregada os saldos Bancos Positivos (Real) e (-) Cheque Especial (Real) com compensação intra-loja, além da decomposição de receitas e despesas.

**Regra aprendida:**
1. **Header Cards Segregados no Modal de Bancos:**
   - 5 Header Cards no padrão Dark UI: *Bancos Positivos (Real)*, *(-) Cheque Especial (Real)*, *Dinheiro no Cofre*, *A Compensar*, e *Líquido Holding*.
2. **Sub-chips Adaptativos no Painel de Conciliação:**
   - O card do Pilar 1 renderiza chips com tipagem e valores normalizados vindos da RPC, mantendo a harmonia visual em qualquer resolução.

## [2026-08-31] — [Feature ID: 322-conciliacao-saidas-ofx-contas-e-justificativa-despesas-orfas]

**Contexto:** Reformulação do Step 5 (`Step2NonRevenueJustifications.tsx`) com sistema de 2 abas (Entradas Órfãs / Saídas Órfãs), chips de categoria rápida e botões de destinação contábil no padrão Dark UI Zinc-950.

**Regra aprendida:**
1. **Abas Segmentadas em Justificativas:**
   - Permite alternância rápida entre créditos e débitos com badges de contagem e status de salvamento.
2. **Feedback Visual Imediato no DRE:**
   - Badges e toggles explicitam com clareza o impacto de cada movimentação (*"📈 Soma ao Faturamento"*, *"📈 Soma ao Contas a Pagar"*, *"🚫 Apenas Conciliar"*).

## [2026-08-31] — [Feature ID: 321-motor-automatch-ia-e-unificacao-vinculo-pix-rede-wizard]

**Contexto:** Unificação do `ManualMatchOsModal.tsx` para gerenciar tanto PIX quanto vendas da Rede com o mesmo modal de alta afinidade e score (100, 80, 60), isolado estritamente pela filial da transação (`store_id`), e integração direta com o Step 1 do wizard (`Step1UnregisteredPayments.tsx`).

**Regras aprendidas:**
1. **Padrão Unificado de Match:**
   - O modal de vínculo exibe metadados ricos: NSU, bandeira e modalidade para cartões, e contraparte/banco para PIX.
   - Os candidatos a OS são ordenados pelo score de similaridade e menor diferença de saldo, exibindo badges `Match Nome + Valor`, `Match por Nome` ou `Match por Valor`.

## [2026-08-31] — [Feature ID: 320-persistencia-contas-manual-e-gestao-de-despesas]

**Contexto:** Adição do `EditBillModal` dentro de `ContasManualModal.tsx` para edição rápida de despesas com botão `Pencil`, e badge visual `Ajustado` no card de *Contas (Manual)* do `ResumoDiaPanel.tsx`.

## [2026-08-27] — [Feature ID: 310-novo-wizard-importacao-e-conciliacao-passo-a-passo]
## [2026-08-27] � [Feature ID: 310-novo-wizard-importacao-e-conciliacao-passo-a-passo] (fix: normalize all workflow view_file paths to global skills directory)

**Contexto:** Nova esteira modular de importa��o e fechamento di�rio em `UnifiedReconciliationWizard.tsx`, estruturada em 5 etapas visuais (`0. Ingest�o Global`, `1. Pagamentos sem OS`, `2. Justificativas`, `3. Cofre & Daniel`, `4. Fechamento Final`).

**Regras aprendidas:**
1. **Stepper de Navega��o Superior:**
   - Tabs superiores numeradas (`0. Ingest�o Global`, `1. Pagamentos sem OS`, etc.) com `border-b-2 border-emerald-500` ativo e sem fundos verdes arbitr�rios, mantendo a consist�ncia do Dark UI Zinc-950.
2. **V�nculo Direto de 1 Clique � OS (`Step1UnregisteredPayments.tsx`):**
   - Modal com busca instant�nea de OSs em aberto (`patio_os`) por placa, cliente, carro ou n�mero de OS.
   - Cada card de OS possui bot�o *"Vincular (1 Clique)"*, aplicando a heran�a autom�tica do valor e do meio de pagamento detectados na transa��o sem dropdowns extras.
3. **Justificativas Edit�veis / Cancel�veis (`Step2NonRevenueJustifications.tsx`):**
   - Card com bot�es de a��o contextuais: bot�o prim�rio para salvar, bot�o de edi��o para reabrir o formul�rio inline, e bot�o com `Undo2` para cancelar/desfazer a qualquer momento antes do fechamento.
4. **Card Pergunta Operacional (`Step3CashVaultDaniel.tsx`):**
   - Pergunta em destaque com bot�es de r�dio estilizados `[SIM]` e `[N�O]`, expandindo a tabela das 10 filiais apenas em caso afirmativo para n�o sobrecarregar visualmente o operador.
5. **Painel de Auditoria dos 5 Pilares (`Step4FinalAuditAndClose.tsx`):**
   - 5 cards com borda lateral esquerda (`border-l-4`), bot�o destacado de IA `gemini-3.5-flash-lite`, e hero card de sem�foro com toler�ncia cont�bil de $\pm	ext{R\$}~50$.

**Risco identificado / Anti-pattern:** Nunca quebrar a experi�ncia do operador com modais de confirma��o desnecess�rios em a��es determin�sticas j� informadas pela fonte do dado.

## [2026-08-26] � [Feature ID: 291-preservacao-total-transacoes-ofx-e-heranca-conciliacoes-historicas]

**Contexto:** Padr�o de trava visual e filtro para transa��es conciliadas em outras datas.

**Regras aprendidas:**
1. **Badge de Trava com Cadeado (Lock):**
   - Transa��es com `isLockedFromOtherDate === true` exibem badge `?? Conciliado em [DD/MM/AAAA]` e coluna de a��es com `Somente Leitura`.
2. **Pill de Filtro Espec�fico:**
   - Adicionar bot�o `[ ?? Outras Concilia��es (N) ]` no cabe�alho de filtros para segmenta��o instant�nea.

## [2026-08-26] � [Feature ID: 290-extrato-bancario-completo-entradas-saidas-e-filtros]

**Contexto:** Padr�o de Extrato Banc�rio Completo por Filial com 4 cards de KPIs de fluxo, barra de filtros segmentados por status com contadores, busca em tempo real e badges coloridos para v�nculos de OS, Rede e Contas Pagas.

**Regras aprendidas:**
1. **Filtros Segmentados com Contadores Din�micos:**
   - Bot�es compactos: `[ Todas (N) ]`, `[ ?? Pendentes (N) ]` (�mbar se > 0), `[ Entradas (+N) ]` (verde), `[ Sa�das (-N) ]` (vermelho), `[ Contas Pagas (N) ]` (teal), `[ Rede (N) ]` (azul), `[ PIX OS (N) ]` (roxo).
2. **Padr�o Visual Estritamente Nativo:**
   - Manter paleta Zinc-950, cards Zinc-900 border-zinc-800, tipografia padr�o do projeto e formata��o mono para moeda pt-BR. Zero glassmorphism.

## [2026-08-25] � [Feature ID: 284-reestruturacao-modulo-recebiveis-por-loja-e-snapshot]

**Contexto:** Reestrutura��o da tela de Receb�veis (`src/routes/recebiveis.tsx`), espelhando 1:1 o padr�o can�nico de `src/routes/patio.tsx`.

**Regras aprendidas:**
1. **Padroniza��o Can�nica de Telas de Listagem Financeira:** Telas anal�ticas de segundo n�vel (P�tio, Receb�veis, Despesas) DEVEM seguir o mesmo padr�o:
   - Header com T�tulo, `<Badge variant="success">` para contadores em aberto, Input de busca, Dropdown de Loja (apenas lojas ativas) e bot�es de a��o (`Button` padr�o e `variant="outline"`).
   - 4 Summary Cards com `border-l-4` para m�tricas consolidadas instant�neas.
   - Abas de status (`TabBtn`) com border-b-2 discreto.
   - Timeline list dentro de `<Card className="p-0 overflow-hidden mt-4">` com `divide-y`, avatares circulares coloridos por status e pagina��o padr�o.
2. **Elimina��o de Cores Artificiais:** N�o usar tons `bg-amber-500` soltos em bot�es mestre; usar `bg-[var(--color-primary)]` para bot�es prim�rios e `border-white/10` para outline.
3. **Isolamento Estrito de M�dulos:** Nunca mesclar fluxos n�o solicitados (ex: Auditoria de Taxas MDR) dentro da rota de Receb�veis/Boletos.

## [2026-08-24] � [Feature ID: 276-modal-vinculo-manual-pix]

**Contexto:** Props e comportamento de ManualMatchOsModal.tsx e StoreExtratoBancarioView.tsx.

**Regra aprendida:** Sempre repassar 	argetDate para modais de concilia��o para permitir queries temporais precisas no React Query.

## [2026-08-10] � [Feature ID: 153-raw-imports-excel]

**Contexto:** O componente legado de bot�es e tabelas "Raio-X de Lotes" (`ImportSourceBadges`, `RawOfxTable`, etc.) era confuso, quebrado visualmente e n�o servia ao prop�sito de exibir os extratos reais importados de forma leg�vel. Substitu�do por `ExtratosImportacaoModal.tsx`.

**Regra aprendida:** Visualiza��es de auditoria cont�bil bruta (como logs de importa��o OFX ou Maquininha) DEVEM obedecer uma tipografia condensada e layout de data-grid (Excel-like). Isso significa: uso intensivo de tabelas cruas, bordas simples (`border-collapse`), cores sem�nticas exatas (verde/vermelho), sem cards inflados ou badges decorativos perdidos. O usu�rio n�o quer abstra��o quando pede "Extratos Brutos".

**Risco identificado:** Renderizar campos nulos ou formata��es de data quebradas. Como a visualiza��o � crua, `occurred_at` ou `fitid` nulos precisam exibir fallback visual como `�` para manter o alinhamento do grid perfeito.

**N�o fazer:** Nunca separar componentes que compartilham contexto restrito em 10 arquivos min�sculos de UI de tabela, quando um �nico arquivo de Modal com fun��es de renderiza��o coesas (`renderOfx()`, `renderRede()`) resolve o problema de maneira muito mais sustent�vel e simples no React, dada a alta similaridade e condensa��o.

## [2026-08-10] � [Feature ID: 156]

**Contexto:** Ocorreu um erro de regress�o na tabela de detalhamento da concilia��o (`BreakdownModal.tsx`) com o aviso `TypeError: s.ofx_in.map is not a function`. Isso foi causado porque uma Spec anterior (155) alterou o formato da resposta JSON da RPC do Supabase de flat (Arrays na raiz) para nested (Objetos aninhados com `transactions` e `total`) sem atualizar a tipagem do Front.

**Regra aprendida:** As props e acessores em tabelas JSX (.map) devem refletir precisamente a �rvore de objetos da resposta Supabase. O `useConciliationBreakdown` foi atualizado para estruturar as sub-arrays (`{ total, transactions }`), e o JSX deve ler com safe-chaining (`ofx_in.transactions.map`).

**Risco identificado:** Alterar selects do PostgreSQL estruturados em `json_build_object` quebra a aplica��o Frontend sem causar erros de compila��o de banco.

**N�o fazer:** Nunca reescreva o JSON de sa�da de uma RPC do Supabase sem varrer o hook React e o componente correspondente na mesma itera��o de Spec.

## [2026-08-10] � [Feature IDs: 159, 160]

**Contexto:** Corre��o do fluxo de Sincroniza��o Cloud. Injetado feedback via Toast na rotina ass�ncrona da nuvem e um campo Date nativo (HTML5) no Painel de Sincroniza��o para alimentar o Bot.

**Regra aprendida:** O estado `importLogs` isolado numa tab/step tardia pode mascarar os processos background (VPS Bot). A UX exige um Toast instant�neo quando uma tarefa for enfileirada no backend para dar a resposta `ok` otimista para o usu�rio. 
Ao criar fluxos `onClick` que disparam Edge Functions lentas, sempre usar Toasts nativos independentemente de Logs de terminal que estejam escondidos.

**Risco identificado:** A depend�ncia em Date object para fuso hor�rio � perigosa. Passar puramente strings `YYYY-MM-DD` por `encodeURIComponent` at� a VPS � o caminho mais seguro para evitar conflitos de TZ.

## [2026-08-10] � [Feature ID: 161]

**Contexto:** Cria��o do AgentRunnerModal. O bot�o est�tico de Sincronizar da Cloud foi convertido para uma UI imersiva de Agente (Vercel/OpenAI style) com collapsibles de `Framer Motion`. 

**Regra aprendida:** Em tarefas longas e ass�ncronas (como Web Scraping), o uso de uma sanfona animada que destrincha as Sub-tasks (`subSteps`) tira a sensa��o de que o App travou. O usu�rio ganha a percep��o de que a IA est� operando de fato. 

**Risco identificado:** Mockar os estados e tempos. Para ficar perfeito num App de produ��o severa, o ideal � usar WebSockets. Aqui usamos timeouts simulados mais um Polling final na tabela, para mitigar o delay.

## [2026-08-14] � [Feature ID: 197-odometer-faturamento-and-ui-cleanup]

**Contexto:** Trava de edi��o de inputs na concilia��o e faxina visual no modal de importa��o centralizada.

**Regra aprendida:**
1. **Modo Leitura por Padr�o (isEditing):** O painel de concilia��o di�ria (ResumoDiaPanel.tsx) deve abrir como visualiza��o est�tica s�lida com n�meros formatados (AnimatedNumber) e badges. Apenas o bot�o 'Editar Fechamento' habilita os campos de formul�rio, prevenindo re-renderiza��es e disparos acidentais de muta��es.
2. **Bot�es de Confirma��o Expl�citos:** No modo de edi��o, exibir sempre 'Salvar Altera��es' (grava��o em lote) e 'Cancelar' (restaura��o segura do estado).
3. **Modal de Importa��o Despolu�do:** Eliminar steppers multi-circulares gigantes do topo do modal. Logs t�cnicos e sa�das de terminal devem ser recolhidos em accordion/details colaps�vel monospaced sob demanda (Logs de Depura��o).

**Risco identificado:** Deixar inputs controlados soltos no topo da concilia��o que atualizam o banco de dados a cada tecla pressionada.

**N�o fazer:** Nunca misturar steppers visuais com logs crus de terminal na mesma viewport sem colapsamento.

## [2026-08-14] � [Feature ID: 198-manual-os-diff-resolution-in-import-modal]

**Contexto:** Tabela de ajuste manual direto para OSs ausentes na etapa de pr�-visualiza��o (Step 3) do modal de importa��o centralizada.

**Regra aprendida:**
1. **Grid de Edi��o Inline no Preview:** Na tela de preview de importa��o, quando detectadas OSs ativas ausentes na planilha, exibir card com tabela contendo inputs livres num�ricos para Total, Pago e Select de Status.
2. **Destaque Visual:** Linhas modificadas pelo operador ganham destaque sutil de fundo (`bg-amber-500/5`) para f�cil confer�ncia antes de salvar.

**Risco identificado:** Poluir o fluxo de importa��o com m�ltiplos sub-modais confusos. A tabela inline integrada no Step 3 mant�m o fluxo fluido e direto.

**N�o fazer:** Nunca disparar requisi��es de update ao banco a cada tecla digitada dentro da tabela de preview.

## [2026-08-14] � [Feature ID: 199-unified-single-flow-import-modal]

**Contexto:** Modal `ImportConciliacaoModal.tsx` em Dark UI s�lido (Zinc-950) de 2 colunas responsivas para importa��o e fechamento di�rio.

**Regra aprendida:**
1. **Dark UI S�lido (Sem Glassmorphism):** O modal utiliza fundo `bg-zinc-950`, cards `bg-zinc-900` com bordas `border-zinc-800` e bot�o de a��o prim�ria em `bg-emerald-600`, atendendo integralmente ao contraste WCAG 2.1 AA.
2. **Foco e Teclado:** Inputs manuais possuem anel de foco `focus:ring-2 focus:ring-emerald-500` com fontes em escala >= 16px para evitar fadiga visual.

**Risco identificado:** Transpar�ncias ou efeitos visuais excessivos que prejudicam a leitura r�pida de tabelas financeiras de alta densidade.

**N�o fazer:** Nunca misturar steppers temporais com pain�is est�ticos de dados quando todas as vari�veis do fechamento precisam ser ajustadas antes de gravar.

## [2026-08-14] � [Feature ID: 200-202-import-reactive-flow-and-marco-zero]

**Contexto:** `DailyImportView.tsx` em tela cheia com Dark UI s�lido (Zinc-950/Zinc-900/Zinc-800).

**Regra aprendida:**
1. **Transpar�ncia de C�digo (JSON Inspector):** Blocos de c�digo colaps�veis (`<details>`) estilizados como terminal (`bg-zinc-950 font-mono text-xs text-emerald-400`) aumentam a confian�a do operador e facilitam depura��o em tempo real.
2. **Trava de Seguran�a em Inputs Manuais:** Inputs num�ricos cr�ticos de fechamento (`Od�metro`, `Dinheiro MP`, `A Receber`, `Contas`) devem possuir bot�o de trava/destrava (`isManualLocked`) para evitar altera��es n�o intencionais durante confer�ncias r�pidas.

**Risco identificado:** Falta de feedback visual durante opera��es em lote com m�ltiplos arquivos e transa��es.

**N�o fazer:** Nunca disparar muta��es em lote no Supabase sem fornecer barra de progresso por fases e terminal de logs com timestamp.

## [2026-08-17] � [Feature IDs: 214, 215, 216 � Loja Detalhes, Gr�ficos Anal�ticos e Evolu��o Temporal]

**Contexto:** Redesenho completo da tela de detalhes da loja (`/loja/$lojaId`) com gr�fico Donut contextual (`LojaPieCharts.tsx`), gr�fico de evolu��o di�ria em 3 linhas (`LojaEvolutionChart.tsx`), fixa��o do saldo banc�rio no �ltimo OFX importado e blindagem de datas a partir do Marco Zero (13/08/2026).

**Regra aprendida:**
1. **Gr�fico Donut Contextual por Aba:** Em vez de bot�es manuais redundantes dentro do card do gr�fico, o Donut Chart deve derivar seu modo automaticamente da aba selecionada na tabela (`Extrato` -> Geral Receita x Despesa, `Sa�das` -> Despesas por Fornecedor em cores macro, `Entradas` -> Receitas por Origem).
2. **Gr�fico de Linhas Triplo de Evolu��o Di�ria:** O componente `LojaEvolutionChart` renderiza 3 curvas temporais di�rias (Entradas em Verde `#10b981`, Sa�das em Coral `#f43f5e` e Saldo L�quido em Azul `#3b82f6`) com tratamento defensivo para per�odos de 1 �nico dia.
3. **Saldo em Conta Desacoplado do Filtro de Data:** O card de Saldo da Loja e Valor Dispon�vel deve refletir de forma fixa a posi��o patrimonial real mais recente do extrato OFX, independente do intervalo de datas selecionado para visualiza��o do extrato.

**Risco identificado:** Excesso de fatias min�sculas no gr�fico de despesas por fornecedor causando polui��o visual.

**N�o fazer:** Nunca renderizar fornecedores com representatividade < 2.5% como fatias individuais no gr�fico de pizza; consolidar sempre em 'Outros Fornecedores'.

## [2026-08-17] � [Feature ID: 217]

**Contexto:** Implementa��o do m�dulo `MdrAuditView.tsx` e preven��o de TDZ ReferenceError em wizards de importa��o.

**Regra aprendida:**
- Todos os hooks de estado, mutation e queries (`useStores`, `useCentralImport`, `useNavigate`, etc.) DEVEM ser declarados no topo absoluto dos componentes funcionais antes de qualquer callback, helper ou `useEffect` que possa referenci�-los. No bundle minificado de produ��o, vari�veis declaradas ap�s callbacks que as fecham em closure disparam `ReferenceError: Cannot access 'X' before initialization`.
- O design de auditoria de taxas utiliza KPIs de topo (Zinc-950), badges com sem�foro (`Conforme`, `Aten��o`, `Divergente`), comparativo gr�fico em Recharts e bot�o de exporta��o CSV para contesta��o r�pida com a adquirente.

**Risco identificado:** Callbacks criados no topo que fecham sobre vari�veis de hooks declaradas mais abaixo.

**N�o fazer:** Nunca declarar hooks ap�s fun��es de utilidade interna ou handlers no corpo do componente.

## [2026-08-21] � [Feature ID: 261]

**Contexto:** Inclus�o de tabela interativa de edi��o livre de Ordens de Servi�o (Valor Total, Total Pago e Status) no Step 3 de confer�ncia da importa��o centralizada, e ajuste de nomenclatura para Saldo Total Banc�rio (OFX).

**Regra aprendida:**
- Na etapa de preview/confer�ncia de importa��es de p�tio (`CentralImportWizard.tsx`), exibir SEMPRE a tabela completa de todas as OSs importadas (`results.osFiles`) com inputs edit�veis num�ricos (`total_value`, `paid_value`) e status selector.
- As altera��es do usu�rio devem mutar reativamente o estado do parser (`results.osFiles` via `setResults`), recalculando instantaneamente os cards de resumo do topo (`Total OS`, `Estoque em P�tio`) e as previs�es por loja.
- A tabela deve incluir pagina��o elegante (50 itens por p�gina), busca r�pida instant�nea por OS/placa/filial, filtro por loja e filtro por status, com badge de `Editado` para destacar linhas customizadas.

**Risco identificado:** Atraso ou descompasso entre a edi��o local de uma OS e os reducers de faturamento e p�tio. A muta��o direta e imut�vel de `results.osFiles` garante sincronia de fonte �nica de verdade.

**N�o fazer:** Nunca for�ar o usu�rio a aprovar um fechamento de OSs sem uma tabela aberta onde ele possa visualizar e retificar valores de ordens de servi�o caso o relat�rio do ERP tenha vindo com inconsist�ncias.


## [2026-08-21] � [Feature ID: 262-restaurar-tabela-exclusiva-os-ausentes-preview]

**Contexto:** Restaura��o e isolamento da tabela exclusiva de OSs Ausentes no Step 3 de confer�ncia da importa��o centralizada (`CentralImportWizard.tsx`).

**Regra aprendida:**
- No Step 3 do Wizard, NUNCA renderizar uma tabela massiva com todas as centenas de OSs da planilha rec�m-importada, pois esses dados j� foram atualizados diretamente pelo arquivo.
- O �nico grupo de OSs que necessita de interven��o manual e inputs edit�veis s�o as **OSs Ausentes / �rf�s** (aquelas que est�o ativas no banco de dados mas N�O vieram no relat�rio importado do p�tio).
- A tabela de OSs ausentes deve exibir badge �mbar, barra de busca por placa/OS/loja, inputs de `total_value`, `paid_value` e seletor de `status` (`em_aberto`, `pago_parcial`, `finalizado`, `cancelado`), calculando em tempo real o `Saldo Pendente`.

**Risco identificado:** Polui��o visual com centenas de OSs desnecess�rias que ocultam as poucas ordens que realmente exigem auditoria.

**N�o fazer:** Nunca misturar ordens presentes no arquivo com ordens ausentes em tabelas gen�ricas n�o filtradas.

## [2026-08-21] � [Feature ID: 263-tabela-unificada-os-preview-com-filtros-e-edicao-livre]

**Contexto:** O operador necessita visualizar e auditar permanentemente todas as Ordens de Servi�o no Step 3 de confer�ncia da importa��o (`CentralImportWizard.tsx`), com controles de filtro r�pido por p�lulas com contadores.

**Regra aprendida:**
- A tabela de Ordens de Servi�o no Step 3 do Wizard NUNCA deve ser ocultada condicionalmente. Deve exibir a lista unificada (`allPreviewOsList`) consolidando ordens dos arquivos importados e ordens ausentes do banco.
- Incluir 4 p�lulas de filtro r�pido no topo com badges de contagem din�mica:
  1. `Todas as OSs ({all})`
  2. `Ausentes no Relat�rio ({missing})`
  3. `Recebimentos do Dia ({paidToday})`
  4. `Estoque em P�tio ({openYard})`
- Todas as linhas disp�em de inputs inline edit�veis para `total_value`, `paid_value` e seletor de `status`, com badge de `[Planilha do Dia]`, `[Ausente no Relat�rio]` ou `[Editado]`.

**Risco identificado:** Ocultar a tabela quando uma sub-condi��o for vazia, deixando o usu�rio sem visibilidade das centenas de OSs carregadas.

**N�o fazer:** Nunca esconder a tabela de confer�ncia de OSs no preview quando houver arquivos de OS importados.

## [2026-08-24] � [Feature ID: 264 & 265]

**Contexto:** Painel de Auditoria Pr�-Fechamento (`DiagnosticPanel.tsx`) no Step 3 e transpar�ncia no Card de Contas (`ResumoDiaPanel.tsx`).

**Regra aprendida:**
- O `DiagnosticPanel` roda no Step 3 do `CentralImportWizard` confrontando os 5 pilares patrimoniais (P�tio, Banco OFX, Dinheiro MP, A Receber, Contas) contra as m�dias dos �ltimos 5 dias, com toler�ncia din�mica de `max(R$ 500, 2% do faturamento)`.
- O card de Contas no `ResumoDiaPanel` detalha visualmente `Base Planilha` + `Extras Manuais` + `Juros Rede`, evitando confus�o sobre a forma��o do subtotal.
- Padr�o visual: Dark UI (Zinc-950/Zinc-900), sem bal�es de chat, sem linguagem de IA, tipografia Inter/mono.

## [2026-08-24] � [Feature ID: 266 & 267]

**Contexto:** Editor de OSs Ausentes no P�tio (`MissingPatioOsEditor.tsx`) no Step 3 da importa��o centralizada.

**Regra aprendida:**
- O `MissingPatioOsEditor` renderiza no Step 3 de `CentralImportWizard` permitindo ao operador editar o Valor Total, Valor Pago e Status das OSs que sumiram do relat�rio do p�tio de hoje.
- O componente exibe um card de resumo financeiro comparando Saldo Original vs Saldo Novo e o Impacto L�quido (? R$) em tempo real.
- Padr�o visual: Dark UI s�lido (Zinc-900 / Zinc-950), badges �mbar e bot�es de a��o r�pida em lote.

## [2026-08-24] � [Feature ID: 269 � Simplifica��o Step 3 OSs e Diagn�stico de Juros/Rede]

**Contexto:** Elimina��o da duplicidade de cards/tabelas de OSs na Step 3 do `CentralImportWizard.tsx`. O usu�rio precisava apenas do card focado nas OSs ausentes para ajuste manual.

**Regra aprendida:**
- Na Step 3 de importa��o, NUNCA renderizar duas tabelas de OSs simult�neas (uma de ausentes e outra geral redundante de 300+ linhas). O operador necessita estritamente do card `<MissingPatioOsEditor />` para concentrar a auditoria nas OSs que de fato exigem interven��o manual.
- O estoque em p�tio total (`computedTotalPatioEstoque`) deve ser calculado diretamente da soma das OSs dos arquivos importados + OSs ativas ausentes no banco, sem depender de listas secund�rias no DOM.

**Risco identificado:** Renderizar tabelas pesadas de centenas de linhas de preview que poluem visualmente e confundem o operador durante a valida��o pr�via.

**N�o fazer:** Nunca duplicar componentes de listagem e edi��o de OSs na mesma etapa do Wizard.

## [2026-08-24] � [Feature ID: 271 � Redesign da Concilia��o por Loja em 3 Abas]

**Contexto:** A tela `/conciliacao/$lojaId` continha 4 abas redundantes e confusas (duas abas de cart�o id�nticas, PIX isolado com status contradit�rios e aus�ncia de tabela dedicada de OSs).

**Regra aprendida:**
- A tela de cada filial deve ser estruturada estritamente em **3 abas limpas e sem redund�ncia**:
  1. `StoreCartaoMaquininhaView`: Unifica vendas em cart�o, MDR retido e status de liquida��o banc�ria (*Liquidado* vs *A Compensar*).
  2. `StoreExtratoBancarioView`: Formato cronol�gico de extrato banc�rio real, identificando com clareza lotes de adquirente, PIX/TED vinculados a OSs, receitas avulsas justificadas e pendentes (com a��es r�pidas de vincular/justificar/desvincular).
  3. `StoreOrdensServicoView`: Tabela dedicada de todas as OSs daquela loja, c�lculo de saldo em p�tio, bot�o de `+ Nova OS Manual` e edi��o de valores/status com rec�lculo em cascata.

**Risco identificado:** Criar abas com dados redundantes ou status visuais que parecem contradit�rios (ex: "Aguardando extrato" com badge verde).

**N�o fazer:** Nunca separar maquininha em duas abas que mostram os mesmos lan�amentos, e nunca isolar PIX do Extrato Banc�rio global da conta da filial.


## 2026-08-26 � [Feature ID: 297]

**Contexto:** Unifica��o visual do cabe�alho da p�gina de detalhe da loja (`conciliacao.$lojaId.tsx`).

**Regra aprendida:**
- **Header Unificado da Filial:** Substitu�do o bloco de 4 cards redundante pelo **Card Consolidado de Fechamento por Filial**, apresentando as 6 m�tricas padronizadas: Saldo Bancos + Cart�es, Maquininha, PIX, Na Loja OS, Previsto e Status/Diferen�a, alinhando a experi�ncia visual da home com a p�gina da loja.

## 2026-08-27 � [Feature ID: 298]

**Contexto:** Exibi��o de saldos devedores (cheque especial) e decomposi��o do saldo por filial.

**Regra aprendida:**
- Filiais com saldo consolidado negativo (`log.saldo_banco < 0`) devem exibir o valor em `text-rose-400` para alerta visual instant�neo de conta devedora/exposi��o a cheque especial, com breakdown detalhando OFX, Maquininha e Cofre.

## 2026-08-27 � [Feature ID: 299]

**Contexto:** Interface de fechamento com bot�es expl�citos de Salvar Fechamento e Editar Fechamento.

**Regra aprendida:**
- O painel de resumo di�rio (`ResumoDiaPanel.tsx`) deve apresentar bot�es claros de "Editar Fechamento" e "Salvar Fechamento", acompanhados de badge de status (`Fechamento Blindado & Consolidado` vs `Concilia��o Aberta`), gravando compulsoriamente `is_closed: true` ao salvar.

## 2026-08-27 � [Feature ID: 308]

**Contexto:** Padroniza��o do Modal de OSs do P�tio (`PatioOsDetailModal.tsx`), painel das 6 m�tricas executivas na vis�o da filial e abas can�nicas sem background.

**Regra aprendida:**
- **Modal de OSs do P�tio:** Deve utilizar rigorosamente os 4 Summary Cards can�nicos com borda lateral esquerda grossa (`border-l-4`), tipografia mono tabular para valores cont�beis (`<AmountCell>`), badges com indicador de ponto (`Badge variant="warning" dot` e `variant="brand" dot`) e toolbar de filtros integrada � paleta `bg-[var(--bg-surface)]`.
- **Abas da Filial sem Fundo Verde:** Abas de navega��o interna (`conciliacao.$lojaId.tsx`) devem seguir 1:1 o estilo plano de `src/routes/patio.tsx`, com `border-b-2 border-emerald-500 text-white font-semibold` na aba ativa e **SEM NENHUM BACKGROUND** (`bg-emerald-500/5` � terminantemente proibido).
- **Painel Executivo da Filial:** A vis�o individual da loja deve conter o mesmo painel escuro de 6 m�tricas (`SALDO TOTAL`, `Maquininha`, `PIX`, `Na Loja OS`, `Previsto`, `Diferen�a`) visto na home de fechamento, garantindo paridade cognitiva instant�nea ao operador.

**Risco identificado:** Tentar adicionar backgrounds coloridos ou estiliza��o ad-hoc nas abas de navega��o descaracteriza a consist�ncia visual em rela��o a outras telas densas como o P�tio.

**N�o fazer:** Nunca usar `bg-emerald-500/5` ou cart�es com bordas ad-hoc em modais cont�beis.


## [2026-08-30] � [Feature ID: 314] Teste E2E e Automa��o de Screenshots do Wizard
**Contexto:** Automa��o via Playwright com inje��o direta de m�ltiplos arquivos reais e captura de screenshots de cada step do assistente.
**Regra aprendida:**
- **Seletores e Scroll de Wizard:** Em telas longas com múltiplas contas/filiais (ex: 10 contas OFX), botões de navegação devem ser rolados para a visão (`scrollIntoViewIfNeeded()`) antes do clique interativo.
- **Formulário de Justificativa Canônico:** Manter paridade total entre o Passo 5 (`Step2NonRevenueJustifications.tsx`) e a tela de extrato (`OrphanCategorizationModal.tsx`), com dois botões de impacto claros (`Somar ao Faturamento` vs `Apenas Conciliar`), chips rápidos de categorias e campo de observação contábil.
**Risco identificado / Anti-pattern:** Não utilizar `<select>` puro para decisões financeiras de alto impacto; preferir botões de cards visuais com ícones representativos (`TrendingUp` e `Ban`).

## [2026-08-31] — [Feature ID: 327] Redesign de Header Cards e Paridade de 5 Pilares no Resumo do Dia
**Contexto:** Atualização visual dos cards do DRE diário (`ResumoDiaPanel.tsx`) e do modal de raio-x de saldos (`SaldoBancosDetailModal.tsx`) para refletir a segregação de Ativos Brutos, Cheque Especial Real e Faturamento Composto.
**Regra aprendida:**
1. **Header Cards Segregados no Modal de Saldos:** Exibir 5 cards no cabeçalho: `OFX Positivo`, `(-) Cheque Especial Real` (vermelho), `Dinheiro no Cofre` (âmbar), `A Compensar` (esmeralda) e `Líquido Disponível` (gradiente primário).
2. **Sub-chips no Card Saldo Bancos + Dinheiro:** O Hero Card do Pilar 1 renderiza sub-chips dinâmicos demonstrando os 4 componentes ativos com fontes mono e contraste WCAG AA.
3. **Badges de Filiais no Raio-X:** Badges contextualizados (`Compensado c/ Rede`, `Cheque Esp.`, `Com Dinheiro`, `Conciliado`).
**Risco identificado / Anti-pattern:** Nunca esconder ou omitir o pill de Cheque Especial no topo do painel quando houver filiais com saldo devedor real.

- **Seletores e Scroll de Wizard:** Em telas longas com m�ltiplas contas/filiais (ex: 10 contas OFX), bot�es de navega��o devem ser rolados para a vis�o (`scrollIntoViewIfNeeded()`) antes do clique interativo.
- **Formul�rio de Justificativa Can�nico:** Manter paridade total entre o Passo 5 (`Step2NonRevenueJustifications.tsx`) e a tela de extrato (`OrphanCategorizationModal.tsx`), com dois bot�es de impacto claros (`Somar ao Faturamento` vs `Apenas Conciliar`), chips r�pidos de categorias e campo de observa��o cont�bil.
**Risco identificado / Anti-pattern:** N�o utilizar `<select>` puro para decis�es financeiras de alto impacto; preferir bot�es de cards visuais com �cones representativos (`TrendingUp` e `Ban`). (fix: normalize all workflow view_file paths to global skills directory)

## [2026-09-01] - [Feature ID: 330]
Contexto: Tratamento de falhas de rede/infra em cards contabeis (StoreCardModulo1 e ConciliacaoLojasView).
Regra aprendida: Substituido fallback silencioso '|| 0' por verificacao 'isMissingData' e null-safety, renderizando 'N/D' e bloqueando interacoes.
Nao fazer: Nunca fazer fallbacks automaticos para zero em dados criticos contabeis ausentes do backend.

## [2026-09-01] — [Feature ID: 332-conciliacao-lojas-diferenca-ui]
**Contexto:** Ajuste nos cards de fechamento por loja (`StoreCardModulo1.tsx`) e na rota `/conciliacao/$lojaId`.
**Regra aprendida:**
1. **Formatação de Diferença R$ 0,00:** Tratar tolerância de centavos (`Math.abs(diferenca) <= 0.05`) para exibir badges semânticos (`ENTROU` verde esmeralda).
2. **Suporte a Query Params:** `conciliacao.index.tsx` deve declarar `validateSearch: { date }` para ler imediatamente a data passada pela URL ao renderizar.
3. **Resiliência de Identificador de Filial:** Ao cruzar o resumo consolidado com as lojas, validar `s.store_id === lojaId || s.store_id === store?.id || s.store_name === store?.name`.

## [2026-09-01] — [Feature ID: 340] Orquestração Linear de Steps e Eliminação de Flash Visual
**Contexto:** Correção de bugs de UX no Wizard de Importação onde a tela de fechamento final piscava antes de entrar nos passos de conferência.
**Regra aprendida:**
1. **Transições Sem Timers Cegos:** Nunca utilizar `setTimeout` para avançar steps automaticamente após mutações de importação. Ao salvar o lote, direcione o usuário para o Step 1 e mantenha-o no step até que o botão "Próximo" seja clicado explicitamente.
2. **Controle de Estado de Conclusão:** O flag `saveFinished` deve ser ativado exclusivamente no último step de fechamento (`Step 7 / Step 4 Final Audit`), e não ao salvar arquivos preliminares de extratos e pátio.

## [2026-09-01] — [Feature ID: 341] Modal com Sistema Dual de Abas (Vínculo Existente vs Criar Nova OS)
**Contexto:** Modal de match manual (`ManualMatchOsModal.tsx`) estendido para permitir criação on-the-fly de novas Ordens de Serviço.
**Regra aprendida:**
1. **Segmented Control de Abas:** Implementar alternância fluida entre *"🔍 Vincular à OS Existente"* e *"➕ Criar Nova OS na Filial"* com preservação dos dados da transação (valor, contraparte e filial).
2. **Liquidação Integral vs Parcial:** Disponibilizar opção rápida de liquidação total (default: valor total = valor do pagamento) ou parcial (campo para informar o valor total real do serviço, calculando o saldo remanescente em aberto em tempo real).
3. **Padrão Dark UI Zinc-950:** Manter contrastes `bg-zinc-950`, `border-zinc-800`, botões `bg-emerald-500` com hover vibrante e feedback em toasts Sonner.

## [2026-09-02] — [Feature ID: 349] Terminal de Logs macOS/Linux & Banner de Diagnóstico Estruturado
**Contexto:** Refatoração do terminal de logs e painéis de erro do `CentralImportWizard.tsx` com criação dos componentes `ImportExecutionTerminal.tsx` e `ExecutionErrorBanner.tsx`.
**Regra aprendida:**
1. **Auto-Scroll sem Pulo de Viewport:** Nunca use `element.scrollIntoView()` em containers de logs dinâmicos, pois isso causa saltos na página inteira a cada evento. Use scroll imperativo no container local: `containerRef.current.scrollTop = containerRef.current.scrollHeight`.
2. **Filtros e Cópia 1-Clique:** Terminais de execução técnica devem conter filtros rápidos (`Todos`, `Erros ❌`, `Avisos ⚠️`, `OK ✅`) e botão de copiar logs formatados para diagnóstico imediato.
3. **Tradução Amigável de Erros Supabase:** Banners de erro (`ExecutionErrorBanner`) devem traduzir códigos técnicos do PostgreSQL/PostgREST para diagnósticos em português legíveis, preservando o stack trace e payload JSON em gavetas colapsáveis.
4. **Preservação de Contexto no Botão de Retry:** Ao tentar novamente após um erro de gravação, garanta que o callback invoque `handleConfirm(true)` para que o operador avance normalmente para o Wizard sem perda de estado.

