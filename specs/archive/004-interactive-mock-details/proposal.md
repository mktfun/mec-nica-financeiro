# Proposal: 004-Interactive-Mock-Details

## 1. VisÁo Geral
O usuário solicitou uma grande evoluçÁo na interatividade do protótipo "VIP" da Mecânica Popular (estilo Revolut). O objetivo é transformar o aplicativo, que atualmente possui visual deslumbrante mas comportamento estático em alguns fluxos, em um protótipo totalmente "clicável", onde cada açÁo reflete uma resposta de UI que simula o aplicativo final.

## 2. Requisitos e User Stories
- **Interatividade Completa (Mock):** Todas as listas (lojas, alertas, transações) devem ser clicáveis.
- **VisualizaçÁo de Detalhes (Lojas):** Ao clicar em uma loja na `/lojas`, exibir os detalhes mockados (incluindo os nomes dos mecânicos da unidade, fluxo de caixa específico e histórico).
- **Relatório de ConciliaçÁo:** O botÁo "Ver Relatório Detalhado" em `/conciliacao` deve abrir um relatório simulado completo com os dados da batida do dia.
- **ResoluçÁo de Alertas:** Em `/alertas`, os botões "Resolver" devem abrir um fluxo simulado de resoluçÁo do alerta (ex: Modal de Divergência com opções).
- **Gráficos Reais no Dashboard:** O placeholder "Resumo da Semana" no Dashboard (`/`) deve ser substituído por um gráfico de fluxo de caixa vivo usando a biblioteca `recharts`.
- **Tela de Configurações:** A opçÁo "Configurações" na Sidebar/Menu deve abrir a rota ou modal de configurações.
- **Animações Numéricas Inteligentes:** Os números animados (`AnimatedNumber.tsx`) nÁo devem rodar do "0 ao total" a cada mudança de rota. Essa animaçÁo só deve ocorrer 1 vez na abertura do app (First Load), sendo persistida via LocalStorage ou estado global.

## 3. O Que Já Existe e Será Reutilizado
- `src/mock/data.ts`: Os dados de base (basta expandir para incluir lista de mecânicos e mais histórico).
- Componentes Base Revolut: `Button`, `Card`, `Badge`, `AnimatedNumber`, `Input`.
- Rotas estruturadas via `@tanstack/react-router`.
- Design System consolidado em `src/styles.css` (Tailwind v4).

## 4. O Que Precisa Ser Criado/Modificado
- **Mock Data (Modificado):** Expandir para incluir `mechanics`, relatórios detalhados, etc.
- **Componentes de Interatividade (Criado):**
  - `StoreDetailsDialog` / `StoreDetailsSheet`: Para detalhes da loja.
  - `AlertResolveDialog`: Para o fluxo de resoluçÁo de alerta.
  - `ConciliationReportDialog`: Para o relatório do fim de dia.
  - `SettingsDialog` ou rota `/configuracoes`.
  - `CashFlowChart`: Gráfico utilizando `recharts`.
- **Hooks (Criado):** `useInitialAnimation()` para controlar se a animaçÁo do `0` já rodou no app inteiro.

## 5. Critérios de Aceite
- Todos os botões mapeados nas telas principais têm ações de clique.
- A tela "Configurações" abre corretamente.
- O gráfico de fluxo de caixa é exibido corretamente no Dashboard.
- As animações dos números ocorrem apenas 1x ao entrar no app.
- A consistência "Revolut Style" é mantida (transições suaves, modais arredondados, fundo preto absoluto).
