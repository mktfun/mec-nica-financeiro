# 🚫 Catálogo Definitivo de AI Slop & Anti-Patterns de UI

Referência de anti-patterns visuais, estruturais e ergonômicos gerados comumente por LLMs de código. Inspirado no catálogo oficial do **Impeccable** (`impeccable.style/slop`), nas análises do manifesto anti-slop e nas heurísticas de Design Engineering.

---

## 1. Design System Drift (4 Regras)

Anti-patterns de quebra e desvio do design system documentado no projeto (`DESIGN.md`).

| ID | Anti-Pattern | Sintoma do Modelo | Solução / Correção |
|---|---|---|---|
| `design-system-font` | **Font outside DESIGN.md** | IA importa fontes aleatórias (Comic Sans, Roboto, Pacifico) ignorando a tipografia documentada. | Usar estritamente a família tipográfica declarada no `DESIGN.md`. |
| `design-system-color` | **Color outside DESIGN.md** | IA usa cores arbitrárias em Tailwind (ex.: `bg-[#4d28e8]`, `text-purple-600`) em vez dos tokens da paleta. | Utilizar apenas tokens semânticos do projeto (ex.: `bg-zinc-950`, `text-zinc-100`, `bg-indigo-600`). |
| `design-system-radius` | **Radius outside DESIGN.md** | Mistura de `rounded-3xl` com `rounded-none` e `rounded-md` sem escala matemática de raios. | Aderir à escala de corner radius do projeto (`sm: 6px`, `md: 8px`, `lg: 12px`, `xl: 16px`). |
| `design-system-font-size` | **Font size outside DESIGN.md** | Tamanhos de fonte fora da escala modular (ex.: `text-[19px]`, `text-[13px]`). | Seguir os degraus tipográficos da escala (12, 14, 16, 20, 24, 30, 36, 48px). |

---

## 2. Detalhes Visuais Clichês (8 Regras)

Vícios decorativos superficiais que entregam imediatamente que o design foi gerado por IA sem curadoria.

| ID | Anti-Pattern | Sintoma do Modelo | Solução / Correção |
|---|---|---|---|
| `codex-grid-background` | **Decorative grid-line background** | Backgrounds cobertos por grades sutis SVG/CSS repetitivas apenas para preencher espaço vazio. | Reservar grids decorativos para telas de medição, mapas ou editores de canvas. Em SaaS, usar superfícies sólidas limpas. |
| `border-accent-on-rounded` | **Border accent on rounded element** | Bordas coloridas espessas (2px–3px) contornando cards com cantos muito arredondados (`rounded-2xl`). | Borda de 1px sutil (`border-zinc-800` ou `border-white/10`) ou permitir que o background defina o contraste. |
| `glassmorphism-everywhere` | **Glassmorphism everywhere** | `backdrop-blur-md bg-white/10` aplicado indiscriminadamente em cards de conteúdo, listas e botões. | Frosted glass APENAS em overlays flutuantes (header fixo, dock, modal overlay). Cards de conteúdo devem ter superfície sólida. |
| `side-tab-accent` | **Side-tab accent border** | Tarja colorida arbitrária na borda esquerda (`border-l-4 border-indigo-500`) em cards sem status de alerta. | Remover a tarja. Bordas laterais servem exclusivamente para status semânticos (alerta, erro, pendência). |
| `thin-border-wide-shadow` | **Hairline border with wide shadow** | Card com borda de 1px associada a uma sombra difusa gigantesca (`shadow-2xl shadow-black/50`). | Escolher a borda OU a sombra sutil. Em Dark Mode, usar elevação de luminância de superfície, não sombras pretas. |
| `repeating-stripes-gradient` | **Repeating-gradient stripes** | Fundos com gradientes listrados diagonais (`repeating-linear-gradient`) como enchimento visual. | Usar superfície lisa ou textura autêntica da identidade da marca. |
| `extreme-border-radius` | **Extreme border-radius on cards** | Cards retangulares espremidos por cantos estilo pílula (`rounded-[40px]`). | O raio da borda deve ser proporcional ao tamanho do container (geralmente entre 8px e 16px para cards). |
| `rough-svg-illustrations` | **Rough SVG illustrations / mascots** | Mascotes ou rabiscos toscos desenhados em SVG inline com caminhos tortos gerados por LLM. | Utilizar ilustrações profissionais vetorizadas, fotografia de alta qualidade ou tipografia pura. |

