# Design: Refinamentos UX do Agente e Novo Módulo de Custos (agente-refinements)

## Arquitetura Técnica
1. **Frontend UI**: Mutações locais no estado do React para a UI (paginação de histórico).
2. **Auto-titulação**: Integração via Supabase Edge Function ou Client-side call para um modelo `gemini-1.5-flash` ou via endpoint já existente de chat, desencadeada no envio da *primeira* mensagem de uma conversa sem título. A resposta atualiza o campo `title` da `conversation` na base.
3. **Módulo de Custos (`src/routes/custos.tsx`)**: Uma nova página consumindo hooks (ex: `useBotLogs`) e agregando metadados de requisição para apresentar painéis estatísticos (KIPs).

## Interfaces TypeScript
```typescript
// Para Custos
interface CostSummary {
  period: string;
  chatCost: number;
  engineCost: number;
  totalCost: number;
}
```

## Componentes / Hooks / Funções
1. **`src/routes/agente.tsx`**:
   - Ajuste de margin/padding top (fix overlap).
   - `useState` para `showAllConversations` (limite default 5).
   - Componente interno de botão "Nova Conversa" recebendo classes `active:scale-95 transition-all`.
   - Lógica no item do Histórico para incluir ícone Editar (Renomear) via `prompt` ou modal nativo simplificado.
2. **`src/components/chat/PromptInput.tsx`**:
   - Mudar `focus-within:border-[var(--color-accent-teal)]` para `focus-within:border-[var(--text-secondary)]` (cor cinza claro/zinc compatível).
3. **`src/routes/logs.motor.tsx` & `src/routes/logs.agente.tsx` & `src/routes/configuracoes.tsx`**:
   - Inserir botão de "Voltar" apontando para `/agente` no Header superior.
4. **`src/routes/logs.motor.tsx`**:
   - Refatoração dos items mapeados. Criação de um acordeão usando estado local ou `<details>` com estilo customizado. Formatar JSON em blocos de Input e Output separados.
5. **`src/routes/custos.tsx`**:
   - Nova Rota Tanstack.
   - Dashboard com separação visual de Conciliação e Chat, e cards totalizadores.

## Fluxo de UI
Restrições visuais do usuário:
- Manter aderência ao Zinc-950, sem glassmorphism.
- Botões interativos, fluidos. 
- Organização "certinha" de payloads no log.
- Botão "Voltar" visível e óbvio no topo esquerdo.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1: Sidebar Layout**
  - Ação: Abrir o /agente.
  - Resultado: Header "Oficina GPT" não deve ficar escondido abaixo da navbar do site.
- **Cenário 2: Histórico (Limites)**
  - Ação: Visualizar histórico com 10+ conversas.
  - Resultado: Apenas as 5 mais recentes aparecem. Botão "Ver mais 5 conversas" abaixo delas deve expandir.
- **Cenário 3: Renomear**
  - Ação: Clicar no botão de edição de uma conversa e mudar nome.
  - Resultado: UI reflete o novo nome.
- **Cenário 4: Motor Logs**
  - Ação: Abrir /logs/motor e inspecionar um log.
  - Resultado: Payloads aparecem fechados por padrão; ao expandir, há clareza na separação de chaves.
- **Cenário 5: Input Focus**
  - Ação: Focar no `PromptInput`.
  - Resultado: Borda ganha destaque Zinc-600/700 (cinza claro), e não verde.
