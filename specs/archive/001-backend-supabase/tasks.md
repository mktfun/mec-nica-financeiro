# 001 · Tasks — Backend Supabase

## Fase 1 — Auth Básico 🔐

### 1.1 Infraestrutura
- [ ] Instalar `@supabase/supabase-js` (`npm install @supabase/supabase-js`)
- [ ] Criar `src/lib/supabase.ts` com cliente singleton usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- [ ] Adicionar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` ao `.env.local`
- [ ] Adicionar `.env.local` ao `.gitignore` (verificar se já está)

### 1.2 Banco — Migration Fase 1
- [ ] Executar migration: criar tabela `public.profiles`
- [ ] Executar migration: criar trigger `handle_new_user`
- [ ] Criar usuário inicial (Ana) via Supabase Dashboard > Auth > Users
- [ ] Aplicar RLS na tabela `profiles`

### 1.3 Hook `useAuth`
- [ ] Criar `src/hooks/useAuth.ts` com:
  - `useSession()` — retorna session atual (null se nÁo logado)
  - `useLogin(email, password)` — chama `supabase.auth.signInWithPassword`
  - `useLogout()` — chama `supabase.auth.signOut`
  - Listener de mudança de sessÁo via `onAuthStateChange`

### 1.4 Tela de Login
- [ ] Criar `src/routes/login.tsx` com:
  - Layout full-screen, sem AppShell
  - Logo "Mecânica Popular" + título
  - Campos e-mail e senha
  - BotÁo "Entrar"
  - Mensagem de erro em caso de credenciais inválidas
  - Visual premium consistente com o design system existente

### 1.5 ProteçÁo de Rotas
- [ ] Modificar `src/routes/__root.tsx` para injetar `session` no context
- [ ] Adicionar `beforeLoad` guard em TODAS as rotas protegidas:
  - `/` (index)
  - `/conciliacao`
  - `/conciliacao-detalhes`
  - `/lojas`
  - `/patio`
  - `/recebiveis`
  - `/alertas`
  - `/historico`
  - `/configuracoes`
- [ ] A rota `/proposta` e `/login` ficam públicas
- [ ] Adicionar botÁo "Sair" no Sidebar/Header com `useLogout`

### 1.6 VerificaçÁo Fase 1
- [ ] Acessar `/` sem sessÁo → redireciona para `/login`
- [ ] Login com credenciais erradas → mostra erro
- [ ] Login com credenciais corretas → vai para `/`
- [ ] Refresh da página → sessÁo persiste
- [ ] Logout → redireciona para `/login`

---

## Fase 2 — Lojas do Banco 🏪

### 2.1 Migration
- [ ] Executar migration: criar tabela `public.stores`
- [ ] Aplicar RLS em `stores`
- [ ] Executar seed com as 10 lojas (dados do `src/mock/data.ts`)

### 2.2 Hook `useStores`
- [ ] Criar `src/hooks/useStores.ts`:
  - `useStores()` — `useQuery` que busca todas as lojas ativas
  - `useStore(id)` — `useQuery` para uma loja específica
  - `useUpdateStore(id)` — `useMutation` para editar nome/gerente/etc

### 2.3 IntegraçÁo nas Rotas
- [ ] `routes/lojas.tsx` — substituir `mockStores` por `useStores()`
- [ ] `routes/conciliacao.tsx` — substituir `mockStores` por `useStores()`
- [ ] `routes/patio.tsx` — substituir lista de lojas por `useStores()`
- [ ] `routes/recebiveis.tsx` — substituir lista de lojas por `useStores()`
- [ ] Adicionar loading skeleton em todas as telas que usam `useStores()`

### 2.4 Configurações — EdiçÁo de Lojas
- [ ] `routes/configuracoes.tsx` — adicionar seçÁo "Gerenciar Lojas"
  - Lista todas as lojas com botÁo "Editar"
  - Modal de ediçÁo: nome, endereço, telefone, gerente, mecânicos
  - Salva via `useUpdateStore`

### 2.5 VerificaçÁo Fase 2
- [ ] Lojas carregam do banco (nÁo do mock)
- [ ] EdiçÁo de loja salva no Supabase e reflete na UI (TanStack Query revalida)
- [ ] Loading state visível enquanto carrega

---

## Fase 3 — ConciliaçÁo, Alertas e Transações 📊

### 3.1 Migrations
- [ ] Executar migration: criar tabela `public.reconciliations`
- [ ] Executar migration: criar tabela `public.alerts`
- [ ] Executar migration: criar tabela `public.transactions`
- [ ] Aplicar RLS nas 3 tabelas

### 3.2 Seed de Dados Históricos
- [ ] Inserir alertas mock atuais como seed inicial
- [ ] Inserir reconciliações mock do dia atual como seed inicial
- [ ] Inserir transações mock como seed inicial

### 3.3 Hooks
- [ ] Criar `src/hooks/useAlerts.ts`:
  - `useAlerts(date?)` — retorna alertas do dia (ou data específica)
  - `useResolveAlert(id)` — mutation para resolver alerta
- [ ] Criar `src/hooks/useConciliacao.ts`:
  - `useConciliacaoResumo(date?)` — dados consolidados do dia
  - `useConciliacaoDetalhes(date?)` — dados por loja
  - `useSaveDailyCash(storeId, value)` — mutation para dinheiro em caixa
- [ ] Criar `src/hooks/useTransactions.ts`:
  - `useTransactions(limit?)` — transações recentes
  - `useTransactionsByStore(storeId)` — filtradas por loja

### 3.4 IntegraçÁo nas Rotas
- [ ] `routes/conciliacao.tsx` — substituir mocks por hooks reais
- [ ] `routes/conciliacao-detalhes.tsx` — substituir mocks por hooks reais
- [ ] `routes/alertas.tsx` — substituir mocks por hooks reais
- [ ] `components/dashboard/RecentActivity.tsx` — substituir mocks por `useTransactions`
- [ ] `components/dashboard/MotorStatus.tsx` — substituir mocks por dados reais de `useConciliacao`

### 3.5 VerificaçÁo Fase 3
- [ ] Alertas carregam do banco
- [ ] Resolver alerta atualiza o banco e reflete na UI
- [ ] "Dinheiro em Caixa" salva no banco via mutation
- [ ] Dashboard mostra dados reais

---

## Fase 4 — Pátio, Recebíveis, Histórico e Bot Logs 🚗

### 4.1 Migrations
- [ ] Executar migration: criar tabela `public.patio_os`
- [ ] Executar migration: criar tabela `public.receivables`
- [ ] Executar migration: criar tabela `public.bot_runs`
- [ ] Aplicar RLS nas 3 tabelas

### 4.2 Seeds
- [ ] Inserir 23 OS mock no pátio como seed
- [ ] Inserir 12 recebíveis mock como seed

### 4.3 Hooks
- [ ] Criar `src/hooks/usePatio.ts`:
  - `usePatioOS(filters?)` — retorna OS com filtros de status/loja
  - `useUpdatePatioOS(id)` — atualiza status/pagamento
- [ ] Criar `src/hooks/useRecebiveis.ts`:
  - `useRecebiveis(filters?)` — retorna recebíveis com filtros
  - `useMarkReceived(id)` — mutation para marcar como recebido
- [ ] Criar `src/hooks/useBotRuns.ts`:
  - `useLatestBotRun()` — último run do bot (para MotorStatus)
  - `useBotRunHistory()` — histórico de execuções

### 4.4 IntegraçÁo nas Rotas
- [ ] `routes/patio.tsx` — substituir mocks por `usePatioOS()`
- [ ] `routes/recebiveis.tsx` — substituir mocks por `useRecebiveis()`
- [ ] `routes/historico.tsx` — buscar histórico real de conciliações
- [ ] `routes/configuracoes.tsx` — adicionar seçÁo "Logs do Bot" com `useBotRunHistory()`

### 4.5 VerificaçÁo Fase 4
- [ ] Pátio mostra OS do banco com filtros funcionando
- [ ] Recebíveis mostra dados do banco
- [ ] Histórico mostra conciliações passadas
- [ ] Logs do Bot visíveis em Configurações

---

## Fase Extra — Anon Key e Variáveis de Ambiente

- [ ] Buscar a `anon key` no Dashboard Supabase > Settings > API
- [ ] Atualizar `VITE_SUPABASE_ANON_KEY` em `.env.local`
- [ ] Configurar variáveis no servidor de deploy (Cloudflare Workers ou equivalente)
- [ ] Verificar se `SUPABASE_SERVICE_ROLE_KEY` só é usada no bot (nunca exposta no frontend)

---

## Ordem de ExecuçÁo Recomendada

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Extra
```

> Cada fase é entregável de forma independente. A Fase 1 é bloqueante para todas as outras.
