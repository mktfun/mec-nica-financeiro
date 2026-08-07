# 001 · Design — Backend Supabase

## Stack

| Camada | Tecnologia |
|---|---|
| Auth | Supabase Auth (email + senha) |
| Banco | PostgreSQL via Supabase (`cnwzsvowkfymtdiryhqc`) |
| Cliente JS | `@supabase/supabase-js` v2 |
| Fetch/Cache | TanStack Query v5 (já instalado) |
| Roteamento com Auth | TanStack Router (já instalado) — `beforeLoad` guard |

---

## Modelo de Banco de Dados

### Fase 1 — Auth (tabelas gerenciadas pelo Supabase Auth)

O Supabase cria automaticamente `auth.users`. Vamos criar apenas:

```sql
-- Perfis de usuário (extensão do auth.users)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'viewer', -- 'admin' | 'viewer'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para criar profile ao criar user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Fase 2 — Lojas

```sql
CREATE TABLE public.stores (
  id            TEXT PRIMARY KEY, -- ex: 'st-01'
  name          TEXT NOT NULL,
  address       TEXT,
  phone         TEXT,
  manager       TEXT,
  mechanics     TEXT[] DEFAULT '{}',
  avatar_url    TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed das 10 lojas (a ser executado via migration)
```

### Fase 3 — Conciliação

```sql
CREATE TABLE public.reconciliations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        TEXT REFERENCES public.stores(id),
  date            DATE NOT NULL,
  
  -- Dados financeiros do dia
  os_total        NUMERIC(12,2) DEFAULT 0,     -- Total das OS abertas no Oficina Inteligente
  financial_total NUMERIC(12,2) DEFAULT 0,     -- Total registrado no financeiro
  divergence      NUMERIC(12,2) DEFAULT 0,     -- os_total - financial_total
  daily_cash      NUMERIC(12,2) DEFAULT 0,     -- Dinheiro em caixa (manual, informado pela Ana)
  os_count        INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'approved' | 'divergence' | 'pending'
  top_error       TEXT,
  
  -- Metadados do bot
  bot_run_id      UUID,                         -- Referência ao log do bot
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (store_id, date)
);

CREATE INDEX reconciliations_date_idx ON public.reconciliations (date DESC);
CREATE INDEX reconciliations_store_idx ON public.reconciliations (store_id);
```

### Fase 3 — Alertas

```sql
CREATE TABLE public.alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    TEXT REFERENCES public.stores(id),
  store_name  TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  severity    TEXT NOT NULL, -- 'critical' | 'warning' | 'info'
  amount      NUMERIC(12,2),
  
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  time        TEXT,              -- '07:34' — para compatibilidade com UI
  os_number   TEXT,
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX alerts_date_idx ON public.alerts (date DESC, severity);
```

### Fase 3 — Transações

```sql
CREATE TABLE public.transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       TEXT REFERENCES public.stores(id),
  store_name     TEXT,
  
  title          TEXT NOT NULL,
  subtitle       TEXT,
  amount         NUMERIC(12,2) NOT NULL,
  type           TEXT NOT NULL, -- 'in' | 'out'
  icon_type      TEXT,          -- 'card' | 'bank' | 'cash' | 'alert'
  payment_method TEXT,
  os_number      TEXT,
  
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX transactions_store_date_idx ON public.transactions (store_id, occurred_at DESC);
CREATE INDEX transactions_date_idx ON public.transactions (occurred_at DESC);
```

### Fase 4 — Pátio

```sql
CREATE TABLE public.patio_os (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_number      TEXT NOT NULL,
  store_id       TEXT REFERENCES public.stores(id),
  store_name     TEXT,
  
  plate          TEXT NOT NULL,
  total_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_value     NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  status         TEXT NOT NULL DEFAULT 'em_aberto', -- 'em_aberto' | 'pago_parcial' | 'finalizado'
  days_open      INTEGER DEFAULT 0,
  
  opened_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX patio_store_idx ON public.patio_os (store_id, status);
```

### Fase 4 — Recebíveis

```sql
CREATE TABLE public.receivables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    TEXT REFERENCES public.stores(id),
  store_name  TEXT,
  
  type        TEXT NOT NULL, -- 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Boleto'
  value       NUMERIC(12,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'recebido' | 'vencido'
  
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date    DATE NOT NULL,
  received_at TIMESTAMPTZ,
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX receivables_status_idx ON public.receivables (status, due_date);
```

### Fase 4 — Logs do Bot (Auditoria)

```sql
CREATE TABLE public.bot_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'error'
  stores_processed INTEGER DEFAULT 0,
  errors          JSONB DEFAULT '[]',
  screenshot_urls TEXT[] DEFAULT '{}',
  log_text        TEXT,
  triggered_by    TEXT DEFAULT 'scheduler' -- 'scheduler' | 'manual'
);
```

---

## RLS Policies

```sql
-- Profiles: usuário vê apenas o próprio perfil
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Stores: qualquer usuário autenticado lê
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores_authenticated_read" ON public.stores
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stores_admin_write" ON public.stores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Reconciliations: qualquer autenticado lê, apenas bot/admin escreve
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reconciliations_authenticated_read" ON public.reconciliations
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "reconciliations_service_write" ON public.reconciliations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "reconciliations_service_update" ON public.reconciliations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Alerts, Transactions, Patio, Receivables: mesmo padrão
-- (autenticados leem, service role escreve via bot)
```

---

## Arquitetura do Cliente (Frontend)

```
src/
├── lib/
│   └── supabase.ts          ← singleton + tipos
├── hooks/
│   ├── useAuth.ts           ← useSession, useLogin, useLogout
│   ├── useStores.ts         ← useQuery stores
│   ├── useAlerts.ts         ← useQuery alerts (filtro por data)
│   ├── useConciliacao.ts    ← useQuery reconciliations + useMutation
│   ├── usePatio.ts          ← useQuery patio_os
│   ├── useRecebiveis.ts     ← useQuery receivables
│   └── useTransactions.ts   ← useQuery transactions
├── routes/
│   └── login.tsx            ← Tela de login
```

### Proteção de Rotas — TanStack Router

```ts
// Em cada rota protegida, no beforeLoad:
export const Route = createFileRoute('/')(({
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: '/login' })
  },
  component: DashboardPage,
}))
```

O `context.session` será injetado no `rootRoute` via `createRootRouteWithContext`.

---

## Mapa de Dependências

```
Fase 1 (Auth)
  └── supabase.ts
      └── routes/login.tsx
          └── hooks/useAuth.ts
              └── __root.tsx (context.session)
                  └── TODAS as rotas (beforeLoad guard)

Fase 2 (Lojas)
  └── Migration: CREATE TABLE stores + seed
      └── hooks/useStores.ts
          └── routes/lojas.tsx
          └── routes/conciliacao.tsx
          └── routes/patio.tsx
          └── routes/recebiveis.tsx

Fase 3 (Conciliação + Alertas)
  └── Migration: reconciliations + alerts + transactions
      └── hooks/useConciliacao.ts → routes/conciliacao.tsx
      └── hooks/useAlerts.ts → routes/alertas.tsx
      └── hooks/useTransactions.ts → components/dashboard/RecentActivity.tsx

Fase 4 (Pátio + Recebíveis + Histórico)
  └── Migration: patio_os + receivables + bot_runs
      └── hooks/usePatio.ts → routes/patio.tsx
      └── hooks/useRecebiveis.ts → routes/recebiveis.tsx
      └── routes/historico.tsx (usa reconciliations)
```
