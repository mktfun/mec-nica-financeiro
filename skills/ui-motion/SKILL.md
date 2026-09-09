---
name: ui-motion
description: Curated micro-interactions and Magic UI animation recipes for Next.js SaaS apps with Rauno Freiberg's interaction engineering guardrails.
---

# UI Motion & Micro-Interactions

Accessible, high-performance animation recipes and motion engineering standards based on the **Web Interface Guidelines** (Rauno Freiberg).

---

## 1. Interaction Engineering Guardrails (Padrão Rauno)

> [!IMPORTANT]
> **Toda animação deve servir a um propósito funcional de contexto espacial ou feedback.**
> Animações puramente cosméticas, lentas ou barulhentas degradam a usabilidade e configuram AI Slop.

1. **Duração Máxima de 200ms (Regra 15)**:
   - Micro-interações cotidianas (dropdowns, tooltips, tabs, hover) **NÃO DEVEM exceder 200ms** (`duration-150` ou `duration-200`). Transições acima disso fazem a interface parecer arrastada.
2. **GPU Compositor Only**:
   - Anime EXCLUSIVAMENTE `transform` e `opacity`. NUNCA anime propriedades de layout geométrico (`width`, `height`, `top`, `padding`, `margin`).
3. **Escala Proporcional ao Tamanho (Regra 16)**:
   - A distância de deslocamento (`translate`) deve ser microscópica e proporcional ao elemento. Um botão se move 2px a 3px, nunca 20px.
4. **Entrada de Modais e Dialogs (0.8 → 1.0) (Regra 17)**:
   - Ao animar a abertura de modais, NUNCA escale de 0 para 1.
   - Combine fade de opacidade (0 → 1) com escala sutil de **0.9 ou 0.85 para 1.0**.
5. **Pressão Sutil de Botões (0.97 - 0.98) (Regra 18)**:
   - No estado `:active` de botões e links, use escala sutil (`active:scale-[0.98]`). Escalas abaixo de 0.95 parecem caricatas e esponjosas.
6. **Reserve Movimento para Novidades (Regra 19)**:
   - Ações rotineiras e frequentes (clicar em inputs, abrir menus contextuais) devem ter animação mínima ou instantânea. Guarde motion expressivo para confirmações de sucesso ou transições de página.
7. **Pausa de Loops Fora de Tela (Regra 20)**:
   - Qualquer animação em loop contínuo (keyframes CSS, shimmers) deve pausar quando o elemento rolar para fora da área visível (`IntersectionObserver`).
8. **Gradientes Radiais em Vez de Divs Borradas (Regra 39)**:
   - NUNCA use divs com `blur(100px)` para criar iluminação ambiente (lento na GPU e gera banding). Use `radial-gradient` nativo do CSS com opacidade máxima de 12–15%.
9. **will-change Transitório (Regra 41)**:
   - Aplique `will-change: transform` apenas durante a execução de animações pesadas de rolagem e remova-o após a conclusão.
10. **Acessibilidade Obrigatória**:
    - Aplique sempre a variante `motion-reduce:animate-none` e `motion-reduce:transition-none`.
11. **Isolamento de Hover em Telas Touch (Regra 45)**:
    - Garanta que estados de hover não fiquem "presos" ao toque em dispositivos móveis (isolar com `@media (hover: hover)`).

---

## 2. Tailwind Animation Keyframes

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      animation: {
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        'shine-pulse': 'shine-pulse 3s ease-in-out infinite',
        'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
      },
      keyframes: {
        'border-beam': { '100%': { 'offset-distance': '100%' } },
        'shine-pulse': { '0%,100%': { 'background-position': '0% 50%' }, '50%': { 'background-position': '100% 50%' } },
        'shimmer-slide': { to: { transform: 'translate(calc(100cqw - 100%), 0)' } },
      },
    },
  },
}
```

---

## 3. Curated Recipes & Usage Notes

### 1. Border Beam (Apenas em Cartões de Destaque / Pricing)
* **Quando usar**: Card de plano "Recomendado" ou anúncio de lançamento no Hero.
* **Quando NÃO usar**: Em todos os cards de um dashboard (gera poluição visual).

```tsx
'use client'
import React from 'react'

