# Proposal: Eliminação de Erros de Terminal (Sourcemaps Ausentes e Loop Infinito em useSession) (325)

## Problema

Ao iniciar o servidor de desenvolvimento na porta 8080 (`node scripts/dev-server-logger.mjs`) e navegar pelas rotas do sistema (`/` e `/conciliacao`), o terminal do desenvolvedor é inundado por uma avalanche de erros e alertas alarmantes:

1. **Mais de 140 linhas de erro falso categorizadas como `[ERROR]`** no terminal e em `logs/error.log`, reportando `Failed to load source map for .../node_modules/@tanstack/router-core/...: ENOENT: no such file or directory`.
2. **Erro crítico de React no console/terminal:** `Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render`.
3. **Flickering e re-renders em cascata** ao carregar as páginas principais da aplicação financeira.

---

## Root Cause (3 Causas Mapeadas)

### 1. Ausência de Sourcemaps em Pacotes NPM de Terceiros (`@tanstack`)
Os pacotes `@tanstack/react-router` e `@tanstack/router-core` distribuem seus arquivos `.js` compilados contendo o comentário `//# sourceMappingURL=*.js.map`, porém o mantenedor não inclui os arquivos físicos `.map` no pacote publicado no npm.
- Quando o Vite inicia e executa a transformação de dependências (`loadAndTransform`), ele tenta carregar o sourcemap indicado, captura um `ENOENT` e emite um aviso via `logger.warn` direcionado ao `process.stderr`.
- O processo interceptador `scripts/dev-server-logger.mjs` trata qualquer saída em `stderr` (sem a palavra explícita "warning") como `[ERROR]` crítico e dispara `process.stderr.write`, poluindo a tela com dezenas de avisos inofensivos em vermelho.

### 2. Dependência Circular e Instabilidade Referencial no `useSession` (`useAuth.ts`)
O hook `useSession` gerencia o estado de autenticação através da seguinte implementação:
```typescript
const [session, setSession] = useState<Session | null | undefined>(globalSession);

useEffect(() => {
  // ...
  if (session !== globalSession) {
    setSession(globalSession);
  }
}, [session]);
```
- A inclusão de `[session]` na lista de dependências combinada com a verificação de igualdade referencial `session !== globalSession` causa um loop infinito no React 19:
  1. `globalSession` é atribuído após `supabase.auth.getSession()` ou `onAuthStateChange`.
  2. O `useEffect` roda porque `session` mudou (ou na montagem).
  3. Cada evento do Supabase instancia novos objetos `session`, tornando `session !== globalSession` verdadeiro.
  4. `setSession(globalSession)` agenda uma nova renderização.
  5. A nova renderização re-executa o `useEffect` porque `session` é a dependência.
  6. O ciclo se repete mais de 50 vezes em milissegundos, disparando a exceção fatal `Maximum update depth exceeded`.

### 3. Instabilidade Referencial de Arrays Padrão no Destructuring de Rotas
Nas rotas `src/routes/index.tsx` e `src/routes/conciliacao.index.tsx`:
```typescript
const { data: availableDates = [], isLoading: loadingDates } = useAvailableConciliacaoDates();
// ...
useEffect(() => {
  // ...
}, [availableDates, selectedDate]);
```
- A expressão `data: availableDates = []` cria uma nova referência de array literal `[]` a cada ciclo de renderização enquanto `data` for `undefined`.
- Essa nova referência invalida o array de dependências do `useEffect`, provocando execuções redundantes e disputas de estado com o seletor de data da conciliação.

---

## Solução Proposta

### 1. Filtragem Inteligente de Sourcemaps em Vite e Logger
- **No Vite (`vite.config.ts`):** Injetar configuração de `customLogger` que suprime especificamente os avisos benignos de `Failed to load source map` gerados por dependências externas em `node_modules` (`@tanstack`).
- **No Logger de Auditoria (`scripts/dev-server-logger.mjs`):** Interceptar chunks de `stderr` contendo `Failed to load source map` ou `node_modules/@tanstack`, evitando que sejam impressos como erro crítico no console e classificando-os estritamente como nível `DEBUG` ou `WARN` em disco.

