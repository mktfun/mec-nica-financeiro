# Design Document: Revolut Style

## Paleta de Cores e Temas
- **Background**: `#000000` (Preto Absoluto) ou `var(--bg-canvas)`.
- **Surface/Cards**: `#161616` (Muito próximo do preto para criar hierarquia sutil).
- **Acento Primário**: `#CCFF00` (Neon Yellow) para os botões "Hero" e destaques de saldo principal no Drawer.
- **Squircles**: Usar exaustivamente `rounded-[24px]` a `rounded-[32px]` nos containers maiores, e `rounded-full` em botões de ação e pílulas.

## Componentes a Serem Construídos

### 1. `RevolutHeroChart`
- Fundo `bg-[#161616]` com cantos super arredondados.
- Tipografia gigante `text-5xl font-bold font-mono tracking-tight` para o valor em destaque.
- Um `<ResponsiveContainer>` de altura média-baixa (ex: `h-32`) do Recharts ancorado na base do Card (`absolute bottom-0`).
- `<LineChart>` contendo apenas `<Line type="monotone" dataKey="value" stroke="url(#colorUv)" strokeWidth={3} dot={false} />`. Sem XAxis, YAxis, Tooltip ou CartesianGrid. É puramente estético/trend.

### 2. `StoreListItem`
- Componente para iterar sobre as 10 lojas.
- Padrão flex-row simples: 
  `[Ícone de Status Circular] | [Nome Loja + Última Transação] | [R$ Faturado Hoje + Dot de Ação]`
- Sem bordas visíveis (`border-transparent`), baseando-se apenas no background de surface (`bg-[#161616]`) e separações em listas (`gap-3`).

### 3. `RevolutDrawer`
- Manter o `Framer Motion` com slide-over, mas envelopar o painel para parecer um Modal que "flutua" e preenche quase a tela toda com margens, bordas `rounded-t-[32px]` em mobile e `rounded-l-[32px]` no desktop.
- Header do Modal em cor Neon Yellow (`bg-[#CCFF00]`) com letras pretas de alto contraste, dando o punch visual de 2026.
- O Formulário de Gaveta será fixado embaixo (`sticky bottom-0`) com efeito de Liquid Glass (blur no fundo).
