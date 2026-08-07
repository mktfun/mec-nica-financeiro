# Design Spec: 003 Premium Mock Preview para Investidores

## 1. Filosofia de Design e Estética (Nível Stripe/Apple/XP)
- **Tema Central:** Minimalista Profissional, focado em alta densidade de informaçÁo financeira com respiro. Uso de fundos em *Deep Charcoal* (`#0a0a0b`) contrastando com painéis *Frosted Glass* (`bg-white/5` com alto `backdrop-blur`).
- **Tipografia:** Uso da fonte Inter ou SF Pro Display. Pesos `semibold` e `extrabold` para métricas (KPIs), com números em `tabular-nums` para alinhamento contábil perfeito. Textos secundários em tons de cinza prateado (`#a1a1aa`).
- **Cores de Destaque:** 
  - Sucesso/AprovaçÁo: Verde esmeralda brilhante com glow suave (`#10b981`).
  - Alerta/Divergência: Vermelho/Laranja vibrante (`#ef4444`).
  - Acentos Primários: Azul elétrico (`#3b82f6`) ou Dourado Investidor (`#fbbf24`) para ações principais.
- **Animações (Framer Motion):** 
  - *Spring Physics:* Evitar animações lineares duras. Usar transições `type: "spring", stiffness: 300, damping: 30` para sensaçÁo orgânica.
  - *Staggered Children:* Listas de lojas ou alertas devem entrar em cascata.
  - *Number Ticker:* KPIs sobem de 0 até o valor final fluidamente na montagem.

## 2. DivisÁo da UI (Componentes Principais)

### `MockPreviewLayout`
O container principal da aplicaçÁo de demonstraçÁo. Um layout de grid moderno que ocupa 100vh.
- **Topbar Executiva:** Nome da rede, relógio pulsante, botÁo de simular "Novo Dia".
- **Sidebar de NavegaçÁo:** Estilo pílula (Apple visionOS), ícones elegantes, com a aba "VisÁo Geral (Sócio)" selecionada.

### `DashboardGrid`
A área principal de conteúdo.
- **`HeroKPISection`:** 4 blocos envidraçados.
  - Entradas Confirmadas
  - Saídas/Custos
  - Alertas Pendentes (Glow dinâmico se > 0)
  - Saldo Líquido do Dia (Fonte destaque)
- **`StatusMotorSection`:** Um componente visual que imita um console. Mostra "Robô Extraindo Dados...", "Análise em Tempo Real...", passando de loading para "Completo". 

### `StoreConciliationTable`
Tabela premium sem linhas de grade pesadas. Linhas separadas por divisórias quase imperceptíveis (`border-white/5`).
- Colunas: Loja, Entradas OS, Entradas Financeiro, Divergência, Status (Aprovado ✅ / Revisar ⚠️).
- Ao passar o mouse (`hover`), a linha ilumina suavemente.

### `InteractiveDivergenceDialog`
O modal (XP-like) de aprovaçÁo que abre quando o Sócio clica em "Revisar".
- Fundo muito escurecido (`backdrop-blur-xl`).
- Painel flutuante detalhando o erro (ex: "Oficina Inteligente R$ 10.000 vs Maquininha R$ 9.800").
- Botões: "Aprovar Falta" / "Solicitar CorreçÁo do Gerente".

## 3. Modelo de Dados Mock (`src/mock/investor-data.ts`)
- Variáveis estáticas de alta qualidade simulando um dia de fechamento real.
- Exemplo de interface:
  ```ts
  interface StoreMock {
    id: string;
    name: string;
    osTotal: number;
    financialTotal: number;
    status: 'approved' | 'divergence';
    divergenceReason?: string;
  }
  ```

## 4. Mapa de Dependências
- **Depende:** `framer-motion` (para as animações nível Apple), `lucide-react` (ícones), `clsx`/`tailwind-merge`.
- **Modifica:** Será criado uma rota isolada ou o componente raiz será substituído no ambiente de preview para garantir que nÁo haja vazamento do layout antigo.
