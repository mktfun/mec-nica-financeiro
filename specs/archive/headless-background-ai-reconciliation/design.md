# Design: Conciliação Headless em Background & Central de Telemetria/Logs da IA (headless-background-ai-reconciliation)

## Arquitetura de Background & Telemetria

```
[Importação de Dados / Carregamento da Conciliação]
      |
      v (Execução Silenciosa 100% Background - Sem UI)
[llm-matcher.ts] ---> Envia requisição para Gemini/OpenAI/Claude
      |
      +---> Grava automaticamente matches com Confiança >= 90% em `conciliation_matches`
      |
      +---> Grava Telemetria Completa na tabela `ai_execution_logs`
            (Payload JSON, Resposta JSON, Tokens Prompt/Completion, Custo Estimado, Raciocínio)
      |
      v
[Tela de Configurações (/configuracoes)]
      |
      +---> Aba "Logs & Telemetria de IA" (Visualização Inspector)
            - Cards de Métricas: Total Tokens, Custo Acumulado, Total Chamadas
            - Tabela de Chamadas com Viewer de JSON Bruto (Entrada / Saída) e Raciocínio da IA
```

## Tabela Supabase `ai_execution_logs`

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
  raw_payload_json jsonb,
  raw_response_json jsonb,
  matches_count integer default 0,
  execution_time_ms integer default 0
);
```

## Dashboard de Telemetria (`src/routes/configuracoes.tsx`)

- **Cards de Topo:**
  - `Tokens Totais` (Prompt + Completion)
  - `Custo Estimado` ($ / R$)
  - `Chamadas Efetuadas`
  - `Matches Aplicados`
- **Tabela de Inspector:**
  - Colunas: `Data/Hora`, `Provedor/Modelo`, `Matches`, `Tokens`, `Custo`, `Ações`.
  - Expansão de Linha: Exibe o JSON de Entrada, o JSON de Saída da LLM e o raciocínio explicativo passo-a-passo de cada associação realizada.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Remoção da UI de IA):**
  - *Ação:* Navegar na tela de conciliação diária da loja.
  - *Resultado Esperado:* Zero botões ou modais contendo "IA" são exibidos. A interface permanece 100% limpa e tradicional.
- **Cenário 2 (Conciliação em Background):**
  - *Ação:* Importar dados ou visualizar a conciliação com chave de IA configurada.
  - *Resultado Esperado:* A IA processa em segundo plano e insere os matches de alta confiança sem interromper o usuário.
- **Cenário 3 (Inspeção de Logs em `/configuracoes`):**
  - *Ação:* Acessar a tela de Configurações e abrir a aba "Logs & Telemetria de IA".
  - *Resultado Esperado:* Todas as requisições estão registradas com contagem de tokens, custo em dólares, payloads JSON completos de entrada/saída e raciocínio rastreável.
