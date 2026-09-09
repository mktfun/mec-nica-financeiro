# 🌑 Dark UI Depth Model & Surface Architecture

Referência e padrões de profundidade visual, elevação por luminância de superfície e contraste para aplicações Dark-First modernas (Linear, Vercel, Supabase, Raycast), baseado na curadoria do **dark.design**.

---

## 1. O Princípio Fundamental: Elevação por Luminância

No mundo real e no design de interfaces clássico (Light Mode), a profundidade entre camadas é gerada por **sombras pretas projetadas** (`box-shadow: 0 10px 30px rgba(0,0,0,0.1)`). 

Em **Dark Mode**, sombras pretas são quase invisíveis sobre fundos escuros. A profundidade visual deve ser alcançada através da **elevação progressiva da luminância da superfície**: quanto mais próximo o elemento estiver dos olhos do usuário (maior o z-index), mais claro é o seu tom de superfície.

```
[Layer 4: Popovers, Menus, Modais]       ->  bg-zinc-850 / bg-zinc-800 (#27272a)
       ↑ (elevação por clareamento)
[Layer 3: Elevated Surface / Navbars]     ->  bg-zinc-900/80 backdrop-blur-md
       ↑
[Layer 2: Cards, Painéis, Tabelas]        ->  bg-zinc-900 (#18181b)
       ↑
[Layer 1: Canvas Base / Root Viewport]    ->  bg-zinc-950 (#09090b) [NUNCA #000000 puro]
```

---

## 2. A Tabela Canônica de Superfícies (Zinc-950 Token Stack)

| Nível de Camada | Tailwind Class | Hex / Valor | Propósito Ergonômico |
|---|---|---|---|
| **0. Viewport Canvas** | `bg-zinc-950` | `#09090b` | Base principal da aplicação. Evita o contraste agressivo do `#000000`. |
| **1. Wells & Sunken Areas** | `bg-zinc-950/60 border border-zinc-900` | `#0d0d10` | Áreas rebaixadas (codeblocks, inputs desabilitados, containers secundários). |
| **2. Primary Card Surface** | `bg-zinc-900` | `#18181b` | Cards principais de dados, painéis de configuração, linhas de tabela. |
| **3. Elevated Surfaces** | `bg-zinc-900/80 backdrop-blur-md` | `#18181bcc` | Headers fixos, docks flutuantes, barras de ferramentas com efeito frosted. |
| **4. Floating Menus & Dialogs** | `bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/40` | `#1c1c20` | Modais, dropdowns, menus de contexto, command palette (`Cmd+K`). |
| **5. Active / Hovered Items** | `bg-zinc-800/60` | `#27272a99` | Destaque temporário de linha de tabela, item de menu sob cursor. |

---

## 3. Micro-Bordas e Inner Bevel Highlights

Em superfícies escuras, bordas sólidas grossas criam ruído visual pesado. O delimitador ideal combina uma **micro-borda semitransparente** com um **destaque interno superior** (simulando a luz ambiente que bate na quina do card):

### Padrão de Card Polido (Dark Luxury Card):
```tsx
<div className="relative rounded-xl border border-white/10 bg-zinc-900/70 p-6 
                shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] 
                transition-all duration-200 hover:border-white/20">
  {/* Conteúdo */}
</div>
```

### Explicação da Física do Token:
- `border-white/10` (`rgba(255, 255, 255, 0.1)`): Delimita o perímetro do card adaptando-se organicamente a qualquer tom de cinza escuro abaixo dele.
- `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`: Uma linha de 1px no topo da borda interna que simula o bisel (bevel) superior iluminado pela luz virtual do topo da tela.

---

## 4. Hierarquia Tipográfica Anti-Fadiga Visual

Em fundos escuros, texto 100% branco (`#ffffff`) sobre áreas amplas de leitura causa irradiação óptica e cansaço visual após alguns minutos. A hierarquia de texto deve seguir 4 degraus calibrados:

```
Títulos Principais (H1, H2, Métricas)  ->  text-zinc-100 (#f4f4f5) - Branco suavizado
Corpo de Texto, Labels Principais      ->  text-zinc-300 (#d4d4d8) - Leitura confortável
Descrições Secundárias, Metadados       ->  text-zinc-400 (#a1a1aa) - Contraste calmo
Placeholders, Timestamps, Muted        ->  text-zinc-500 (#71717a) - Presença discreta (mínimo WCAG)
```

---

## 5. Cores de Destaque Desaturadas (Luminous Accents)

Cores primárias extremamente saturadas do tema claro (ex.: `bg-blue-600` ou `bg-indigo-700`) "vibram" desconfortavelmente quando colocadas sobre o fundo `zinc-950`.

- Em **Dark Mode**, reduza ligeiramente a saturação e aumente a luminosidade do tom para dar brilho limpo:
  - Em vez de `text-indigo-600`, use `text-indigo-400` para badges e links ativos.
  - Em vez de `bg-emerald-600`, use `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20` para badges de sucesso.
  - O botão primário de ação mantém o sólido funcional: `bg-indigo-600 hover:bg-indigo-500 text-white`.

---

## 6. Iluminação Ambiente Controlada (Ambient Glow)

Se for necessário aplicar iluminação decorativa de fundo em seções Hero:
- **NUNCA use divs borradas com blur-3xl:** Elas geram banding (faixas de cor) e lentidão de GPU.
- **SEMPRE use CSS radial gradients:**
```tsx
<div 
  className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
  aria-hidden="true"
>
  <div 
    className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] 
               [background:radial-gradient(ellipse_at_center,rgba(99,102,241,0.12),transparent_70%)]" 
  />
</div>
```
A opacidade do gradiente ambiente NUNCA deve ultrapassar **12% a 15%**, garantindo que o texto e os controles permaneçam com contraste absoluto.
