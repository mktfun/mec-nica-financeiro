# Design Document: Conciliação Diária Split-Pane

## Visão Geral (Stitch UI)
O layout será dividido em duas colunas principais (Master-Detail). Em telas menores (mobile), o comportamento será de lista com expansão (Accordion ou Modal Fullscreen).

### Top Bar
- **Date Picker**: `<input type="date" />` no lugar do atual `month`.
- **Status Geral**: Badge unificado mostrando se há divergências não resolvidas no dia selecionado.

### Left Pane (Master - Lojas)
- Lista rolável de Lojas.
- Cada cartão de loja exibirá: Nome da Loja, Faturado no dia, Status (OK, Pendente, Divergência).
- Seleção visual ativa (highlight) para a loja clicada.

### Right Pane (Detail - Inspeção & Ações)
- **Header**: Nome da Loja + Status.
- **Transações do Dia**: Lista rápida de "Entradas" e "Saídas" do dia.
- **Dinheiro em Caixa**: 
  - Se a lógica determinar que "teve dinheiro em espécie" ou "há pendência em espécie": Um card destacado pedindo "Informe o valor em Gaveta (Caixa Físico)".
  - Se NÃO: Um aviso sutil "Apenas operações digitais identificadas hoje."
- **Botão Fechar/Validar**: Gravar e consolidar.

## Abordagem Visual (UX/UI 2026)
- **Maximalismo Tátil**: Cartões das lojas com bordas iluminadas quando selecionadas (usando `border-[var(--color-primary)]` e box-shadow brilhante).
- **Acessibilidade**: Evitar esconder informações críticas atrás de múltiplos cliques (problema que estamos resolvendo ao juntar `/conciliacao` e `/conciliacao-detalhes`).
- **Liquid Glass**: Painel direito pode ter um blur de fundo se sobrepor em mobile, ou apenas ser um container `variant="glass"`.

## Arquitetura de Dados (Supabase)
As funções atuais `useConciliacaoResumo` e `useConciliacaoDetalhes` recebem "monthStr" (ex: `2026-06`).
Teremos que ajustá-las (ou criar versões novas como `useConciliacaoDiaria`) para receber a string completa "YYYY-MM-DD".
- A query no Supabase vai usar `.gte('created_at', startOfDay).lte('created_at', endOfDay)` para isolar perfeitamente o dia.
