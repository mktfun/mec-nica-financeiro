# 🎬 Construtor de Landing Pages Cinematográficas (Design System de Luxo & Micro-UIs)

Este módulo ensina a construir landing pages cinematográficas e de alta fidelidade "1:1 Pixel Perfect", eliminando completamente o visual genérico de IA. Cada página deve funcionar como um **instrumento digital** — rolagem com peso, micro-interações funcionais e contrastes tipográficos dramáticos.

---

## 🧭 O Fluxo de Entrada Rápido (4 Perguntas Únicas)

Antes de gerar a landing page, dispare uma única chamada interativa de perguntas:
1. **Nome da marca e propósito em 1 frase:** (ex: *"Aethel — IA de diagnóstico preditivo para medicina personalizada"*)
2. **Direção estética (Preset):** Escolha entre A (Organic Tech), B (Midnight Luxe), C (Brutalist Signal) ou D (Vapor Clinic).
3. **3 Principais Propostas de Valor:** Frases curtas que virarão os 3 artefatos funcionais da seção Features.
4. **CTA Principal:** (ex: *"Solicitar Acesso Antecipado"*, *"Agendar Demonstração Privada"*)

---

## 🎨 Os 4 Presets Estéticos Canônicos

Cada preset define paleta hex, pares tipográficos do Google Fonts e clima de imagens para o Unsplash:

### Preset A — "Organic Tech" (Boutique Clínica & Bio-Luxo)
- **Identidade:** Ponte entre laboratório de pesquisa biológica e revista de luxo de vanguarda.
- **Paleta:**
  - Primária: Musgo `#2E4036`
  - Acento: Argila `#CC5833`
  - Fundo: Creme `#F2F0E9`
  - Texto/Dark: Carvão `#1A1A1A`
- **Tipografia:** Headings: `"Plus Jakarta Sans"` / `"Outfit"`. Drama: `"Cormorant Garamond"` (Itálico Massivo). Dados: `"IBM Plex Mono"`.
- **Image Mood (Unsplash):** `dark forest, organic textures, moss, ferns, laboratory glassware`
- **Fórmula de Hero:** `[Substantivo Conceitual] é o/a` (Bold Sans) + `[Palavra de Poder].` (Serif Itálico Massivo 4x maior)

### Preset B — "Midnight Luxe" (Editorial Sombrio & Alta Horologia)
- **Identidade:** Clube privado exclusivo encontra o ateliê de um relojoeiro suíço.
- **Paleta:**
  - Primária: Obsidiana `#0D0D12`
  - Acento: Champagne Dourado `#C9A84C`
  - Fundo: Marfim `#FAF8F5`
  - Texto/Dark: Ardósia Escura `#2A2A35`
- **Tipografia:** Headings: `"Inter"`. Drama: `"Playfair Display"` (Itálico Massivo). Dados: `"JetBrains Mono"`.
- **Image Mood (Unsplash):** `dark marble, gold accents, architectural shadows, luxury interiors`
- **Fórmula de Hero:** `[Substantivo Aspiracional] encontra a/o` (Bold Sans) + `[Palavra de Precisão].` (Serif Itálico Massivo)

### Preset C — "Brutalist Signal" (Precisão Industrial & Densidade de Dados)
- **Identidade:** Sala de controle aeroespacial para o futuro — zero ornamentos supérfluos, pura informação.
- **Paleta:**
  - Primária: Papel Envelhecido `#E8E4DD`
  - Acento: Vermelho Sinal `#E63B2E`
  - Fundo: Off-White `#F5F3EE`
  - Texto/Dark: Preto Absoluto `#111111`
- **Tipografia:** Headings: `"Space Grotesk"`. Drama: `"DM Serif Display"` (Itálico). Dados: `"Space Mono"`.
- **Image Mood (Unsplash):** `concrete, brutalist architecture, raw materials, industrial machinery`
- **Fórmula de Hero:** `[Verbo Direto] o/a` (Bold Sans) + `[Substantivo de Sistema].` (Serif Itálico)

### Preset D — "Vapor Clinic" (Biotecnologia Neon & Dark Future)
- **Identidade:** Laboratório de sequenciamento genômico no coração de Tóquio.
- **Paleta:**
  - Primária: Vazio Profundo `#0A0A14`
  - Acento: Plasma Violeta `#7B61FF`
  - Fundo: Fantasma `#F0EFF4`
  - Texto/Dark: Grafite Puro `#18181B`
