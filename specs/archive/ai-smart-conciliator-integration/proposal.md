# Proposal: Assistente Inteligente de ConciliaçÁo com IA (ai-smart-conciliator-integration)

## Problema

- Embora o motor heurístico trate regras exatas, divergências complexas (como nomes de clientes truncados no PIX, diferenças de centavos por taxas de cartÁo, depósitos agrupados de múltiplos cartões e diferenças de datas entre a emissÁo da OS e o depósito no extrato) deixam lacunas e geram desconfiança no usuário.
- O sistema já possuía a tela de `/configuracoes` para cadastrar chaves de API (Google Gemini, OpenAI GPT e Anthropic Claude) e o utilitário `llm-matcher.ts`, porém **este assistente de IA nÁo estava conectado à interface de conciliaçÁo**.

## SoluçÁo Proposta

1. **BotÁo & Modal do Assistente de IA na Tela de ConciliaçÁo (`AiConciliationAssistant.tsx`):**
   - Adicionar o botÁo **"✨ Conciliar com IA"** no topo da tela de conciliaçÁo da loja (`/conciliacao/$lojaId`) e no painel principal.
   - Caso a chave de API da IA nÁo esteja configurada em `/configuracoes`, exibir um aviso claro redirecionando o usuário para cadastrá-la.

2. **Aprimoramento do Utilitário de IA (`llm-matcher.ts`):**
   - Expandir a integraçÁo com os 3 provedores suportados (**Google Gemini**, **OpenAI GPT-4o** e **Anthropic Claude 3.5 Sonnet**).
   - Enviar ao modelo LLM o lote de transações nÁo reconciliadas (OSs do Pátio, Vendas da Maquininha e Entradas do Extrato OFX), incluindo nomes de clientes, valores de PIX, datas e memorando bancário.
   - Solicitar à IA que analise relacionamentos complexos e retorne sugestões com **Nível de Confiança (%)**, **Justificativa/Raciocínio** e os IDs vinculados.

3. **Interface de AprovaçÁo & AplicaçÁo dos Matches da IA:**
   - Exibir no modal os cards de sugestÁo gerados pela IA ordenados por confiança (ex: `98% - Match de PIX Ronildo R$680`).
   - Permitir a aprovaçÁo individual ("Aprovar Match") ou em lote ("Aprovar Todos os Matches da IA").
   - Gravar as confirmações na tabela `conciliation_matches` do Supabase e recarregar a visualizaçÁo de conciliaçÁo imediatamente.

## Contratos de Dados
- Tabela `ai_settings`: lê `provider`, `model`, `api_key`.
- Tabela `conciliation_matches`: grava `store_id`, `date`, `ofx_transaction_id`, `rede_transaction_id`, `system_os_number`, `confidence_score`, `ai_reasoning`, `match_type`.

## Features Existentes Impactadas
- `src/routes/configuracoes.tsx` & `src/hooks/useAiSettings.ts`
- `src/lib/llm-matcher.ts`
- `src/routes/conciliacao.$lojaId.tsx`
- `src/components/conciliacao/AiConciliationAssistant.tsx` [NOVO]

## Risco Principal
Chave de API inválida ou limite de cota excedido no provedor escolhido.
*MitigaçÁo:* Captura graciosa de erros no fetch com notificaçÁo clara ao usuário ("Chave de API inválida ou cota excedida. Verifique em Configurações.").
