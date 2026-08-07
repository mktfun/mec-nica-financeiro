# Spec Plan: Assistente Inteligente de Conciliação com IA (ai-smart-conciliator-integration)

## Tasks

- [ ] [FRONTEND] Aprimorar utilitário `src/lib/llm-matcher.ts`:
  - [ ] Adicionar suporte ao provedor Anthropic (Claude 3.5 Sonnet / Claude 3 Haiku).
  - [ ] Enriquecer o prompt de instrução do sistema com regras de negócios reais (PIX por nome de cliente, janela de datas, taxas de adquirente).
  - [ ] Tratar respostas nos 3 provedores (Google Gemini, OpenAI GPT, Anthropic Claude).
- [ ] [FRONTEND] Criar componente `src/components/conciliacao/AiConciliationAssistant.tsx`:
  - [ ] Implementar o botão "✨ Conciliar com IA" com animação de carregamento e badges.
  - [ ] Criar modal interativo para exibição de sugestões da IA com porcentagem de confiança e raciocínio explicativo.
  - [ ] Adicionar fluxo de aprovação individual ("Aprovar Match") e em lote ("Aprovar Todos os Matches").
  - [ ] Gravar os vínculos na tabela `conciliation_matches` do Supabase e invalidar a query da conciliação.
- [ ] [FRONTEND] Integrar o assistente de IA na página de conciliação (`src/routes/conciliacao.$lojaId.tsx`).
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
