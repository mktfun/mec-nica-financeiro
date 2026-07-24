# Proposal: Auditor de Conciliação Silenciosa em Background & Central de Telemetria (background-ai-telemetry-engine)

## Problema

- O usuário não deseja nenhuma intervenção manual (sem botões, modais ou selos visíveis de "IA" na tela de conciliação diária). A conciliação deve ocorrer de forma **100% silenciosa em segundo plano (Headless Background)**.
- Ao mesmo tempo, o usuário exige **auditabilidade total e telemetria profunda** na página de Configurações (`/configuracoes`), com base nas lições da arquitetura de referência (Hermes Agent / BMF IA OS):
  1. Registro de logs imutáveis de cada chamada (payload JSON de entrada, resposta JSON de saída).
  2. Rastreamento detalhado de tokens (prompt, completion, total) por chamada e custo financeiro estimado ($ / R$) no período.
  3. Registro do raciocínio passo-a-passo (Chain of Thought) da IA em cada associação realizada.
  4. Homologação com nota de confiança mínima (>= 90%) para aplicação automática silenciosa em banco.

## Solução Proposta

1. **Remoção de 100% dos Elementos Visuais de IA na Tela de Conciliação:**
   - Exclusão do botão "✨ Conciliar com IA" e do modal de aprovação em `src/routes/conciliacao.$lojaId.tsx`.
   - Exclusão do arquivo `src/components/conciliacao/AiConciliationAssistant.tsx`.
   - A tela de conciliação diária permanece 100% limpa, rápida e tradicional.

2. **Criação da Tabela de Auditoria e Telemetria `ai_execution_logs` no Supabase:**
   - Tabela imutável para guardar todo o rastro de execução da IA:
     `id`, `created_at`, `store_id`, `provider`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost`, `execution_time_ms`, `raw_payload_json`, `raw_response_json`, `reasoning_steps_json`, `matches_applied_count`.

3. **Execução Headless Silenciosa (`src/lib/llm-matcher.ts`):**
   - A IA roda em segundo plano sem interromper o usuário.
   - Vínculos com nota de confiança >= 90% são gravados automaticamente na tabela `conciliation_matches`.
   - Toda chamada é auditada e salva na tabela `ai_execution_logs`.

4. **Painel de Telemetria e Inspector de JSON na Tela de Configurações (`/configuracoes`):**
   - Nova seção dedicada **"📊 Central de Telemetria e Logs da IA"** na página `/configuracoes`.
   - **Cards de Métricas:** Tokens Totais (Prompt + Completion), Custo Estimado ($), Total de Chamadas e Taxa de Conversão de Matches.
   - **Inspector de Logs & JSON (Estilo DevTools):** Tabela de histórico com filtro por data, onde o usuário pode expandir cada chamada e visualizar:
     - Payload JSON enviado (Input)
     - Resposta JSON bruta recebida (Output)
     - Raciocínio detalhado passo-a-passo da IA
     - Contagem exata de tokens e custo da chamada.

## Contratos de Dados
- Tabela `ai_execution_logs` no Supabase:
  - `id` (uuid, PK)
  - `created_at` (timestamptz)
  - `store_id` (uuid, FK)
  - `provider` (text)
  - `model` (text)
  - `prompt_tokens` (integer)
  - `completion_tokens` (integer)
  - `total_tokens` (integer)
  - `estimated_cost` (numeric)
  - `execution_time_ms` (integer)
  - `raw_payload_json` (jsonb)
  - `raw_response_json` (jsonb)
  - `reasoning_steps_json` (jsonb)
  - `matches_applied_count` (integer)

## Features Existentes Impactadas
- `src/routes/conciliacao.$lojaId.tsx` (removido botão e modal)
- `src/lib/llm-matcher.ts` (adicionado salvamento de telemetria e aplicação automática silenciosa)
- `src/routes/configuracoes.tsx` (adicionado painel de telemetria, consumo de tokens e inspector de JSON)

## Risco Principal
Exceder limites de cota da API da IA durante chamadas assíncronas repetidas.
*Mitigação:* Captura graciosa de erros no fetch gravando o status de erro no `ai_execution_logs` sem travar a interface do usuário.