export function BorderBeam({
  size = 200,
  duration = 12,
  colorFrom = '#6366f1',
  colorTo = '#a855f7',
  delay = 0,
  className = '',
}: {
  size?: number
  duration?: number
  colorFrom?: string
  colorTo?: string
  delay?: number
  className?: string
}) {
  return (
    <div
      style={{
        '--size': `${size}px`,
        '--duration': `${duration}s`,
        '--delay': `-${delay}s`,
        '--from': colorFrom,
        '--to': colorTo,
      } as React.CSSProperties}
      className={`pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent 
                 [mask-clip:padding-box,border-box] [mask-composite:intersect] 
                 [mask:linear-gradient(#0000,#0000),linear-gradient(#fff,#fff)] 
                 after:absolute after:aspect-square after:w-[calc(var(--size))] 
                 after:animate-border-beam after:[animation-delay:var(--delay)] 
                 after:[background:linear-gradient(to_left,var(--from),var(--to),transparent)] 
                 after:[offset-anchor:calc(var(--size)/2)_50%] 
                 after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)))] 
                 motion-reduce:after:animate-none ${className}`}
    />
  )
}
```

---

### 2. Shimmer Button (CTA Primário de Alta Conversão)
* **Quando usar**: Botão primário do Hero de landing page ou checkout final.
* **Quando NÃO usar**: Botões secundários, paginação ou formulários operacionais.

```tsx
'use client'
import React from 'react'

export function ShimmerButton({
  children,
  className = '',
  shimmerColor = '#ffffff',
  borderRadius = '8px',
  shimmerDuration = '3s',
  background = 'rgba(79, 70, 229, 1)',
  onClick,
}: {
  children: React.ReactNode
  className?: string
  shimmerColor?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        '--shimmer': shimmerColor,
        '--radius': borderRadius,
        '--speed': shimmerDuration,
        '--bg': background,
      } as React.CSSProperties}
      className={`group relative z-0 flex cursor-pointer items-center justify-center 
                 overflow-hidden whitespace-nowrap border border-white/10 px-5 py-2.5 text-sm font-medium text-white 
                 [background:var(--bg)] [border-radius:var(--radius)] 
                 transform-gpu transition-all duration-150 
                 active:scale-[0.98] motion-reduce:transform-none ${className}`}
    >
      <div className="-z-30 absolute inset-0 overflow-visible [container-type:size]">
        <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] motion-reduce:animate-none">
          <div className="animate-spin-around absolute -inset-full w-auto [background:conic-gradient(from_225deg,transparent_0,var(--shimmer)_90deg,transparent_90deg)]" />
        </div>
      </div>
      {children}
      <div className="absolute inset-0 rounded-[--radius] shadow-[inset_0_-1px_3px_rgba(255,255,255,0.2)]" />
    </button>
  )
}
```

---

### 3. Number Ticker (Métricas Financeiras & Contadores)
* **Quando usar**: Dashboards analíticos e KPIs durante a carga inicial.

```tsx
'use client'
import * as React from 'react'

export function NumberTicker({
  value,
  direction = 'up',
  delay = 0,
  className = '',
  decimalPlaces = 0,
}: {
  value: number
  direction?: 'up' | 'down'
  delay?: number
  className?: string
  decimalPlaces?: number
}) {
  const [val, setVal] = React.useState(direction === 'down' ? value : 0)

  React.useEffect(() => {
    let start: number | null = null
    let rafId: number

    const timeout = setTimeout(() => {
      const from = direction === 'down' ? value : 0
      const to = direction === 'down' ? 0 : value
      const duration = 1200 // Max 1.2s

      const step = (t: number) => {
        if (!start) start = t
        const p = Math.min((t - start) / duration, 1)
        // Easing out quad
        setVal(Number((from + (to - from) * (1 - (1 - p) ** 2)).toFixed(decimalPlaces)))
        if (p < 1) rafId = requestAnimationFrame(step)
      }
      rafId = requestAnimationFrame(step)
    }, delay * 1000)

    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(rafId)
    }
  }, [value, direction, delay, decimalPlaces])

  return (
    <span className={`inline-block tabular-nums font-mono text-zinc-100 ${className}`}>
      {Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(val)}
    </span>
  )
}
```

---

## 4. Anti-Patterns de Movimento (Motion Slop Gate)

- ❌ **NEVER** use curvas de aceleração elásticas ou borrachudas (`bounce-elastic-easing`) em dropdowns ou botões.
- ❌ **NEVER** aplique `hover:scale-105` indiscriminadamente em cards de dados que não são clicáveis.
- ❌ **NEVER** deixe animações de partículas ou rotação infinita rodando fora do viewport.
- ❌ **NEVER** crie animações de entrada com transição de `margin` ou `height` (layout thrashing).
- ❌ **NEVER** exceda 200ms em transições de navegação e micro-interações de clique.
