# Spec Plan: Agent Domain Routing (agent-domain-routing)

## Tasks

- [x] [EDGE FUNCTION] Reescrever a Tool `consulta_os_detalhe_completo` para retornar um objeto JSON legível em caso de Catch/falha, em vez de atirar a exceção bruta.
- [x] [EDGE FUNCTION] Substituir a Tool placeholder de conciliações por `consulta_conciliacao_periodo`, fazendo um query simples usando `supabaseClient.from('reconciliations').select('*').limit(50)`.
- [x] [EDGE FUNCTION] Substituir a Tool placeholder de movimentação por `consulta_resumo_os`, fazendo query na tabela `patio_os` usando `supabaseClient.from('patio_os').select('*')`.
- [x] [EDGE FUNCTION] Substituir a Tool placeholder de fluxo de caixa por `consulta_saldo_contas`, lendo da tabela `transactions` ou `cash_registers` usando `supabaseClient`.
- [x] [EDGE FUNCTION] Substituir a Tool placeholder de contas a pagar por `consulta_contas_em_aberto`, lendo da tabela `receivables` usando `supabaseClient`.
- [x] [EDGE FUNCTION] Reescrever o `systemPrompt` do Agente, incorporando as Regras de Roteamento (Fonte local primária vs Fonte externa secundária) e a Regra de Tratamento de Erros.
- [x] [DEPLOY] Implantar a nova Edge Function (se estivéssemos executando a spec no mundo real, rodaríamos `supabase functions deploy ai-chat`). Como o código roda dinamicamente, validar compilação Typescript.
- [x] [TEST] Verificar cenário 1: Solicitar um resumo de conciliação. Garantir que ele acessou localmente sem tentar usar o bot externo.
- [x] [TEST] Verificar cenário 2: Simular uma OS que não está no cache local. Garantir que ele aciona o Fallback (`consulta_os_detalhe_completo`).
