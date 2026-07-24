# Design: Padronização Tipográfica Global (font-standardization-modern)

## Mudanças em `src/styles.css`

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
@import "tailwindcss";

@theme {
  --color-canvas: #000000;
  --color-canvas-light: #ffffff;
  
  --font-display: "DM Sans", "Inter", sans-serif;
  --font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

@layer base {
  body {
    font-family: var(--font-body);
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }

  .tabular-nums, font-mono {
    font-variant-numeric: tabular-nums;
  }
}
```

## Benefícios da Abordagem
- **Legibilidade Superior:** A fonte **Inter** foi desenhada especificamente para UIs complexas com dashboards financeiros.
- **Números Perfeitamente Alinhados:** O atributo `tabular-nums` faz todos os numerais ocuparem a mesma largura sem precisar usar fontes tipo máquina de escrever (Courier).
- **Consistência Total:** 100% dos textos, rótulos, botões, inputs, tabelas e números compartilharão a mesma tipografia moderna e coerente.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Visualização de Números e Textos na Conciliação):**
  - *Ação:* Navegar por `/conciliacao` e telas de loja.
  - *Resultado Esperado:* Todos os números, saldos e títulos exibem a tipografia elegante **Inter** e **DM Sans** com alinhamento numérico impecável e sem aspecto quadrado monospace.
