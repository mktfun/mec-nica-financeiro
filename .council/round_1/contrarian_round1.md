# POSIÇÃO CONTRARIAN — ROUND 1 (CONTRARIAN)
Confiança: 0.95
1. Mito do Componente Único Universal: KpiCard com 18 props e DataTable monolítico viram God Components incontroláveis com re-renders em cascata.
2. Ataque ao Doc 1: Alucinação de tema claro bg-gray-50, cegueira de contratos Supabase/React Query e tabelas de figma espaçadas.
3. Ataque ao Doc 2: Overengineering acadêmico (AsyncSection, DataToolbar, mistura BEM/Tailwind v4).
4. Riscos de regressão: Travamento do fechamento diário por refatoração de hooks em modais; distorção em telas 4K se max-w for liberado para 100vw sem limites (recharts viram agulhas); perda de tabular-nums.
5. Veredito: Limitar largura a max-w-[1600px] mx-auto, proibir God Components e usar exclusivamente variáveis CSS de styles.css.