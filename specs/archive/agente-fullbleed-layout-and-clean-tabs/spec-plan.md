# Spec Plan: Restauração do Chat Full-Bleed e Navegação Muted Sem Emojis em `/agente` (agente-fullbleed-layout-and-clean-tabs)

## Tasks

- [ ] [FRONTEND] Reformular `src/routes/agente.tsx`:
  - [ ] Restaurar o layout do Chat para ocupar 100% da altura da tela (`absolute top-16 left-0 right-0 bottom-0 z-30`), removendo a caixa minimizada `h-[680px]` e os `max-w-7xl`.
  - [ ] Remover TODOS os emojis unicode (`♂`, `⚙️`, `📊`, `🔍`, etc.) e substituir por ícones Lucide React vetoriais (`Bot`, `Key`, `BarChart3`, `Terminal`).
  - [ ] Integrar a barra de navegação de abas de forma discreta no header superior da tela (`Chat`, `Provedores & API`, `Telemetria & Custos`, `Inspector JSON`).
  - [ ] Manter as abas de Provedores, Telemetria e Inspector estilizadas em layout dark limpo e sóbrio.
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
