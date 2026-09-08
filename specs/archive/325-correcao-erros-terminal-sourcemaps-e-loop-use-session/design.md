# Design: Eliminação de Erros de Terminal (Sourcemaps Ausentes e Loop Infinito em useSession) (325)

## Arquitetura e Fluxo de Dados

```
[Vite Dev Server Ingestion & Startup]
  │
  ├── Leitura de dependências em node_modules/@tanstack
  ├── Detecção de //# sourceMappingURL=*.js.map (sem arquivo físico no disco)
  │
  ▼
[Camada 1: Interceptação e Filtragem no Vite Logger (vite.config.ts)]
  │
  ├── customLogger intercepta warns de build/transpilação
  ├── Verificação: se mensagem contém "Failed to load source map" && "@tanstack"
  └── Ação: Silencia o aviso no nível da engine do Vite (evita emissão para stderr)
  │
  ▼
[Camada 2: Interceptação no Processo de Auditoria (scripts/dev-server-logger.mjs)]
  │
  ├── Intercepta chunks de stderr/stdout do processo filho
  ├── Filtro defensivo: se linha for ruído de sourcemap de node_modules
  ├── Classificação: Direciona para log em nível DEBUG em disco
  └── Ação: Não envia para process.stderr do terminal e não incrementa sessionStats.errorCount
  │
  ▼
[Terminal do Desenvolvedor: Limpo e Focado]
  └── Apenas mensagens de inicialização e erros reais de compilação são visíveis.
```

```
[Fluxo Reativo do React 19: useSession via useSyncExternalStore]

  Supabase Auth Client (lib/supabase.ts)
           │
           ├── supabase.auth.getSession() (assíncrono inicial)
           └── supabase.auth.onAuthStateChange() (eventos de login, token refresh, logout)
           │
           ▼ (Atualiza variável de módulo e notifica ouvintes)
  Store Global em Memória (src/hooks/useAuth.ts)
    let globalSession: Session | null | undefined
    const listeners = Set<() => void>()
           │
           ▼ (Subscrição nativa do React sem useEffect circular)
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
           │
           ├── getSnapshot(): Retorna referência imutável atual de globalSession
           ├── getServerSnapshot(): Retorna undefined (consistente com SSR loading)
           └── subscribe(): Registra callback invocado apenas em mutações reais
           │
           ▼ (Renderização Estável)
  AppShell & useUserPermissions
    ├── Se session === undefined: Exibe Spinner central de verificação
    ├── Se session === null: Redireciona para /login
    └── Se session !== null: Monta TopBar, Sidebar e páginas sem re-render loops
```

---

## Interfaces e Implementações Técnicas

### 1. Refatoração Canônica do `useSession` (`src/hooks/useAuth.ts`)

```typescript
import { useSyncExternalStore, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ─── Session Store ───────────────────────────────────────────────────────────

let globalSession: Session | null | undefined = undefined;
let isInitializing = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((callback) => callback());
}

function subscribe(callback: () => void) {
  listeners.add(callback);

  if (globalSession === undefined && !isInitializing) {
    isInitializing = true;
    
    supabase.auth.getSession().then(({ data }) => {
      globalSession = data.session;
      notify();
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      globalSession = session;
      notify();
    });
  }

  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): Session | null | undefined {
  return globalSession;
}

function getServerSnapshot(): Session | null | undefined {
  return undefined;
}

export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

### 2. Configuração de Logger Customizado no Vite (`vite.config.ts`)

```typescript
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createLogger } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom logger para suprimir avisos de sourcemaps ausentes em dependências externas
const customLogger = createLogger();
const originalWarn = customLogger.warn;
customLogger.warn = (msg, options) => {
  if (
    msg.includes("Failed to load source map") &&
    (msg.includes("@tanstack") || msg.includes("node_modules"))
  ) {
    return;
  }
  originalWarn(msg, options);
};

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    customLogger,
    server: {
      port: 8080,
      host: "localhost",
    },
    resolve: {
      alias: [
        {
          find: /^framer-motion$/,
          replacement: path.resolve(__dirname, "src/lib/framer-motion.tsx"),
        },
      ],
    },
  },
});
```

### 3. Blindagem de Auditoria em `scripts/dev-server-logger.mjs`

```javascript
// Filtro defensivo na classificação de linhas
const isBenignSourcemap =
  line.includes("Failed to load source map") &&
  (line.includes("@tanstack") || line.includes("node_modules"));

