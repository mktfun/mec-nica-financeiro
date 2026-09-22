# 📐 DESIGN.md — Design System & Semantic Tokens Specification

Este documento é a **fonte absoluta da verdade visual** para qualquer projeto construído com o Antigravity 2.0.
Qualquer código gerado por IA DEVE aderir estritamente aos tokens semânticos e restrições aqui declaradas.

---

## 1. Regra Fundamental: ZERO Cores Hardcoded em Componentes

> [!CAUTION]
> **PROIBIÇÃO TOTAL DE CLASSES ARBITRÁRIAS E CORES BRUTAS:**
> É terminantemente PROIBIDO usar cores brutas como `bg-black`, `bg-zinc-950`, `bg-gray-900`, `bg-[#09090b]` ou hexadecimais arbitrários nos componentes JSX/HTML.
> Toda a estilização de superfícies, textos e bordas DEVE usar **EXCLUSIVAMENTE tokens semânticos do Tailwind / Shadcn**.

---

## 2. Dicionário de Tokens Semânticos Obrigatórios

Ao estilizar qualquer elemento, mapeie a intenção para o token semântico correspondente:

| Intenção Visual | Classe Tailwind Obrigatória | CSS Variable Subjacente | Comportamento no Tema Dark |
|---|---|---|---|
| **Fundo da Página (Canvas)** | `bg-background` | `--background` | Zinc-950 (`#09090b`) ou Preto OLED |
| **Cards & Superfícies** | `bg-card` | `--card` | Superfície elevada com contraste sutil |
| **Popovers, Modais, Dropdowns**| `bg-popover` | `--popover` | Camada superior com elevação |
| **Áreas Secundárias / Badges** | `bg-muted` ou `bg-secondary` | `--muted` / `--secondary` | Destaque neutro atenuado |
| **Bordas de Cards & Divisores**| `border-border` | `--border` | Borda sutil delimitadora (Zinc-800) |
| **Bordas Atenuadas (Linhas)** | `border-border/40` | `--border` c/ opacidade | Separadores internos de listas |
| **Texto Principal / Títulos** | `text-foreground` | `--foreground` | Alto contraste (Zinc-50 `#fafafa`) |
| **Texto Secundário / Legendas**| `text-muted-foreground` | `--muted-foreground`| Contraste médio legível (Zinc-400) |
| **Ação Primária / Botão CTA** | `bg-primary text-primary-foreground` | `--primary` / `--primary-fg` | Cor de destaque da marca |
| **Anel de Foco (Acessibilidade)**| `ring-ring ring-offset-background`| `--ring` | Indicador de foco para teclado |

---

## 3. Como o Tema "Tudo Preto / Dark" Funciona sem Quebrar

Para garantir que tudo fique preto uniforme sem misturar tons de cinza arbitrários, o controle de tema é centralizado no `globals.css`:

```css
@layer base {
  :root {
    /* Modo Escuro Padrão (Zinc-950 Profissional) */
    --background: 240 10% 3.9%;     /* #09090b */
    --foreground: 0 0% 98%;          /* #fafafa */
    --card: 240 10% 3.9%;            /* #09090b */
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 240 5.9% 90%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;        /* #27272a */
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --radius: 0.5rem;
  }
}
```

> [!TIP]
> Se o usuário solicitar **"Preto Absoluto / OLED Black"**, altere apenas as variáveis no `globals.css`:
> `--background: 0 0% 0%;` e `--card: 0 0% 4%;`.
> Como os componentes usam `bg-background` e `bg-card`, a aplicação inteira escurece de forma idêntica e harmônica, sem deixar nenhum card ou div cinza!

---

## 4. Escala Tipográfica & Espaçamento

### Escala de Espaçamento (Grade de 4px / 8px)
- Use estritamente múltiplos: `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px), `p-8` (32px).
- **PROIBIDO** valores arbitrários (ex.: `p-[13px]`, `gap-[19px]`).

### Escala Tipográfica
- **Hero / Display**: `text-4xl sm:text-5xl font-semibold tracking-tight text-foreground`
- **Heading 1 (H1)**: `text-2xl sm:text-3xl font-semibold tracking-tight text-foreground`
- **Heading 2 (H2)**: `text-lg sm:text-xl font-medium text-foreground`
- **Body / Leitura**: `text-sm sm:text-base text-muted-foreground leading-relaxed`
- **Small / Metadata**: `text-xs text-muted-foreground`

---

## 5. Anti-Slop Hard Limits (Restrições Negativas)

1. ❌ **PROIBIDO** inventar cores hexadecimais inline (`bg-[#...]`, `text-[#...]`).
2. ❌ **PROIBIDO** misturar cinzas aleatórios (`bg-gray-800` num lugar e `bg-zinc-900` em outro).
3. ❌ **PROIBIDO** gradientes roxos/azuis arbitrários em botões sem especificação no plano.
4. ❌ **PROIBIDO** alterar `font-weight` no hover (evita layout shift).
5. ❌ **PROIBIDO** criar botões, inputs, cards ou modais do zero sem antes checar o diretório de componentes Shadcn existente (`components/ui/`).