---

## 3. Tipografia & Hierarquia de Texto (11 Regras)

Erros graves na escala, contraste e estilo das fontes.

| ID | Anti-Pattern | Sintoma do Modelo | Solução / Correção |
|---|---|---|---|
| `kicker-above-heading` | **Label / Kicker above heading** | Textinho em caixa alta (`FEATURES`, `OVERVIEW`) empilhado em cima do H1 dizendo a mesma coisa. | Se o kicker apenas repete o contexto óbvio, elimine-o. Incorpore a mensagem no próprio título. |
| `undersized-ui-text` | **Tiny interface text (< 12px)** | Textos de navegação, labels ou metadados minúsculos (`text-[9px]`, `text-[10px]`) ilegíveis. | Tamanho mínimo de leitura para interface de desktop: 12px; para mobile: 14px; para inputs: 16px. |
| `flat-type-hierarchy` | **Flat type hierarchy** | Título (18px), subtítulo (16px) e corpo (15px) quase no mesmo tamanho e peso, tornando a página monótona. | Criar contraste nítido de escala: H1 (32–40px), H2 (24px), H3 (18px), Body (14–16px). |
| `icon-tile-stack` | **Icon tile stacked above heading** | Quadrinho arredondado colorido com um ícone Lucide centralizado em cima de cada título de card. | Posicionar o ícone inline ao lado do título ou remover o container/azulejo colorido. |
| `italic-serif-display` | **Italic serif display headline** | Headings com palavras forçadas em itálico com fontes clássicas (`Construa o *futuro* agora`) tentando parecer chique. | Manter a família tipográfica da marca sem misturar itálicos pretensiosos que quebram o tom do produto. |
| `hero-eyebrow-chip` | **Hero eyebrow chip / pill** | O indefectível pill flutuante `✨ NOVIDADE: IA 2.0` colado acima do hero principal em todo SaaS. | Usar apenas quando houver um anúncio real com link clicável para changelog. |
| `gradient-text-heading` | **Gradient text heading** | Títulos com `bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-500`. | Usar texto com cor contrastante sólida (`text-zinc-100`). Gradientes de texto prejudicam legibilidade. |
| `emoji-as-icon` | **Emoji as interface icon** | Botões e menus usando emojis (🚀, 🔥, 📊, ⚡) como ícones de sistema. | Proibição absoluta de emojis como ícones de ação. Utilizar ícones SVG profissionais (Lucide). |
| `font-weight-hover-shift` | **Font-weight layout shift on hover** | Aumentar `font-semibold` para `font-bold` no hover, empurrando o texto vizinho (Layout Shift). | NUNCA alterar `font-weight` no hover. Usar transição de cor, background ou sublinhado óptico. |
| `thin-font-weights` | **Sub-400 thin font weights** | Usar pesos 100, 200 ou 300 em telas digitais, causando perda de legibilidade em monitores comuns. | Peso mínimo permitido para corpo de texto e UI: 400 (Regular). |
| `overused-font-monoculture` | **Inter / Roboto monoculture** | Dependência automática de Inter para tudo sem avaliar se a marca pede algo com mais personalidade (Geist, Outfit, Syne). | Escolher a tipografia consciente alinhada com o nicho de produto no `DESIGN.md`. |

---

## 4. Cores & Contraste (7 Regras)

Uso indiscriminado de paletas e falhas de acessibilidade cromática.

