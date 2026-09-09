# 📐 Web Interface Guidelines (Rauno Freiberg)

Compêndio completo das **48 diretrizes determinísticas de engenharia de interface** curadas por Rauno Freiberg (`interfaces.rauno.me`). Devem ser consultadas e seguidas estritamente por agentes de IA antes e durante qualquer desenvolvimento de UI.

---

## 1. Design & UX Guidelines (Regras 1 a 7)

1. **Optimistic Updates (Atualizações Otimistas)**:
   - Atualize os dados na interface do cliente imediatamente após o clique/ação do usuário.
   - Em caso de falha da mutation no servidor, reverta graciosamente o estado e exiba feedback contextual explicativo.
2. **Server-Side Authentication Redirects (Redirecionamentos de Auth no Servidor)**:
   - Redirecionamentos de rotas protegidas por autenticação DEVEM acontecer no servidor (SSR / Server Component / Middleware) antes da hidratação do cliente.
   - Previne flashes de layouts vazios, pulos de tela e renderização breve de dados não-autorizados.
3. **Context-Aware / Proximity Feedback (Feedback de Proximidade)**:
   - Exiba o feedback visual colado ao gatilho que o originou.
   - *Exemplo:* Mostrar um ícone temporário de checkmark diretamente ao lado do botão "Copiar Link" recém-clicado em vez de disparar um toast genérico no canto da tela.
4. **Contextual Form Error Highlighting (Destaque Contextual de Erros)**:
   - Destaque cirurgicamente o(s) campo(s) exato(s) com erro no formulário (borda vermelha e mensagem inline).
   - Nunca confie apenas em banners de erro genéricos ("Preencha todos os campos obrigatórios") no topo da página.
5. **Document Selection Styling (Estilização de Seleção de Texto)**:
   - Estilize a seleção de texto de forma sutil e limpa através da pseudo-classe `::selection` (ex.: `selection:bg-indigo-500/20 selection:text-indigo-200`).
   - Cancele efeitos pesados, gradientes ou filtros estranhos dentro de blocos de seleção.
6. **Actionable Empty States (Estados Vazios Acionáveis)**:
   - Telas vazias não devem ser becos sem saída. Devem guiar proativamente o usuário com ações primárias: botão de criar novo item, importação rápida ou templates de demonstração.
7. **System Theme-Adaptive SVG Favicon (Favicon SVG Adaptável ao Tema)**:
   - Use favicons em formato SVG com bloco `<style>` embutido usando `@media (prefers-color-scheme: dark)`. O ícone da aba do navegador deve se adaptar automaticamente ao modo claro ou escuro do SO.

---

## 2. Typography Guidelines (Regras 8 a 14)

8. **Font Smoothing (Suavização de Fonte)**:
   - Aplique sempre `-webkit-font-smoothing: antialiased` e `-moz-osx-font-smoothing: grayscale` no elemento root ou nas classes globais para garantir legibilidade nítida em monitores Retina e High-DPI.
9. **Legibility Optimization (Otimização de Legibilidade)**:
   - Utilize `text-rendering: optimizeLegibility` em títulos e textos de leitura para ativar pares de kerning e ligaduras tipográficas avançadas.
10. **Fluid Typography (Tipografia Fluida com clamp)**:
    - Escale títulos grandes fluidamente entre viewports mobile e desktop utilizando a função CSS `clamp()` (ex.: `font-size: clamp(2rem, 5vw, 3.5rem)`).
11. **No Font-Weight Layout Shifts (Proibição de Shift de Peso no Hover)**:
    - **NUNCA altere `font-weight` (ex.: de 400 para 600) em estados de `:hover`, `:focus` ou `:active`.**
    - Mudar o peso da fonte altera a métrica horizontal do glifo e faz todo o texto e elementos vizinhos saltarem (Cumulative Layout Shift). Use transição de cor, opacidade ou anel sutil.
12. **Minimum Font Weight (Peso Mínimo de 400)**:
    - Evite pesos ultra-leves (100, 200, 300) em interfaces digitais. Eles sofrem degradação severa de antialiasing e tornam-se ilegíveis em monitores padrão ou sob baixa iluminação.
13. **Heading Weight Range (Faixa de Peso de Headings: 500–600)**:
    - Para títulos e subtítulos de tamanho médio, utilize pesos equilibrados como 500 (Medium) ou 600 (Semi-bold) em vez do padrão bruto 700+ (Bold/Black), preservando a sofisticação visual.
14. **Font Subsetting (Subsetting de Fontes Web)**:
    - Subdivida as webfonts com base nos conjuntos de caracteres usados (Latin-1) para evitar payloads pesados e eliminar atrasos de carregamento e flashes de texto (FOIT / FOUT).

---

## 3. Animation & Motion Guidelines (Regras 15 a 21)

15. **Duration Guardrail (Duração Máxima de 200ms)**:
    - **Animações de micro-interação (hover, dropdown, modal, tabs) NÃO DEVEM exceder 200ms.**
    - A interface deve responder como uma extensão direta do pensamento do usuário, sem latência visual percebida.
