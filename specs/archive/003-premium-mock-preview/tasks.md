- [ ] **Fase 1: ConfiguraçÁo do Ambiente "Mock Preview"**
  - [ ] Criar arquivo de dados estáticos hiper-realistas (`src/mock/investor-data.ts`).
  - [ ] Instalar e configurar `framer-motion` para animações fluidas (se ainda nÁo configurado para uso total).
  - [ ] Criar a rota/página `/investor-preview` limpa, isolada do layout anterior.

- [ ] **Fase 2: Layout Base e Hero Section**
  - [ ] Desenvolver `MockPreviewLayout` com o *Deep Charcoal* e painéis em *Frosted Glass*.
  - [ ] Implementar a Topbar executiva minimalista.
  - [ ] Construir o `HeroKPISection` utilizando `framer-motion` para entrada escalonada e animaçÁo de contagem dos números (Number Ticker).

- [ ] **Fase 3: VisualizaçÁo do Motor e Tabela de Lojas**
  - [ ] Construir o `StatusMotorSection` com uma micro-interaçÁo simulando o processamento dos dados em tempo real (Loading spinner premium que se transforma em check).
  - [ ] Desenvolver a `StoreConciliationTable`, listando as 10 lojas do mock com suas divergências ou aprovações.
  - [ ] Implementar estilos de zebra com transparência extrema (`bg-white/2`) e glows baseados no status.

- [ ] **Fase 4: Interatividade e Modal de DecisÁo**
  - [ ] Criar o `InteractiveDivergenceDialog` com blur intenso de fundo (`backdrop-blur-xl`).
  - [ ] Animar a entrada do modal (scale up suave usando física de molas/spring).
  - [ ] Polir contrastes de fonte e espaçamentos (pixel-perfect).

- [ ] **Fase 5: Build e DisponibilizaçÁo**
  - [ ] Validar a visualizaçÁo local.
  - [ ] Build e push para garantir que a versÁo de demonstraçÁo VIP está no ar.
