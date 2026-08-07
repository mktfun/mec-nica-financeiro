# Proposal: RestauraçÁo do Painel Unificado de Fechamento por Loja com Espaçamento Amplo (fix-store-closing-unified-panel-layout)

## Problema
- O layout recente transformou cada um dos 6 indicadores em pílulas pretas separadas e isoladas com borda própria (`6 caixas flutuantes`).
- O usuário especificou que **nÁo quer os 6 indicadores separados em caixinhas flutuantes**, e sim envelopados em **um único fundo contínuo e elegante de painel** (como no visual original), porém mantendo a largura ampla, o alinhamento limpo e o espaçamento sem colisÁo de texto.

## SoluçÁo Proposta

1. **UnificaçÁo do Fundo do Painel (`src/routes/conciliacao.index.tsx`):**
   - Remover as caixinhas individuais separadas em cada métrica.
   - Envelopar os 6 indicadores dentro de um **único painel contínuo** (`bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1 shadow-inner`).
2. **Grade Interna Ampla e Espaçosa:**
   - Organizar as 6 colunas internamente com `grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 xl:gap-8 items-center`.
   - Garantir títulos em caixa alta limpos (`text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] mb-1`), com valores legíveis (`text-sm font-bold font-mono`).
   - Manter destaque sutil de cor na coluna `Diferença` para sinalizar fechamento ok (verde) ou divergência (vermelho) sem quebrar o fundo contínuo do painel.

## Contratos de Dados
- Nenhuma alteraçÁo no Supabase nem em lógicas de cálculo. Apenas ajuste de estilizaçÁo e estrutura JSX no componente do card de fechamento por loja.

## Features Existentes Impactadas
- `src/routes/conciliacao.index.tsx`: VisualizaçÁo da lista de cartões de loja no topo da página de conciliaçÁo.

## Risco Principal
Quebra de alinhamento em telas pequenas (mobile).
*MitigaçÁo:* A grade utiliza `grid-cols-2 md:grid-cols-3 xl:grid-cols-6` com `gap-4 sm:gap-6`, permitindo que no mobile os itens se organizem em 2 colunas perfeitamente alinhadas dentro do painel unificado.