16. **Proportionality to Trigger Size (Proporcionalidade da Distância ao Gatilho)**:
    - A distância de deslocamento (`translate`) deve ser proporcional ao tamanho do elemento acionador. Um botão de 32px deve se mover 2px ou 3px, nunca 20px.
17. **Modal / Dialog Scaling (Escala Inicial de 0.8 para 1)**:
    - Ao animar a entrada de modais e dialogs, nunca escale de 0 para 1.
    - Faça um fade de opacidade (0 → 1) combinando com uma escala sutil de **0.8 ou 0.9 para 1.0**.
18. **Subtle Button Press Scaling (Pressionamento Sutil de Botão)**:
    - No estado `:active` de botões, use escalas microscópicas de amortecimento (ex.: `active:scale-[0.98]` ou `0.97`). Escalas abaixo de 0.95 parecem caricatas e esponjosas.
19. **Reserve Motion for Novelty (Reserve Animações para Novidades)**:
    - Ações rotineiras e frequentes (abrir menus contextuais, navegar em listas, digitar em campos) devem dispensar animações floreadas. Guarde movimento para eventos de novidade (confirmação de sucesso, transição de rota, onboarding).
20. **Pause Off-Screen Looping Animations (Pause Loops Fora de Tela)**:
    - Qualquer animação contínua (keyframes CSS, WebGL, canvas, partículas) deve pausar quando o elemento rolar para fora da tela (usar `IntersectionObserver`).
21. **Disable Transitions on Theme Switch (Desative Transições na Troca de Tema)**:
    - Desative todas as transições e animações CSS momentaneamente durante a alternância entre tema claro e escuro para evitar aberrações cromáticas e flashes de cores misturadas.

---

## 4. Inputs & Forms Guidelines (Regras 22 a 30)

22. **Clickable Labels (Labels Clicáveis)**:
    - Clicar no texto do `<label>` DEVE focar o campo associado. Garanta sempre o par `htmlFor="campo-id"` e `<input id="campo-id">`.
23. **Form Element Wrapper (Envólucro de Formulário Semântico)**:
    - Sempre envolva grupos de inputs em uma tag `<form>`. Isso habilita nativamente o envio por tecla `Enter` e compatibilidade com navegadores e gerenciadores de senha.
24. **Native Validation Attributes (Atributos Nativos de Validação)**:
    - Aproveite atributos semânticos nativos do HTML5 (`required`, `minlength`, `maxlength`, `pattern`) como primeira linha de defesa, complementando com Zod.
25. **Semantic Input Types (Tipos Semânticos de Input)**:
    - Declare o tipo semântico exato (`type="email"`, `type="tel"`, `type="url"`, `type="number"`) para invocar o teclado virtual correto em smartphones e tablets.
26. **Spellcheck & Autocomplete Hygiene (Higiene de Autocomplete e Spellcheck)**:
    - Desative explicitamente `spellcheck="false"` e `autocomplete="off"` onde eles causam atrito desnecessário: nomes de usuário, códigos de autenticação, chaves de API e barras de busca.
27. **Input Adornments & Click Trigger (Ícones e Adornos de Input)**:
    - Ícones, botões de limpar e prefixos/sufixos devem ser posicionados de forma absoluta sobre o input (com padding interno proporcional) e clicar neles deve focar o input imediatamente.
28. **Immediate Toggle Effect (Efeito Imediato de Chaves e Toggles)**:
    - Switches e toggles booleanos devem disparar sua mutação imediatamente ao serem clicados, sem exigir um botão secundário de "Salvar Configurações".
29. **iOS 16px Font Guardrail (Mínimo de 16px para Evitar Zoom no iOS)**:
    - **O tamanho da fonte em campos de input DEVE ser de no mínimo 16px (`1rem` ou `text-base`) em mobile.**
    - Fontes menores que 16px disparam o zoom automático e irreversível do Safari no iOS, quebrando a diagramação da tela. No desktop, pode-se usar `md:text-sm`.
30. **Avoid Touch Auto-Focus (Evite Auto-Focus em Telas Touch)**:
    - Nunca aplique `autoFocus` em inputs quando o usuário acessar a aplicação via dispositivo móvel, pois isso invoca imediatamente o teclado virtual cobrindo 50% da interface antes do usuário entender a página.

---

## 5. Accessibility (a11y) Guidelines (Regras 31 a 37)

31. **No Tooltips on Disabled Buttons (Sem Tooltips em Botões Desabilitados)**:
    - Elementos `<button disabled>` são removidos da árvore de foco de teclado. Leitores de tela e usuários de teclado nunca conseguirão ler a tooltip explicativa. Use botões ativos com validação inline ou containers acessíveis.
32. **Box-Shadow for Focus Rings (Box-Shadow em Vez de Outline)**:
    - Use anéis de foco construídos com `box-shadow` (ou classes Tailwind `ring-2 ring-indigo-500`) em vez da propriedade CSS `outline`, pois o `box-shadow` respeita perfeitamente o `border-radius` do componente.