if (isBenignSourcemap) {
  sessionStats.warningCount++;
  writeAuditEntry("DEBUG", isStderr ? "stderr" : "stdout", line);
  // Não polui errorLogStream nem dispara erro crítico
  return;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `vite.config.ts`
- Adicionar import de `createLogger` da biblioteca `vite`.
- Instanciar logger com interceptador condicional em `customLogger.warn`.
- Passar `customLogger` dentro do bloco de configuração `vite: { customLogger, ... }`.

### 2. `scripts/dev-server-logger.mjs`
- Adicionar checagem no listener `child.stderr.on("data", ...)` para evitar repassar chunks de sourcemaps para o `process.stderr` do terminal interativo.
- No método `logToFiles`, identificar padrões benignos de sourcemap de bibliotecas em `node_modules` e gravá-los exclusivamente no arquivo de auditoria como `DEBUG`, desconsiderando-os do cômputo de `sessionStats.errorCount`.

### 3. `src/hooks/useAuth.ts`
- Substituir a importação de `useEffect` por `useSyncExternalStore` do pacote `'react'`.
- Eliminar o estado local `const [session, setSession] = useState(...)` e a dependência `[session]` do `useEffect`.
- Declarar as funções puras de subscrição e snapshot da store.

### 4. `src/routes/index.tsx`
- Declarar no topo do arquivo: `const EMPTY_DATES: string[] = [];`.
- Atualizar a chamada do hook: `const { data: availableDates = EMPTY_DATES, isLoading: loadingDates } = useAvailableConciliacaoDates();`.

### 5. `src/routes/conciliacao.index.tsx`
- Declarar no topo do arquivo:
  ```typescript
  const EMPTY_DATES: string[] = [];
  const EMPTY_STORES: any[] = [];
  ```
- Atualizar as atribuições padrão:
  ```typescript
  const { data: availableDates = EMPTY_DATES, isLoading: loadingDates } = useAvailableConciliacaoDates();
  const { data: stores = EMPTY_STORES, isLoading: loadingStores } = useStores();
  ```

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Silenciamento Total de Ruídos de Sourcemap no Dev Server
- **SCAN:** O desenvolvedor inicia o servidor de desenvolvimento via `node scripts/dev-server-logger.mjs` na porta 8080.
- **INFER:** O Vite carrega e analisa todos os módulos compilados em `node_modules/@tanstack/react-router` e `@tanstack/router-core`.
- **VERIFY:**
  1. O terminal exibe apenas o banner de inicialização e a confirmação de que o servidor está pronto em `http://localhost:8080`.
  2. Nenhuma mensagem vermelha contendo `Failed to load source map` ou `ENOENT` é impressa no terminal.
  3. O arquivo `logs/error.log` permanece limpo (tamanho 0 ou sem novas entradas de sourcemaps).
  4. O arquivo `logs/session-summary.json` registra `errorCount: 0`.
- **FIX:** Comunicação limpa e legibilidade restaurada para o desenvolvedor.

### Cenário 2: Validação do Ciclo de Vida do React e Eliminação de Recursão no `useSession`
- **SCAN:** O navegador acessa a página inicial `http://localhost:8080/` e a página de conciliação `http://localhost:8080/conciliacao`.
- **INFER:** O `AppShell` é montado, consome `useSession()`, aguarda a resposta do Supabase Auth e renderiza o conteúdo autenticado.
- **VERIFY:**
  1. O console de desenvolvimento do navegador e o stdout do Vite registram zero ocorrências de `Maximum update depth exceeded`.
  2. A tela exibe o estado de loading de forma suave e transiciona para a dashboard sem travamento de thread.
  3. A navegação entre rotas (`/` -> `/conciliacao` -> `/importacoes`) ocorre sem recriação contínua de subscrições ou perda de sessão.
  4. O comando `npm run build` conclui com sucesso com código de saída 0.
- **FIX:** Estabilidade absoluta na autenticação e no ciclo de vida de renderização da aplicação.
