# Design: Auditor de Conciliação Silenciosa em Background & Central de Telemetria (background-ai-telemetry-engine)

## Arquitetura de Telemetria e Execução Headless

```
[Importação de Dados / Carregamento de Conciliação]
                         |
                         v (Execução Silenciosa 100% Background)
               [src/lib/llm-matcher.ts]
                         |
         +---------------+---------------+
         |                               |
         v                               v
[Supabase: conciliation_matches]   [Supabase: ai_execution_logs]
(Aplica matches >= 90%         (Salva Tokens, Custo, ExecutionTimeMs,
 automaticamente)               Payload JSON, Response JSON, Reasoning)
                                         |
                                         v
                         [Painel em /configuracoes]
                         - Tokens Totais (Prompt + Completion)
                         - Custo Estimado Acumulado ($)
                         - Inspector de Payload JSON (Entrada & Saída)
                         - Raciocínio Passo-a-Passo da IA
```

## Esquema SQL da Tabela `ai_execution_logs`

```sql
create table if not exists public.ai_execution_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  store_id uuid references public.stores(id) on delete cascade,
  provider text not null,
  model text not null,
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  total_tokens integer default 0,
  estimated_cost numeric(10, 6) default 0,
  execution_time_ms integer default 0,
  raw_payload_json jsonb,
  raw_response_json jsonb,
  reasoning_steps_json jsonb,
  matches_applied_count integer default 0
);

-- RLS Policies
alter table public.ai_execution_logs enable row level security;
create policy "Allow all read for ai_execution_logs" on public.ai_execution_logs for select using (true);
create policy "Allow all insert for ai_execution_logs" on public.ai_execution_logs for insert with check (true);
```

## Painel de Telemetria em `src/routes/configuracoes.tsx`

- **4 Cards de KPIs de IA:**
  1. `Tokens de Entrada (Prompt)` (ex: 45.210 tokens)
  2. `Tokens de Saída (Completion)` (ex: 8.450 tokens)
  3. `Custo Estimado Acumulado` (ex: $0.0384 USD / R$ 0,21 BRL)
  4. `Chamadas Auditadas` (ex: 14 chamadas em background)

- **Inspector de Logs & JSON (DevTools UI):**
  - Tabela com colunas `Data/Hora`, `Loja`, `Provedor/Modelo`, `Matches Aplicados`, `Tokens`, `Custo`, `Tempo (ms)`, `Ações (Inspecionar)`.
  - Ao expandir uma linha, exibe 3 abas de inspeção:
    - **`[Entrada JSON]`**: Payload JSON completo enviado para a LLM.
    - **`[Saída JSON]`**: Resposta bruta retornada pela LLM.
    - **`[Raciocínio IA]`**: Passo-a-passo textual e justificativas registradas pela IA.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Interface de Conciliação Limpa):**
  - *Ação:* Navegar em `/conciliacao` e `/conciliacao/$lojaId`.
  - *Resultado Esperado:* Nenhum botão, modal ou elemento com o rótulo "IA" é exibido. A tela é 100% tradicional e rápida.
- **Cenário 2 (Execução Silenciosa & Inserção de Log):**
  - *Ação:* Executar uma conciliação com chave de IA configurada.
  - *Resultado Esperado:* A IA processa em background, aplica os matches >= 90% em `conciliation_matches` e grava o registro na tabela `ai_execution_logs`.
- **Cenário 3 (Inspeção de Telemetria e JSON em `/configuracoes`):**
  - *Ação:* Abrir a aba "Telemetria & Logs da IA" na página de Configurações.
  - *Resultado Esperado:* Exibe o dashboard de tokens, custos acumulados e o inspector interativo com os arquivos JSON de entrada e saída.
