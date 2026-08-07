# Design: Sistema Autônomo de ConciliaçÁo - Mecânica Popular

## VisÁo Geral da Arquitetura Visual (UI/UX)
O objetivo principal no redesign da interface atual é afastar a aplicaçÁo do aspecto "sistema genérico / de balcÁo" e implementar uma interface de nível "Board de Sócios", com foco em transparência, controle e facilidade de decisÁo (mobile-first).

- **Estética "Antigravity Premium":**
  - **Paleta Dinâmica/Modo Escuro Foco:** Temas escuros intensos com glows (brilhos) direcionais e acentos em neon sutil para enfatizar ações (ex: Alerta em vermelho vivo/glow amber; Sucesso em esmeralda translúcida).
  - **Glassmorphism e Depth (Profundidade):** Uso do `backdrop-blur` avançado no Tailwind (`backdrop-blur-xl bg-background/50 border-white/10`) para criar camadas nos painéis flutuantes (como os modais de conciliaçÁo).
  - **Microinterações Vivas:** Uso de `framer-motion` para transições de páginas, expansÁo de cards e botões. Nenhuma transiçÁo no painel web deve ser dura ou seca.
  - **Data Visualization Premium:** Uso de gráficos polidos (ex: Recharts) com bordas arredondadas e tooltips estilizados para acompanhar o fluxo de caixa histórico.

## Modelagem e Banco de Dados (Supabase)
O repositório Front-End interagirá com um Back-End provisionado no Supabase para gerenciar a persistência das 10 lojas e seus relatórios consolidados do bot.

**Tabelas Principais sugeridas:**
1. `stores` (id, name, location, manager_name)
2. `daily_consolidations` (id, store_id, date, reported_cash, system_cash, status [approved, pending, divergent])
3. `divergences` (id, consolidation_id, type [os_no_payment, multi_payment_error, etc], description, os_number, resolved_at, resolved_by)
4. `bot_sync_logs` (id, date, status, execution_time, error_details)

## DivisÁo de Componentes (Stitch e Antigravity)
De acordo com os padrões Antigravity e Lovable:
- Componentes altamente granulares de Design System (Inputs, Buttons refinados, animações complexas em `framer-motion`) podem ser iterados visualmente via Stitch MCP se excederem 200 linhas ou requererem visualizaçÁo constante.
- Os layouts de página (`index.tsx`, `alertas.tsx`), lógicas de negócio e hooks integrados ao Supabase serÁo geridos majoritariamente via engenharia direta.

## Mapa de Dependências (O que Novo depende do que Existente)
- **NOVO `KpiRow` / `StoreStatusGrid` animado** DEVE respeitar o esqueleto roteado em `__root.tsx`.
- **NOVO Motor de Chamada de API Supabase** SUBSTITUIRÁ integralmente o arquivo existente `src/lib/mock/hooks.ts`. Todos os componentes que consomem `useStores()` deverÁo ser migrados para o `useQuery` real buscando dados no Supabase.
- **NOVO Bot Extrator Diário** independe do repositório React em si, podendo viver em um diretório `scrapers/` à parte ou no servidor da nuvem, alimentando a tabela `daily_consolidations` para que a UI apenas consuma os resultados.
