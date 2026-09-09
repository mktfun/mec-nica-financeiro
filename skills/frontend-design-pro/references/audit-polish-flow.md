# 🔍 Fluxo de Auditoria e Refinamento Visual (/audit → /polish)

Protocolo determinístico de refinamento visual e eliminação de **AI Slop** baseado na metodologia do **Impeccable** e do manifesto de Design Engineering.

---

## 1. O Princípio Cardeal: Proibição do "Redesign Completo"

> [!CAUTION]
> **NUNCA peça ou execute um "redesign completo" de uma tela que já está funcional.**
> Quando um modelo de IA recebe a instrução vaga de "fazer um redesign", ele apaga a arquitetura de componentes existente, descarta estados de loading/error cuidadosamente construídos, inventa uma nova paleta arbitrária e reintroduz dezenas de anti-patterns de AI Slop.

O ciclo correto de evolução de design é estritamente **cirúrgico, incremental e diagnóstico**.

---

## 2. A Sequência Obrigatória em 2 Passos

```
[Tela Existente / Rascunho]
       ↓
[PASSO 1: /audit]  -->  Diagnóstico forense analítico SEM mexer em código
       ↓
[PASSO 2: /polish] -->  Micro-ajustes de 4px/8px, tracking, espessura e cores
```

---

### Passo 1: `/audit` (Diagnóstico Visual Estrito)

Antes de alterar qualquer arquivo TSX/CSS, o agente deve executar uma auditoria estática seguindo este checklist:

1. **Aderência ao `DESIGN.md`**: Existem classes arbitrárias fora dos tokens (ex.: `bg-[#1a1c24]`, `p-[17px]`, `rounded-[22px]`)?
2. **Contraste WCAG (4.5:1)**: O texto secundário (`text-zinc-400`/`text-zinc-500`) é legível sobre a superfície em que está inserido?
3. **Ritmo de Espaçamento**: O espaçamento segue a grade de 4px/8px (gap-2, gap-4, gap-6, p-6)? Há padding sufocado ou desproporcional?
4. **Hierarquia Tipográfica**: Há contraste nítido entre H1, H2, H3 e texto corrido? Há títulos usando itálicos pretensiosos ou kickers redundantes?
5. **Detecção de Slop**: Há gradientes roxos sem contexto, cards aninhados em cards (Cardocalypse), ou ícones em quadradinhos flutuantes?
6. **Estados Interativos**: Todos os botões possuem hover sutil, active e focus ring via box-shadow?
7. **Responsividade Mobile**: Há quebra de linha feia em 375px? Os inputs possuem no mínimo 16px?

**Output esperado do `/audit`**: Um relatório conciso em lista com os 3 a 5 pontos críticos a corrigir, sem tocar no código.

---

### Passo 2: `/polish` (Micro-Calibração Cirúrgica)

Após o `/audit`, o agente aplica correções cirúrgicas nas propriedades visuais:

- **Calibrar espaçamento**: Ajustar `p-4` para `p-6` para dar respiro, ou `gap-6` para `gap-3` entre itens relacionados.
- **Harmonizar bordas**: Trocar bordas sólidas pesadas (`border-2 border-indigo-500`) por micro-bordas sutis (`border border-white/10`).
- **Suavizar contrastes**: Ajustar texto muito brilhante para `text-zinc-300` ou texto muito apagado para `text-zinc-400`.
- **Refinar tipografia**: Ajustar tracking (`tracking-tight` em títulos grandes), line-height (`leading-relaxed` em parágrafos) e remover itálicos supérfluos.
- **Alinhar raios**: Garantir que o border-radius do elemento filho seja menor que o do container pai ($R_{\text{filho}} = R_{\text{pai}} - \text{padding}$).

---

## 3. Comandos Direcionais de Calibração

Quando a interface precisa de um ajuste de tom específico, utilize os seguintes comandos conceituais:

### `/bolder` (Aumentar Presença e Peso)
* **Quando usar:** Quando a tela parece "apagada", tímida, cinzenta ou sem ponto focal claro.
* **O que fazer:**
  - Aumentar o tamanho da fonte do título principal (ex.: de `text-2xl` para `text-4xl`).
  - Elevar o contraste dos textos primários para `text-zinc-100`.
  - Dar mais ênfase ao botão de CTA principal com cor sólida vibrante e padding generoso.
  - Aumentar o espaçamento entre seções para valorizar o conteúdo.

### `/quieter` (Reduzir Ruído e Poluição)
* **Quando usar:** Quando a tela está gritando, com muitas bordas, muitas cores concorrendo ou excesso de cards.
* **O que fazer:**
  - Remover bordas desnecessárias entre seções e usar apenas espaçamento vertical para separar.
  - Trocar backgrounds coloridos saturados por tons neutros (`bg-zinc-900/40`).
  - Desaturar cores secundárias para cinzas sutis.
  - Desativar animações chamativas ou gradientes de fundo.

### `/distill` (Encontrar a Essência)
* **Quando usar:** Quando o layout tem elementos demais competindo pelo mesmo nível de atenção.
* **O que fazer:**
  - Identificar a métrica ou ação primária da tela e torná-la 3x maior que o resto.
  - Converter cards secundários em linhas de lista limpas.
  - Eliminar badges de status redundantes ("Live", "Active", "New") espalhadas por toda parte.