- **Tipografia:** Headings: `"Sora"`. Drama: `"Instrument Serif"` (Itálico). Dados: `"Fira Code"`.
- **Image Mood (Unsplash):** `bioluminescence, dark water, neon reflections, microscopy`
- **Fórmula de Hero:** `[Substantivo Tech] além do/da` (Bold Sans) + `[Palavra Limite].` (Serif Itálico)

---

## 🛠️ Regras Físicas do Design System (Não-Negociáveis)

1. **Textura com Ruído SVG Inline (Sem gradientes chapados):**
   Adicione o filtro de ruído inline no topo do layout com opacidade `0.05`:
   ```tsx
   <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.05]">
     <svg className="h-full w-full">
       <filter id="noiseFilter">
         <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
       </filter>
       <rect width="100%" height="100%" filter="url(#noiseFilter)" />
     </svg>
   </div>
   ```

2. **Sistema de Bordas Ultra-Arredondadas:**
   Use estritamente contêineres entre `rounded-[2rem]` e `rounded-[3rem]`. Sem cantos vivos de 90° em cards e seções.

3. **Botões Magnéticos com Camada Deslizante:**
   ```tsx
   <button className="group relative overflow-hidden rounded-full px-8 py-4 font-medium transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]">
     <span className="relative z-10 text-white transition-colors duration-300 group-hover:text-black">
       {ctaLabel}
     </span>
     <span className="absolute inset-0 z-0 translate-y-full bg-white transition-transform duration-300 ease-out group-hover:translate-y-0" />
   </button>
   ```

4. **Ciclo de Animação com GSAP:**
   Sempre use `gsap.context()` dentro de `useEffect` com retorno obrigatório de `ctx.revert()`.

---

## 🧱 Blocos de Componentes Estruturais (Código de Produção)

