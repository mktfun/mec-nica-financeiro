# Design: Assistente Inteligente de Conciliação com IA (ai-smart-conciliator-integration)

## Fluxo Arquitetural

```
[Tela de Conciliação] ---> Clique em "✨ Conciliar com IA"
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
            +---> Notifica sucesso e atualiza a conciliação!
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

- **`src/components/conciliacao/AiConciliationAssistant.tsx`**: Botão de ação e Modal interativo com listagem de sugestões da IA, badge de confiança, explicação textual do raciocínio e botões de confirmação.

## Restrições de UI
- Design System mantido: Zinc-950, botões primários da marca, badges de confiança verdes/amarelos, tipografia Inter.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Chave de IA Não Configurada):**
  - *Ação:* Clicar no botão "Conciliar com IA" sem chave cadastrada.
  - *Resultado Esperado:* Modal amigável solicita o cadastro da API Key com link direto para a tela `/configuracoes`.
- **Cenário 2 (Geração de Sugestões de Conciliação com IA):**
  - *Ação:* Clicar em "Conciliar com IA" com a API Key do Gemini/GPT configurada.
  - *Resultado Esperado:* A IA analisa os lançamentos pendentes, identifica o PIX/Cartão com raciocínio e exibe o modal de aprovação.
- **Cenário 3 (Aprovação de Match):**
  - *Ação:* Clicar em "Aprovar Match" em uma sugestão da IA.
  - *Resultado Esperado:* O registro é inserido em `conciliation_matches`, os itens somem da lista de pendências e o status da loja é atualizado para pareado.
