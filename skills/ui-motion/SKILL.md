---
name: ui-motion
description: Curated micro-interactions and Magic UI animation recipes for Next.js SaaS apps.
---

# UI Motion & Micro-Interactions

Accessible animation recipes with Tailwind CSS & React.

## 1. Guardrails
- **GPU Compositor Only**: Animate ONLY `transform` and `opacity`. NEVER animate layout properties.
- **Accessibility**: Enforce `motion-reduce:animate-none` on continuous animations.
- **Hydration**: Client components must maintain deterministic initial states.

## 2. Tailwind Config
```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      animation: {
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        'shine-pulse': 'shine-pulse 3s ease-in-out infinite',
        'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
        'gradient-pan': 'gradient-pan 6s linear infinite',
      },
      keyframes: {
        'border-beam': { '100%': { 'offset-distance': '100%' } },
        'shine-pulse': { '0%,100%': { 'background-position': '0% 50%' }, '50%': { 'background-position': '100% 50%' } },
        'shimmer-slide': { to: { transform: 'translate(calc(100cqw - 100%), 0)' } },
        'gradient-pan': { '0%,100%': { 'background-position': '0% 50%' }, '50%': { 'background-position': '100% 50%' } },
      },
    },
  },
}
```

## 3. Magic UI Recipes

### 1. Border Beam
```tsx
'use client'
import React from 'react'

export function BorderBeam({ size = 200, duration = 12, colorFrom = '#6366f1', colorTo = '#a855f7', delay = 0, className = '' }: { size?: number; duration?: number; colorFrom?: string; colorTo?: string; delay?: number; className?: string }) {
  return (
    <div
      style={{ '--size': `${size}px`, '--duration': `${duration}s`, '--delay': `-${delay}s`, '--from': colorFrom, '--to': colorTo } as React.CSSProperties}
      className={`pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask:linear-gradient(#0000,#0000),linear-gradient(#fff,#fff)] after:absolute after:aspect-square after:w-[calc(var(--size))] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--from),var(--to),transparent)] after:[offset-anchor:calc(var(--size)/2)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)))] motion-reduce:after:animate-none ${className}`}
    />
  )
}
```

### 2. Shine Border
```tsx
import React from 'react'

export function ShineBorder({ borderRadius = 8, borderWidth = 1, duration = 8, color = ['#6366f1', '#a855f7'], className = '', children }: { borderRadius?: number; borderWidth?: number; duration?: number; color?: string[]; className?: string; children: React.ReactNode }) {
  return (
    <div style={{ '--radius': `${borderRadius}px` } as React.CSSProperties} className={`relative grid min-h-[60px] w-full place-items-center rounded-[--radius] bg-zinc-900 p-3 text-zinc-100 ${className}`}>
      <div
        style={{ '--bw': `${borderWidth}px`, '--dur': `${duration}s`, '--bg': `radial-gradient(transparent,transparent,${color.join(',')},transparent,transparent)` } as React.CSSProperties}
        className="pointer-events-none absolute inset-0 size-full rounded-[--radius] p-[--bw] will-change-[background-position] [mask-composite:subtract] [background-image:var(--bg)] [background-size:300%_300%] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] motion-safe:animate-shine-pulse motion-reduce:animate-none"
      />
      {children}
    </div>
  )
}
```

### 3. Shimmer Button
```tsx
'use client'
import React from 'react'

export function ShimmerButton({ children, className = '', shimmerColor = '#ffffff', borderRadius = '100px', shimmerDuration = '3s', background = 'rgba(79, 70, 229, 1)', onClick }: { children: React.ReactNode; className?: string; shimmerColor?: string; borderRadius?: string; shimmerDuration?: string; background?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ '--shimmer': shimmerColor, '--radius': borderRadius, '--speed': shimmerDuration, '--bg': background } as React.CSSProperties}
      className={`group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)] transform-gpu transition-transform duration-300 active:translate-y-px motion-reduce:transform-none ${className}`}
    >
      <div className="-z-30 absolute inset-0 overflow-visible [container-type:size]">
        <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] motion-reduce:animate-none">
          <div className="animate-spin-around absolute -inset-full w-auto [background:conic-gradient(from_225deg,transparent_0,var(--shimmer)_90deg,transparent_90deg)]" />
        </div>
      </div>
      {children}
      <div className="absolute inset-0 rounded-[--radius] shadow-[inset_0_-2px_6px_rgba(255,255,255,0.2)]" />
    </button>
  )
}
```

### 4. Animated Gradient Text
```tsx
import React from 'react'

export function AnimatedGradientText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-[200%_auto] bg-clip-text text-transparent animate-gradient-pan motion-reduce:animate-none ${className}`}>
      {children}
    </span>
  )
}
```

### 5. Number Ticker
```tsx
'use client'
import * as React from 'react'

export function NumberTicker({ value, direction = 'up', delay = 0, className = '', decimalPlaces = 0 }: { value: number; direction?: 'up' | 'down'; delay?: number; className?: string; decimalPlaces?: number }) {
  const [val, setVal] = React.useState(direction === 'down' ? value : 0)
  React.useEffect(() => {
    let start: number | null = null, rafId: number
    const timeout = setTimeout(() => {
      const from = direction === 'down' ? value : 0, to = direction === 'down' ? 0 : value
      const step = (t: number) => {
        if (!start) start = t
        const p = Math.min((t - start) / 1500, 1)
        setVal(Number((from + (to - from) * (1 - (1 - p) ** 2)).toFixed(decimalPlaces)))
        if (p < 1) rafId = requestAnimationFrame(step)
      }
      rafId = requestAnimationFrame(step)
    }, delay * 1000)
    return () => { clearTimeout(timeout); cancelAnimationFrame(rafId) }
  }, [value, direction, delay, decimalPlaces])
  return <span className={`inline-block tabular-nums tracking-wider text-zinc-100 ${className}`}>{Intl.NumberFormat('en-US', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }).format(val)}</span>
}
```

### 6. Typing Animation
```tsx
'use client'
import * as React from 'react'

export function TypingAnimation({ text, duration = 50, className = '', cursor = true }: { text: string; duration?: number; className?: string; cursor?: boolean }) {
  const [displayed, setDisplayed] = React.useState('')
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    if (i < text.length) {
      const t = setTimeout(() => { setDisplayed((p) => p + text.charAt(i)); setI((p) => p + 1) }, duration)
      return () => clearTimeout(t)
    }
  }, [i, text, duration])
  return <span className={`font-mono text-zinc-100 ${className}`}>{displayed}{cursor && <span className="inline-block animate-pulse text-indigo-400">|</span>}</span>
}
```