### 2. Migração do `useSession` para `useSyncExternalStore` (React Standard)
- Substituir o padrão frágil de `useState` + `useEffect([session])` pela API nativa recomendada pelo React: `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`.
- **Benefícios:**
  - Zero dependências instáveis ou loops de `setState`.
  - Atualizações síncronas e atômicas quando a sessão do Supabase muda.
  - Elimina 100% dos avisos de `Maximum update depth exceeded`.
  - Mantém 100% de compatibilidade com a assinatura `Session | null | undefined` consumida pelo `AppShell.tsx` e `useUserPermissions.ts`.

### 3. Estabilização Referencial de Constantes nas Rotas
- Declarar `const EMPTY_DATES: string[] = [];` no nível de módulo em `src/routes/index.tsx` e `src/routes/conciliacao.index.tsx`.
- Utilizar `data: availableDates = EMPTY_DATES`, garantindo que o array de dependências dos `useEffect`s permaneça imutável entre renders.

---

## Componentes Reutilizados (Zero Criação Paralela)

- **Zero pacotes adicionais:** Utiliza `useSyncExternalStore` nativo do React e `createLogger` nativo do Vite.
- **Zero novos hooks ou arquivos descartáveis:** Todos os ajustes são feitos cirurgicamente nos 5 arquivos existentes.
- **Preservação de contratos:** Nenhuma assinatura de função, prop ou hook existente é alterada.

---

## Contratos de Dados

- `useSession(): Session | null | undefined` (Retorno estritamente mantido).
- `AppShell.tsx` continua operando com `session === undefined` (loading), `session === null` (redirecionamento `/login`), e `session !== null` (autenticado).

---

## Mudanças por Arquivo [MODIFY]

### 1. `[MODIFY] vite.config.ts`
- Importar `createLogger` do Vite.
- Instanciar logger customizado com supressão de warnings de sourcemap para `@tanstack` em `node_modules`.

### 2. `[MODIFY] scripts/dev-server-logger.mjs`
- Adicionar filtro defensivo na captura de `stderr` e na classificação de linhas para ignorar mensagens inofensivas de sourcemaps ausentes.
- Impedir que avisos de `node_modules` incrementem o contador de `sessionStats.errorCount`.

### 3. `[MODIFY] src/hooks/useAuth.ts`
- Refatorar `useSession()` para utilizar `useSyncExternalStore`.
- Estruturar funções `subscribe`, `getSnapshot` e `getServerSnapshot`.
- Remover a dependência circular `[session]` e a atribuição condicional dentro de `useEffect`.

### 4. `[MODIFY] src/routes/index.tsx`
- Declarar constante de módulo `const EMPTY_DATES: string[] = [];`.
- Substituir fallback dinâmico `data: availableDates = []` pela constante estável.

### 5. `[MODIFY] src/routes/conciliacao.index.tsx`
- Declarar constantes de módulo estáveis `const EMPTY_DATES: string[] = [];` e `const EMPTY_STORES: any[] = [];`.
- Substituir fallbacks instáveis no destructuring de queries.

---

## Risco e Mitigação

- **Risco:** Hidratação SSR/SSG retornar estado inconsistente se `getServerSnapshot` for diferente de `getSnapshot`.
- **Mitigação:** `getServerSnapshot` retorna `undefined`, espelhando o estado inicial padrão de cliente enquanto a verificação de sessão assíncrona do Supabase ocorre. O `AppShell` já possui tratamento nativo para renderizar o spinner de carregamento quando a sessão é `undefined`.

---

## Verificação e Critérios de Aceite

### Cenário 1 — Terminal Cleanliness e Ausência de Ruído de Sourcemaps
- Executar `node scripts/dev-server-logger.mjs`.
- O servidor sobe na porta 8080.
- O terminal não exibe nenhuma linha de erro vermelho `Failed to load source map for ... @tanstack`.
- O contador `errorCount` em `logs/session-summary.json` permanece em 0.

### Cenário 2 — Autenticação Fluida e Zero Loop de Render (React Depth Check)
- Acessar `http://localhost:8080/` e `http://localhost:8080/conciliacao`.
- Não ocorre erro `Maximum update depth exceeded`.
- O `AppShell` autentica normalmente sem redirecionamentos incorretos para `/login`.
- A compilação e o build (`npm run build`) passam com 100% de sucesso.
