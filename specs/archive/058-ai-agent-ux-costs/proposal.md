# Proposal: ReestruturaçÁo da UX do Agente IA e Custos Reais (058-ai-agent-ux-costs)

## Problema
1. O painel de "Custos IAS" está vazando para o menu global lateral, poluindo a navegaçÁo de ferramentas core da oficina.
2. Dentro do "Agente IA", os links para Configurações, Log do Motor, Log do Agente e Custos estÁo quebrando a experiência de chat. Em vez de abrir dentro da interface integrada (Agente Workspace), estÁo redirecionando o usuário para páginas isoladas fora do ambiente do Agente.
3. O painel de Custos atualmente exibe dados *mockados* e falsos. O consumo real dos tokens no chat da IA (Edge Function) nÁo está sendo computado nem consolidado, impedindo a rastreabilidade financeira do uso de IA.

## SoluçÁo Proposta
1. **RefatoraçÁo da UX (Menus):**
   - Remover "Custos IAS" de `Sidebar.tsx`.
   - Modificar `agente.tsx` para se tornar um contêiner de workspace que gerencia views internas em vez de redirecionar (`activeView`: `chat`, `config`, `costs`, `logs-agent`, `logs-motor`). O painel lateral (Agente) continuará visível, mas a área central mudará dinamicamente para manter o usuário no contexto.
2. **Registro Real de Telemetria (Edge Function):**
   - Atualizar a Edge Function `ai-chat` para extrair os `usage.promptTokens` e `usage.completionTokens` no evento `onFinish`.
   - Calcular um `estimated_cost` aproximado baseado no modelo configurado e inserir os dados (incluindo JSON bruto se aplicável) diretamente na tabela `ai_execution_logs`, marcando como originado pelo "Chat (Agente)".
3. **Custos Reais (Dashboard):**
   - Atualizar o painel de Custos para consumir a tabela `ai_execution_logs` agregando por período (Hoje, Semana, Mês) e origem ("Agent" vs "Engine").

## Contratos de Dados
- **Tabela `ai_execution_logs` (Existente):** Nenhuma alteraçÁo estrutural necessária.
- **Edge Function `ai-chat`:** Executará um `supabaseAdmin.from('ai_execution_logs').insert(...)` ao final do stream para salvar tokens gastos pelo Agente.

## API / Interface
- `src/components/layout/Sidebar.tsx`: RemoçÁo do item `/custos`.
- `src/routes/agente.tsx`: RenderizaçÁo condicional interna para as views do workspace da IA.
- `supabase/functions/ai-chat/index.ts`: Captura do AI SDK usage data.

## Features Existentes Impactadas
- **Configurações e Logs (`/configuracoes`, `/logs/agente`, `/logs/motor`):** ContinuarÁo acessíveis por URL direta, mas terÁo componentes base extraídos e reaproveitados para a injeçÁo do Agente.
- Ref: spec/global/features.md -> Abas do Agente.

## Risco Principal
- O cálculo de custo na Edge Function pode variar de acordo com reajustes de tarifa de provedores. Criaremos constantes aproximadas por modelo.