| ID | Anti-Pattern | Sintoma do Modelo | Solução / Correção |
|---|---|---|---|
| `purple-violet-gradient` | **Purple-to-blue gradient everywhere** | Todos os botões primários, bordas e destaques usam o degradê roxo/índigo genérico de template Vercel. | Usar cores de destaque sólidas e consistentes, ancoradas na paleta da marca. |
| `bad-contrast-choices` | **Low-contrast text / WCAG failure** | Textos em cinza médio (`text-zinc-600`) sobre fundos escuros (`bg-zinc-900`) com contraste < 4.5:1. | Garantir contraste mínimo de 4.5:1 para texto normal e 3:1 para títulos grandes (WCAG AA). |
| `pure-black-canvas` | **Pure black (#000000) base canvas** | Usar `#000000` absoluto como fundo, matando qualquer capacidade de sombreamento e gerando vibração óptica. | Usar Zinc-950 (`#09090b`) ou Slate-950 como base, permitindo sombras e elevação de superfícies. |
| `neon-glow-abuse` | **Neon radial halo overload** | Orbes gigantes de luz colorida borrada no fundo simulando profundidade, poluindo o conteúdo. | Reduzir halos a sutis gradientes radiais com opacidade máxima de 10–15% atrás de gráficos chave. |
| `gray-text-on-color` | **Muted gray on saturated color** | Usar `text-zinc-400` em cima de um card azul ou verde, deixando o texto "sujo". | Em fundos coloridos, usar tintas e sombras da mesma família cromática (ex.: texto azul-claro em fundo azul). |
| `cyan-on-dark-trope` | **Cyan/Green hacker developer trope** | Forçar verde terminal ou ciano neon sempre que o produto tem "código" ou "dev" no nome. | Adotar paletas sofisticadas de ferramentas modernas (ex.: Linear, Supabase, Raycast). |
| `color-inconsistent-states` | **Inconsistent semantic feedback colors** | Sucesso em verde, aviso em roxo e erro em laranja pastel sem padronização. | Seguir estritamente: Sucesso = Emerald, Aviso = Amber, Perigo = Rose, Info = Blue. |

---

## 5. Layout & Espaçamento (12 Regras)

Estruturas desproporcionais e falta de respiro ergonômico.

| ID | Anti-Pattern | Sintoma do Modelo | Solução / Correção |
|---|---|---|---|
| `cardocalypse` | **Cardocalypse (Cards inside cards)** | 4 a 5 camadas de cards aninhados, cada uma adicionando bordas, sombras e padding, devorando o espaço útil. | Achatar a hierarquia. Usar divisores sutis (`border-t border-zinc-800`), espaçamento e tipografia para agrupar. |
| `copy-paste-layouts` | **Copy-paste layouts (3-card syndrome)** | Toda tela vira o mesmo grid de 3 colunas com cards idênticos, independentemente do tipo de dado. | Variar composições: listas densas, tabelas paginadas, layouts editoriais assimétricos, painéis mestre-detalhe. |
| `monotonous-spacing` | **Uniform spacing flatline** | Usar `p-6`, `gap-6` e `mb-6` em todos os nós do DOM sem distinção de agrupamento. | Aplicar a lei da proximidade: elementos relacionados ficam mais próximos (gap-2), seções mais distantes (gap-8/12). |
| `everything-centered` | **Monolithic center alignment** | Centralizar títulos, parágrafos, listas de benefícios e botões pela página inteira. | Alinhar à esquerda o conteúdo de leitura para respeitar o eixo natural de varredura visual (F-shape). |
| `massive-icons` | **Massive decorative icons** | Ícones gigantes (48px+) dentro de cards de features que roubam o protagonismo do texto. | Ícones de feature devem ser complementares (tamanho ideal: 18px a 24px). |
| `modal-abuse` | **Modal abuse for complex workflows** | Enfiar formulários com dezenas de campos ou tabelas inteiras dentro de um Dialog com scroll interno. | Se a tarefa exige mais de 4 campos ou dados complexos, use uma página dedicada ou um Drawer lateral. |
| `cramped-padding` | **Cramped container padding** | Textos grandes encostando nas bordas do card (`p-2` ou `p-3` em containers grandes). | Manter proporção confortável de respiro interno (`p-5` a `p-8` em cards principais). |
| `border-radius-mismatch` | **Concentric radius clash** | Um elemento interno com o mesmo border-radius do elemento pai, criando cantos desalinhados. | Respeitar a fórmula matemática: $R_{\text{interno}} = R_{\text{externo}} - \text{padding}$. |
| `runaway-measure` | **Runaway line length (> 80 chars)** | Parágrafos de texto que se estendem por toda a largura da tela em monitores ultrawide. | Limitar comprimento de linha de leitura com `max-w-prose` ou `max-w-2xl` (65–75 caracteres por linha). |
| `unbalanced-hero-columns` | **Unbalanced hero columns** | Uma coluna de texto super pesada ao lado de uma imagem vazia ou um mockup artificial. | Equilibrar o peso visual das colunas com hierarquia de botões, métricas e visual real do produto. |
| `fake-dashboard-mockup` | **Synthetic mockup illustration** | Mockups falsos de dashboards com números inventados (`+142%`) sem relação com o produto. | Exibir capturas reais do software, interações ao vivo ou componentes funcionais no hero. |
| `sticky-header-claustrophobia` | **Oversized sticky headers** | Headers fixos no topo com mais de 72px de altura que comem 20% da tela em laptops. | Headers fixos devem ser compactos (48px a 56px) com `backdrop-blur` leve. |

---

## 6. Movimento & Micro-interações (6 Regras)

Animações barulhentas que cansam o usuário e degradam a performance.

| ID | Anti-Pattern | Sintoma do Modelo | Solução / Correção |
|---|---|---|---|
| `bounce-elastic-easing` | **Cartoonish rubber-band bounce** | Dropdowns e botões que "quicam" ou balançam ao serem clicados com curvas elásticas exageradas. | Utilizar curvas de aceleração padrão (`ease-out` ou molas com amortecimento alto sem overshoot). |
| `slow-interaction-duration` | **Sluggish transitions (> 200ms)** | Modais e menus demorando 400ms–500ms para abrir, criando sensação de app lento. | Transições de interação devem ser quase instantâneas: **máximo de 150ms a 200ms**. |
| `hover-image-zoom-spam` | **Pointless hover scale on cards** | Todo card escala (`hover:scale-105`) quando o usuário passa o mouse, mesmo sem ser clicável. | Reservar escala apenas para itens que realmente oferecem ação de clique imediata e usar escala sutil (`hover:scale-[1.01]`). |
| `always-on-looping` | **Unpausing background loops** | Elementos que ficam pulsando, girando ou oscilando continuamente em segundo plano consumindo CPU. | Pausar animações em loop quando o elemento sai do viewport (via IntersectionObserver) ou após 3 repetições. |
| `layout-thrashing-motion` | **Animating geometric layout properties** | Animar `width`, `height`, `top` ou `margin` em vez de propriedades da GPU. | Animar EXCLUSIVAMENTE `transform` e `opacity` para garantir 60fps sem recalcular o layout do DOM. |
| `missing-reduced-motion` | **Missing motion-reduce query** | Animações contínuas que ignoram a preferência de acessibilidade do sistema do usuário. | Adicionar `motion-reduce:animate-none` e `motion-reduce:transition-none` em todas as regras dinâmicas. |

---

## 7. UX Writing & Microcopy (5 Regras)

Textos vagos, clichês de marketing gerados por IA e repetições inúteis.

| ID | Anti-Pattern | Sintoma do Modelo | Solução / Correção |
|---|---|---|---|
| `redundant-ux-writing` | **Redundant multi-explaining** | 4 linhas explicando o que um campo de busca faz ("Busque aqui para encontrar seus arquivos no sistema"). | Microcopy cirúrgica e concisa: "Buscar transações ou clientes...". Deixe a interface falar por si. |
| `vague-headline-cliche` | **"Unlock your potential" headlines** | Títulos de marketing genéricos ("Potencialize seu fluxo de trabalho com a inteligência do futuro"). | Dizer com precisão o que o produto faz: "Conciliação bancária automática para empresas de serviço". |
| `generic-cta-buttons` | **Vague CTA buttons ("Submit", "Continue")** | Botões primários com labels genéricos que não informam o resultado da ação. | Usar verbos de ação explícitos: "Importar Extrato OFX", "Criar Fatura", "Conectar Banco". |
| `foreign-language-leak` | **English UI leaks in localized apps** | Mensagens de erro em inglês ("Something went wrong") aparecendo em apps em português. | Todas as mensagens de erro, toasts e descrições devem estar localizadas no idioma do produto (pt-BR). |
| `em-dash-overload` | **Em-dash (—) and ellipsis abuse** | Textos cheios de travessões duplos e reticências poéticas típicas de escrita de LLM. | Frases diretas, pontuação limpa e afirmativa. |

---

## 8. Imagens & Assets (4 Regras)

Uso preguiçoso de recursos visuais sem propósito.

| ID | Anti-Pattern | Sintoma do Modelo | Solução / Correção |
|---|---|---|---|
| `generic-stock-avatars` | **Synthetic smiling corporate avatars** | Avatares genéricos de banco de imagens de pessoas com headsets em depoimentos falsos. | Usar fotos contextuais realistas ou iniciais estilizadas em badges de perfil (`JD`, `MS`). |
| `missing-image-dimensions` | **Missing width/height on images** | Tags `<img>` sem dimensões explícitas causando saltos no carregamento da página (CLS). | Sempre especificar `width`, `height` e `aspect-ratio` para reservar o espaço físico antes do carregamento. |
| `missing-alt-descriptions` | **Empty or missing image alt attributes** | Imagens sem descrição de acessibilidade para leitores de tela. | Fornecer descrições contextuais claras em `alt="..."` ou declarar `aria-hidden="true"` se for decorativa. |
| `blurry-asset-rendering` | **Low-res raster logos on retina** | Ícones ou logotipos em PNG de baixa resolução que ficam borrados em telas de alta densidade. | Usar vetores SVG para todos os ícones, marcas e ilustrações da interface. |

---

## 9. Qualidade Geral & Engenharia de UX (10 Regras)

Defeitos que quebram a robustez técnica e a ergonomia funcional do software.

| ID | Anti-Pattern | Sintoma do Modelo | Solução / Correção |
|---|---|---|---|
| `missing-focus-rings` | **Missing keyboard focus states** | Remover outlines com `outline-none` sem fornecer um indicador de foco visível para navegação por teclado. | Adicionar anéis de foco elegantes via `ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950`. |
| `small-touch-targets` | **Sub-44px touch targets on mobile** | Botões de fechar modais, ícones de paginação ou links medindo menos de 44x44px em telas touch. | Garantir área mínima clicável de 44x44px em dispositivos móveis (mesmo com ícones visuais de 18px). |
| `no-error-states-on-inputs` | **Inputs without visible error states** | Campos de formulário com erro que só avisam via toast global sem marcar a borda do input. | Marcar a borda em vermelho (`border-rose-500`) e exibir a mensagem de erro inline diretamente abaixo do campo. |
| `missing-loading-skeletons` | **Content jump without loading skeleton** | Telas assíncronas que ficam em branco ou dão pulos visuais ao receber dados da API. | Implementar skeletons com dimensões idênticas às do conteúdo final com animação suave de pulso. |
| `missing-empty-states` | **Blank canvas when table is empty** | Tabela sem registros que renderiza apenas um cabeçalho cinza vazio sem explicação. | Exibir estado vazio com ilustração contextual, mensagem clara e botão primário para criar o primeiro item. |
| `broken-mobile-drawer` | **Horizontal scroll on mobile tables** | Tabelas que vazam a tela e quebram a viewport do smartphone sem container de overflow. | Envolver em `<div className="overflow-x-auto">` ou converter linhas em cards compactos no breakpoint `sm`. |
| `ios-zoom-on-input-focus` | **Inputs with font-size < 16px on mobile** | Inputs com `text-xs` ou `text-sm` (14px) no iOS, forçando o Safari a dar zoom automático na tela. | Inputs em mobile DEVEM ter no mínimo 16px (`text-base md:text-sm`). |
| `unreachable-pagination` | **Pagination hidden under infinite scroll** | Colocar rodapés e paginação abaixo de listas que carregam infinitamente. | Usar paginação explícita para dados corporativos ou botão "Carregar mais". |
| `unvalidated-form-submits` | **Enabled submit during ongoing request** | Usuário clica 5 vezes no botão "Salvar" gerando 5 requisições duplicadas. | Desabilitar o botão (`disabled`) e exibir spinner ou texto "Salvando..." durante mutações assíncronas. |
| `toast-flooding` | **Toast notification spam** | Disparar múltiplos toasts simultâneos no topo da tela para ações simples que deveriam ter feedback inline. | Preferir feedback de proximidade (ex.: checkmark inline no botão "Copiar") a toasts invasivos. |
