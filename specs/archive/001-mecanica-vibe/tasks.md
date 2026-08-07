# Planejamento de Tarefas: Sistema Autônomo de ConciliaçÁo - Mecânica Popular

## Fase 1: Arquitetura e Supabase Integration (Back-End / Bot)
- [ ] Configurar Projeto Supabase:
  - Criar schema de banco de dados (`stores`, `daily_consolidations`, `divergences`, `bot_sync_logs`).
  - Habilitar RLS e Auth (se necessário) para proteger os acessos.
- [ ] Refatorar Camada de Dados (Front-End):
  - Criar serviços API reais em `src/lib/api/supabase.ts` para leitura e gravaçÁo dos dados do banco.
  - Substituir totalmente o mock de `hooks.ts` por hooks baseados em Supabase.
- [ ] Planejamento do Bot (A ser detalhado em issue futura):
  - Definir estrutura do robô (Node.js/Python) responsável por acessar a API ou interface do Oficina Inteligente diariamente às 07h.

## Fase 2: Design Premium e Microinterações (Glassmorphism & Framer Motion)
- [ ] Configurar Base Visual (Antigravity Vibe):
  - Instalar e inicializar `framer-motion`.
  - Refinar o `tailwind.config.ts` com tokens avançados (cores dark premium, degradês dinâmicos).
  - Ajustar o CSS Global (`styles.css`) para garantir suporte ao Dark Mode profundo de alta estética.
- [ ] Refatorar Dashboard Principal (`index.tsx`):
  - Redesenhar cards de KPI com Glassmorphism.
  - Implementar painéis animados para "Status de ConciliaçÁo Diária".
- [ ] Redesenhar Páginas Auxiliares:
  - Melhorar `lojas.tsx` e `alertas.tsx` para apresentar as divergências com alto contraste (alertas piscantes/neon, tooltips detalhados).
  - Criar animações de entrada e transiçÁo de página.

## Fase 3: Funções Críticas do Negócio e Interatividade
- [ ] Input Ágil de Caixa ("Em menos de 5 min"):
  - Construir modal altamente intuitivo (possivelmente com step-by-step swipeable) para que o gerente/dono declare o valor do dinheiro em espécie (balcÁo).
  - Após submit, ativar loading skeleton e disparar validaçÁo contra os valores processados pelo bot, exibindo feedback positivo/divergente imediatamente.
- [ ] ResoluçÁo de Divergências Interativa:
  - Nos cards de divergência (ex: OS sem pagamento), implementar botÁo "Justificar / Resolver".
  - Abrir um modal de contexto rápido listando detalhes da OS, permitindo que a analista audite ali mesmo e registre a justificativa.

## Fase 4: OtimizaçÁo e QA
- [ ] Auditar PWA e Mobile-First Experience:
  - Testar fluxo 100% no celular (como o Daniel irá acessar).
  - Remover bugs de layout e assegurar tempos de resposta <200ms na interface.
- [ ] RevisÁo Vibe:
  - Passar pela checklist estética rigorosa do Antigravity. Assegurar o *WOW factor* no primeiro impacto ao carregar a página inicial.
