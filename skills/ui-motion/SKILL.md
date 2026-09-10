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

## 3. Curated Recipes (On-Demand)

Consulte `skills/ui-motion/references/recipes.md` para os códigos TypeScript/Tailwind completos:
- **BorderBeam**: Card de plano "Recomendado" ou Hero feature highlight.
- **ShimmerButton**: CTA primário de alta conversão para landing pages e checkout.
- **NumberTicker**: Contadores animados para KPIs e métricas em dashboards.

---

## 4. Anti-Patterns de Movimento (Motion Slop Gate)

- ❌ **NEVER** use curvas de aceleração elásticas ou borrachudas (`bounce-elastic-easing`) em dropdowns ou botões.
- ❌ **NEVER** aplique `hover:scale-105` indiscriminadamente em cards de dados que não são clicáveis.
- ❌ **NEVER** deixe animações de partículas ou rotação infinita rodando fora do viewport.
- ❌ **NEVER** crie animações de entrada com transição de `margin` ou `height` (layout thrashing).
- ❌ **NEVER** exceda 200ms em transições de navegação e micro-interações de clique.