### 1. A Ilha Flutuante (Navbar)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export function FloatingNavbar({ brandName, ctaText }: { brandName: string; ctaText: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-6 left-0 right-0 z-40 flex justify-center px-4">
      <nav
        className={`flex items-center justify-between gap-8 rounded-full px-6 py-3 transition-all duration-500 ${
          scrolled
            ? 'bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 py-2.5'
            : 'bg-transparent border border-transparent'
        }`}
      >
        <Link href="/" className="font-semibold tracking-tight text-white text-lg">
          {brandName}
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <Link href="#features" className="hover:text-white transition-colors">Funcionalidades</Link>
          <Link href="#manifesto" className="hover:text-white transition-colors">Manifesto</Link>
          <Link href="#protocolo" className="hover:text-white transition-colors">Protocolo</Link>
        </div>
        <button className="rounded-full bg-white text-black px-5 py-2 text-xs font-semibold tracking-wide uppercase transition-all duration-300 hover:scale-105 hover:bg-zinc-200">
          {ctaText}
        </button>
      </nav>
    </header>
  );
}
```

---

### 2. A Cena de Abertura (Hero Cinematográfico)

```tsx
export function HeroSection({
  headlineSans,
  headlineDrama,
  subheadline,
  ctaText,
  bgImageUrl,
}: {
  headlineSans: string;
  headlineDrama: string;
  subheadline: string;
  ctaText: string;
  bgImageUrl: string;
}) {
  return (
    <section className="relative h-[100dvh] w-full overflow-hidden bg-black flex items-end pb-16 md:pb-24 px-6 md:px-16">
      {/* Imagem de Fundo com Fade Gradiente Escuro */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 transition-transform duration-1000 ease-out"
        style={{ backgroundImage: `url('${bgImageUrl}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Conteúdo ancorado no terço inferior */}
      <div className="relative z-10 max-w-4xl space-y-6">
        <h1 className="text-white tracking-tight leading-none">
          <span className="block text-3xl md:text-5xl font-bold uppercase tracking-wider text-zinc-300">
            {headlineSans}
          </span>
          <span className="block text-6xl md:text-9xl font-serif italic text-white mt-1">
            {headlineDrama}
          </span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-xl font-light leading-relaxed">
          {subheadline}
        </p>
        <div className="pt-2">
          <button className="rounded-full bg-white text-black px-8 py-4 text-sm font-semibold tracking-wider uppercase transition-all duration-300 hover:scale-105 shadow-xl shadow-white/10">
            {ctaText}
          </button>
        </div>
      </div>
    </section>
  );
}
```

---

### 3. Micro-UIs Interativas para Features

#### Card 1 — Diagnostic Shuffler (Baralho Rotativo)
```tsx
export function DiagnosticShuffler({ items }: { items: string[] }) {
  const [deck, setDeck] = useState(items);

  useEffect(() => {
    const timer = setInterval(() => {
      setDeck((prev) => {
        const copy = [...prev];
        const last = copy.pop();
        if (last) copy.unshift(last);
        return copy;
      });
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-56 w-full flex items-center justify-center">
      {deck.map((item, idx) => (
        <div
          key={item}
          className="absolute w-full rounded-2xl border border-white/10 bg-zinc-900/90 p-5 shadow-xl backdrop-blur-md transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            transform: `translateY(${(idx - 1) * 22}px) scale(${1 - idx * 0.06})`,
            zIndex: 3 - idx,
            opacity: 1 - idx * 0.25,
          }}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
            <span>REGISTRO_0{idx + 1}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-white font-medium text-sm">{item}</p>
        </div>
      ))}
    </div>
  );
}
```

#### Card 2 — Telemetry Typewriter (Feed em Tempo Real)
```tsx
export function TelemetryTypewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, index));
      index = index >= text.length ? 0 : index + 1;
    }, 60);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5 font-mono text-xs text-zinc-300 space-y-3">
      <div className="flex items-center justify-between text-zinc-500 pb-2 border-b border-white/5">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
          TELEMETRY_FEED
        </span>
        <span>STATUS: LIVE</span>
      </div>
      <p className="text-zinc-200 min-h-[48px] leading-relaxed">
        {displayed}
        <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle" />
      </p>
    </div>
  );
}
```

#### Card 3 — Cursor Protocol Scheduler (Simulador de Automação)
```tsx
export function CursorScheduler() {
  const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const [activeDay, setActiveDay] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDay((prev) => (prev + 1) % 7);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 space-y-4">
      <div className="flex justify-between items-center text-xs text-zinc-400 font-mono">
        <span>CRONOGRAMA_ATIVO</span>
        <span className="text-emerald-400">SINCRONIZADO</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) => (
          <div
            key={i}
            className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs font-mono transition-all duration-500 ${
              i === activeDay
                ? 'bg-white text-black border-white scale-105 shadow-lg shadow-white/20 font-bold'
                : 'border-white/5 bg-black/40 text-zinc-500'
            }`}
          >
            <span>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 4. O Manifesto (Philosophy com Alto Contraste)

```tsx
export function PhilosophyManifesto({
  traditionalApproach,
  ourApproach,
  bgTextureUrl,
}: {
  traditionalApproach: string;
  ourApproach: string;
  bgTextureUrl: string;
}) {
  return (
    <section className="relative w-full py-32 px-6 md:px-16 bg-black overflow-hidden border-t border-b border-white/10">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
        style={{ backgroundImage: `url('${bgTextureUrl}')` }}
      />
      <div className="relative z-10 max-w-5xl mx-auto space-y-12">
        <p className="text-zinc-500 text-lg md:text-2xl font-light uppercase tracking-widest">
          A maioria do mercado foca em: <span className="text-zinc-400 font-normal">{traditionalApproach}</span>
        </p>
        <p className="text-3xl md:text-7xl font-serif italic text-white leading-tight">
          Nós operamos em: <span className="text-zinc-100 underline decoration-white/20 underline-offset-8">{ourApproach}</span>
        </p>
      </div>
    </section>
  );
}
```

---

### 5. Sticky Stacking (Empilhamento de Cards no Scroll)

Ao usar GSAP ScrollTrigger, utilize o padrão de empilhamento com `pin: true`:

```tsx
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Efeito de empilhamento no useEffect:
// gsap.to(cardElement, {
//   scrollTrigger: {
//     trigger: cardElement,
//     start: 'top top',
//     pin: true,
//     pinSpacing: false,
//     scrub: true,
//   },
//   scale: 0.9,
//   filter: 'blur(20px)',
//   opacity: 0.5,
// });
```

---

## 🚀 Quando usar esta Referência

Puxe `view_file skills/ui-components/references/cinematic-landing-page.md` sempre que a tarefa exigir:
- Landing page para SaaS premium, B2B ou saúde de precisão
- Redesenho de página inicial com apelo visual de alta conversão
- Criação de portfólios institucionais ou páginas de lançamento com identidade marcante
