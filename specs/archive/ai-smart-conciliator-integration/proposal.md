# Proposal: Assistente Inteligente de Conciliação com IA (ai-smart-conciliator-integration)

## Problema

- Embora o motor heurístico trate regras exatas, divergências complexas (como nomes de clientes truncados no PIX, diferenças de centavos por taxas de cartão, depósitos agrupados de múltiplos cartões e diferenças de datas entre a emissão da OS e o depósito no extrato) deixam lacunas e geram desconfiança no usuário.
- O sistema já possuía a tela de `/configuracoes` para cadastrar chaves de API (Google Gemini, OpenAI GPT e Anthropic Claude) e o utilitário `llm-matcher.ts`, porém **este assistente de IA não estava conectado à interface de conciliação**.

## Solução Proposta

1. **Botão & Modal do Assistente de IA na Tela de Conciliação (`AiConciliationAssistant.tsx`):**
   - Adicionar o botão **"✨ Conciliar com IA"** no topo da tela de conciliação da loja (`/conciliacao/$lojaId`) e no painel principal.
   - Caso a chave de API da IA não esteja configurada em `/configuracoes`, exibir um aviso claro redirecionando o usuário para cadastrá-la.

2. **Aprimoramento do Utilitário de IA (`llm-matcher.ts`):**
   - Expandir a integração com os 3 provedores suportados (**Google Gemini**, **OpenAI GPT-4o** e **Anthropic Claude 3.5 Sonnet**).
   - Enviar ao modelo LLM o lote de transações não reconciliadas (OSs do Pátio, Vendas da Maquininha e Entradas do Extrato OFX), incluindo nomes de clientes, valores de PIX, datas e memorando bancário.
   - Solicitar à IA que analise relacionamentos complexos e retorne sugestões com **Nível de Confiança (%)**, **Justificativa/Raciocínio** e os IDs vinculados.

3. **Interface de Aprovação & Aplicação dos Matches da IA:**
   - Exibir no modal os cards de sugestão gerados pela IA ordenados por confiança (ex: `98% - Match de PIX Ronildo R$680`).
   - Permitir a aprovação individual ("Aprovar Match") ou em lote ("Aprovar Todos os Matches da IA").
   - Gravar as confirmações na tabela `conciliation_matches` do Supabase e recarregar a visualização de conciliação imediatamente.

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
*Mitigação:* Captura graciosa de erros no fetch com notificação clara ao usuário ("Chave de API inválida ou cota excedida. Verifique em Configurações.").
