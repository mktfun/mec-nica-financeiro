# Proposal: 005-Full-Interactivity

## Requisitos e User Stories
1. **US-01**: Como investidor, ao clicar em uma loja quero ver detalhes (gerente, mecânicos, financeiro) — ATUALMENTE CRASHANDO
2. **US-02**: Como investidor, quero ver a ConciliaçÁo Diária como tela completa (nÁo modal), com resumo financeiro, grid de 10 lojas, tabela por loja e erros detectados
3. **US-03**: Como investidor, quero ver a tela "Carros no Pátio" com todas as OS abertas, filtros e tabela completa
4. **US-04**: Como investidor, quero ver a tela "Recebíveis" com valores a receber, vencidos e filtros
5. **US-05**: Como investidor, ao clicar em uma atividade recente no dashboard, quero ver detalhes
6. **US-06**: Ao clicar "Ver todas" no dashboard, quero navegar para histórico completo

## O que JÁ EXISTE e será REUTILIZADO
- `Card`, `Badge`, `Button`, `AnimatedNumber`, `Modal` — componentes base
- `AppShell`, `Sidebar`, `BottomNav` — layout responsivo
- `data.ts` — mock data (será expandido)
- `CashFlowChart` — gráfico recharts
- `StoreDetailsSheet` — painel de detalhes da loja (funciona, só o import do Input quebrou a página)

## O que precisa ser CRIADO
- Rota `/conciliacao` reescrita como full-page com grid de lojas + tabela
- Rota `/conciliacao-detalhes` com tabela por loja e abas
- Rota `/patio` com tabela de OS abertas
- Rota `/recebiveis` com tabela de recebíveis
- Rota `/historico` com lista completa de transações
- Mock data para 10 lojas, 20+ OS, 15+ recebíveis, 15+ transações

## Critérios de Aceite
- ZERO páginas crashando
- Todas as rotas navegáveis
- Todos os botões clicáveis com resposta visual
- Tabelas com dados mock realistas
- Build sem erros