33. **Keyboard Arrow Navigation in Lists (Navegação por Setas em Menus e Listas)**:
    - Menus dropdown, tabs e listas de sugestões devem suportar navegação sequencial através das setas do teclado (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) e seleção via `Enter` ou `Space`.
34. **Immediate Trigger on Mousedown (Disparo em Mousedown para Menus)**:
    - Utilize o evento `onMouseDown` em vez de `onClick` no acionamento de dropdowns e menus flutuantes para eliminar a latência do ciclo de clique e prover resposta instantânea.
35. **Icon-Only Accessible Labels (Labels Acessíveis em Botões de Ícone)**:
    - Qualquer elemento clicável que contenha apenas um ícone SVG DEVE possuir um atributo `aria-label="Descrição da Ação"` explícito ou um elemento `<span className="sr-only">`.
36. **Illustration Semantics (Semântica de Ilustrações)**:
    - Ilustrações puramente visuais devem conter `aria-hidden="true"`. Gráficos funcionais informativos devem conter um `<title>` ou `aria-label` descritivo.
37. **Non-Interactive Hover Tooltips (Tooltips Sem Elementos Interativos)**:
    - Tooltips disparadas por hover do mouse nunca devem conter links ou botões internos clicáveis, pois o mouse não consegue alcançá-los sem fechar a tooltip. Use Popover para conteúdo interativo.

---

## 6. Performance & Optimizations (Regras 38 a 44)

38. **Large Blur Cost (Custo Computacional de Grandes Blurs)**:
    - Valores altos de `blur()` em `filter` e `backdrop-filter` (ex.: > 24px) exigem processamento pesado de shaders na GPU e causam quedas de framerate ao rolar a página. Limite a `backdrop-blur-md` (máximo de 12px).
39. **Radial Gradients over Blurred Shapes (Gradientes Radiais em Vez de Divs Borradas)**:
    - **NUNCA crie halos e luzes ambientes borrando divs retangulares com `filter: blur(100px)`.**
    - Isso causa banding cromático e engasgos de rasterização. Use CSS nativo: `radial-gradient(circle at center, rgba(99,102,241,0.15) 0%, transparent 70%)`.
40. **Sparing GPU Promotion (Uso Cirúrgico de Camadas de GPU)**:
    - Use `transform: translateZ(0)` ou `transform-gpu` com parcimônia e apenas em elementos com animações comprovadamente pesadas. Promover muitos nós cria sobrecarga de memória VRAM.
41. **Transient will-change on Scroll (will-change Temporário)**:
    - Aplique a propriedade `will-change: transform` apenas no momento em que a animação de scroll se inicia e remova-a assim que a transição terminar.
42. **Video Overload on Mobile (Cuidado com Vídeos Múltiplos no Mobile)**:
    - Autoplay de múltiplos elementos `<video>` em mobile esgota a bateria e afoga a GPU do aparelho. Pause vídeos que saírem da área visível.
43. **React DOM Refs Bypass (Bypass do Virtual DOM via Refs)**:
    - Para valores de altíssima frequência (tracking de cursor, posição de scroll, drag and drop), use referências mutáveis (`useRef`) manipulando o nó do DOM diretamente em vez de estados React (`useState`) que forçam re-renders da árvore inteira a cada frame.
44. **Hardware & Network Adaptation (Adaptação a Recursos do Dispositivo)**:
    - Consulte `navigator.connection` e `prefers-reduced-motion` para simplificar gráficos complexos em conexões lentas ou hardwares limitados.

---

## 7. Touch & Mobile Details (Regras 45 a 48)

45. **Hover Isolation on Touch (Isolamento de Hover em Telas Touch)**:
    - **Estados de `:hover` NUNCA devem "grudar" ou disparar ao tocar em smartphones.**
    - Envolva estilos de hover com `@media (hover: hover)` ou utilize as variantes Tailwind modernas para prevenir cards e botões travados no estado aceso após o toque.
46. **Disable iOS Tap Highlight (Desativação do Highlight Cinza do iOS)**:
    - Remova a caixa cinza translúcida nativa do WebKit via `-webkit-tap-highlight-color: transparent` e implemente feedback de toque deliberado via pseudo-classe `:active`.
47. **Autoplay Video Attributes (Atributos Obrigatórios para Vídeos)**:
    - Tags `<video>` destinadas a reproduzir automaticamente no iOS Safari DEVEM conter os quatro atributos: `autoPlay`, `muted`, `playsInline` e `loop`. Sem `muted` e `playsInline`, o navegador bloqueia a reprodução.
48. **Touch-Action Conflict Prevention (Prevenção de Conflitos de Gestos)**:
    - Em componentes com gestos customizados (carrosséis, sliders, canvas de desenho), aplique `touch-action: pan-y` ou `touch-action: none` para impedir que o navegador confunda o gesto com a rolagem nativa da página.
