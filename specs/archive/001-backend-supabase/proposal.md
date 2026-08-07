# 001 · Backend Supabase — Mecânica Popular

## VisÁo Geral

O sistema atualmente roda 100% com dados **mock** (`src/mock/data.ts`).
O objetivo deste spec é substituir progressivamente o mock por um **backend real no Supabase** (`cnwzsvowkfymtdiryhqc`), implementando autenticaçÁo, persistência, RLS e hooks de dados — em fases priorizadas por impacto e risco.

---

## Contexto Atual do Projeto

### O que JÁ EXISTE e será reutilizado

| Item | LocalizaçÁo | Status |
|---|---|---|
| TanStack Router | `src/router.tsx` | ✅ Operacional |
| TanStack Query (`QueryClient`) | `src/routes/__root.tsx` | ✅ Configurado no Root |
| Card, Badge, Button, Modal | `src/components/ui/` | ✅ Design System completo |
| AppShell (Sidebar + Header) | `src/components/layout/` | ✅ Operacional |
| Todas as 11 rotas | `src/routes/` | ✅ UI pronta com mock |
| ThemeToggle (dark/light) | `src/components/ui/ThemeToggle.tsx` | ✅ Funcionando |
| `useIsMobile` hook | `src/hooks/use-mobile.tsx` | ✅ Disponível |
| Mock como shape dos dados | `src/mock/data.ts` | 🔄 Será substituído por tipos Supabase |

### O que NÁO EXISTE e precisa ser criado

- `@supabase/supabase-js` como dependência
- `src/lib/supabase.ts` — cliente Supabase singleton
- Auth flow (login page, sessÁo, proteçÁo de rotas)
- Tabelas no Supabase (schema completo)
- Hooks de dados (`useStores`, `useAlerts`, `useConciliacao`, etc.)
- RLS Policies (segurança por usuário)
- Edge Functions (bot de conciliaçÁo — fora do escopo deste spec)

---

## User Stories por Fase

### Fase 1 — Auth Básico (Prioridade Máxima)
> Sem auth, qualquer pessoa com a URL vê os dados financeiros.

- **US-01:** Como Ana (gestora), quero fazer login com e-mail e senha para acessar o painel.
- **US-02:** Como sistema, quero bloquear todas as rotas protegidas para usuários nÁo autenticados, redirecionando para `/login`.
- **US-03:** Como Ana, quero que minha sessÁo persista entre abas e refreshes sem precisar logar de novo.
- **US-04:** Como Ana, quero poder sair do sistema com logout.

### Fase 2 — Dados Reais: Lojas e Configurações
> Base estrutural: quem sÁo as lojas, gerentes e mecânicos.

- **US-05:** Como sistema, quero buscar as 10 lojas do banco, nÁo do mock.
- **US-06:** Como Ana, quero editar nome, gerente, mecânicos, telefone e endereço de uma loja pela tela de Configurações.
- **US-07:** Como sistema, quero que a lista de lojas seja consistente em todas as telas (ConciliaçÁo, Lojas, Pátio, etc.)

### Fase 3 — ConciliaçÁo e Alertas Reais
> Dados que o bot vai escrever depois; por ora Ana pode inserir manualmente.

- **US-08:** Como sistema, quero salvar o resultado de cada ciclo de conciliaçÁo no banco.
- **US-09:** Como Ana, quero ver os alertas do dia buscados do banco, nÁo estáticos.
- **US-10:** Como Ana, quero inserir o "Dinheiro em Caixa" da tela de ConciliaçÁo e salvar no banco.

### Fase 4 — Pátio, Recebíveis e Histórico
> Dados secundários, mas com alto valor para o dia-a-dia.

- **US-11:** Como sistema, quero salvar e buscar as OS abertas no pátio do banco.
- **US-12:** Como sistema, quero salvar e buscar os recebíveis (cartÁo/pix/boleto) do banco.
- **US-13:** Como Ana, quero ver o histórico de conciliações dos últimos 30 dias.

---

## O que precisa ser CRIADO

### Dependências

```
npm install @supabase/supabase-js @supabase/auth-helpers-react
```

### Arquivos novos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/supabase.ts` | Cliente singleton do Supabase |
| `src/routes/login.tsx` | Tela de login (e-mail + senha) |
| `src/hooks/useAuth.ts` | SessÁo, login, logout, proteçÁo |
| `src/hooks/useStores.ts` | Query lojas do Supabase |
| `src/hooks/useAlerts.ts` | Query alertas do Supabase |
| `src/hooks/useConciliacao.ts` | Query e mutate conciliaçÁo |
| `src/hooks/usePatio.ts` | Query OS do pátio |
| `src/hooks/useRecebiveis.ts` | Query recebíveis |
| `src/hooks/useTransactions.ts` | Query transações |

---

## Critérios de Aceite Gerais

- [ ] Nenhuma rota (exceto `/login` e `/proposta`) é acessível sem sessÁo válida.
- [ ] O cliente Supabase usa variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- [ ] As chamadas ao Supabase sÁo protegidas por RLS — cada usuário vê apenas os dados do projeto dele.
- [ ] O mock em `src/mock/data.ts` é mantido apenas como fallback de desenvolvimento, nÁo em produçÁo.
- [ ] Todos os hooks usam TanStack Query (`useQuery` / `useMutation`) para cache e revalidaçÁo.
- [ ] Loading states e error states sÁo tratados em todas as telas.
