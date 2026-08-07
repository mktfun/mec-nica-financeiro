# Design: Assistente Inteligente de ConciliaçÁo com IA (ai-smart-conciliator-integration)

## Fluxo Arquitetural

```
[Tela de ConciliaçÁo] ---> Clique em "✨ Conciliar com IA"
      |
      +---> Busca `useAiSettings()` (Provider, Model, API Key)
      |     Se vazia -> Abre modal alertando para configurar em /configuracoes
      |
      +---> Coleta itens pendentes (OSs sem match, Rede sem match, OFX sem match)
      |
      +---> Chama `generateTripleMatchSuggestions()` em `llm-matcher.ts`
      |     (Envio REST direto para Google Gemini, OpenAI GPT ou Anthropic Claude)
      |
      +---> Retorna Array de `MatchSuggestion` [{ os_id, rede_ids, ofx_ids, reasoning, confidence }]
      |
      +---> Exibe Modal "Sugestões da Inteligência Artificial"
      |
      +---> Clique em "Aprovar Match" ou "Aprovar Todos"
            |
            +---> Grava em `conciliation_matches` no Supabase
            +---> Invalida queries React Query (`reconciliation_views`)
            +---> Notifica sucesso e atualiza a conciliaçÁo!
```

## Tipos TypeScript (`src/lib/llm-matcher.ts`)

```typescript
export interface MatchSuggestion {
  id: string;
  os_number?: string;
  os_id?: string;
  rede_ids: string[];
  ofx_ids: string[];
  reasoning: string;
  confidence: number; // 0-100
  client_name?: string;
  amount?: number;
}
```

## Componentes Novos

- **`src/components/conciliacao/AiConciliationAssistant.tsx`**: BotÁo de açÁo e Modal interativo com listagem de sugestões da IA, badge de confiança, explicaçÁo textual do raciocínio e botões de confirmaçÁo.

## Restrições de UI
- Design System mantido: Zinc-950, botões primários da marca, badges de confiança verdes/amarelos, tipografia Inter.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Chave de IA NÁo Configurada):**
  - *AçÁo:* Clicar no botÁo "Conciliar com IA" sem chave cadastrada.
  - *Resultado Esperado:* Modal amigável solicita o cadastro da API Key com link direto para a tela `/configuracoes`.
- **Cenário 2 (GeraçÁo de Sugestões de ConciliaçÁo com IA):**
  - *AçÁo:* Clicar em "Conciliar com IA" com a API Key do Gemini/GPT configurada.
  - *Resultado Esperado:* A IA analisa os lançamentos pendentes, identifica o PIX/CartÁo com raciocínio e exibe o modal de aprovaçÁo.
- **Cenário 3 (AprovaçÁo de Match):**
  - *AçÁo:* Clicar em "Aprovar Match" em uma sugestÁo da IA.
  - *Resultado Esperado:* O registro é inserido em `conciliation_matches`, os itens somem da lista de pendências e o status da loja é atualizado para pareado.
