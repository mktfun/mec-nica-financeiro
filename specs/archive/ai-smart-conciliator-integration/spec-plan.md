# Spec Plan: Assistente Inteligente de ConciliaçÁo com IA (ai-smart-conciliator-integration)

## Tasks

- [ ] [FRONTEND] Aprimorar utilitário `src/lib/llm-matcher.ts`:
  - [ ] Adicionar suporte ao provedor Anthropic (Claude 3.5 Sonnet / Claude 3 Haiku).
  - [ ] Enriquecer o prompt de instruçÁo do sistema com regras de negócios reais (PIX por nome de cliente, janela de datas, taxas de adquirente).
  - [ ] Tratar respostas nos 3 provedores (Google Gemini, OpenAI GPT, Anthropic Claude).
- [ ] [FRONTEND] Criar componente `src/components/conciliacao/AiConciliationAssistant.tsx`:
  - [ ] Implementar o botÁo "✨ Conciliar com IA" com animaçÁo de carregamento e badges.
  - [ ] Criar modal interativo para exibiçÁo de sugestões da IA com porcentagem de confiança e raciocínio explicativo.
  - [ ] Adicionar fluxo de aprovaçÁo individual ("Aprovar Match") e em lote ("Aprovar Todos os Matches").
  - [ ] Gravar os vínculos na tabela `conciliation_matches` do Supabase e invalidar a query da conciliaçÁo.
- [ ] [FRONTEND] Integrar o assistente de IA na página de conciliaçÁo (`src/routes/conciliacao.$lojaId.tsx`).
- [ ] [TEST] Verificar compilaçÁo limpa com `npm run build`.
