# Design: Refinamentos UX do Agente e Novo Módulo de Custos (agente-refinements)

## Arquitetura Técnica
1. **Frontend UI**: Mutações locais no estado do React para a UI (paginaçÁo de histórico).
2. **Auto-titulaçÁo**: IntegraçÁo via Supabase Edge Function ou Client-side call para um modelo `gemini-1.5-flash` ou via endpoint já existente de chat, desencadeada no envio da *primeira* mensagem de uma conversa sem título. A resposta atualiza o campo `title` da `conversation` na base.
3. **Módulo de Custos (`src/routes/custos.tsx`)**: Uma nova página consumindo hooks (ex: `useBotLogs`) e agregando metadados de requisiçÁo para apresentar painéis estatísticos (KIPs).

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
   - Componente interno de botÁo "Nova Conversa" recebendo classes `active:scale-95 transition-all`.
   - Lógica no item do Histórico para incluir ícone Editar (Renomear) via `prompt` ou modal nativo simplificado.
2. **`src/components/chat/PromptInput.tsx`**:
   - Mudar `focus-within:border-[var(--color-accent-teal)]` para `focus-within:border-[var(--text-secondary)]` (cor cinza claro/zinc compatível).
3. **`src/routes/logs.motor.tsx` & `src/routes/logs.agente.tsx` & `src/routes/configuracoes.tsx`**:
   - Inserir botÁo de "Voltar" apontando para `/agente` no Header superior.
4. **`src/routes/logs.motor.tsx`**:
   - RefatoraçÁo dos items mapeados. CriaçÁo de um acordeÁo usando estado local ou `<details>` com estilo customizado. Formatar JSON em blocos de Input e Output separados.
5. **`src/routes/custos.tsx`**:
   - Nova Rota Tanstack.
   - Dashboard com separaçÁo visual de ConciliaçÁo e Chat, e cards totalizadores.

## Fluxo de UI
Restrições visuais do usuário:
- Manter aderência ao Zinc-950, sem glassmorphism.
- Botões interativos, fluidos. 
- OrganizaçÁo "certinha" de payloads no log.
- BotÁo "Voltar" visível e óbvio no topo esquerdo.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1: Sidebar Layout**
  - AçÁo: Abrir o /agente.
  - Resultado: Header "Oficina GPT" nÁo deve ficar escondido abaixo da navbar do site.
- **Cenário 2: Histórico (Limites)**
  - AçÁo: Visualizar histórico com 10+ conversas.
  - Resultado: Apenas as 5 mais recentes aparecem. BotÁo "Ver mais 5 conversas" abaixo delas deve expandir.
- **Cenário 3: Renomear**
  - AçÁo: Clicar no botÁo de ediçÁo de uma conversa e mudar nome.
  - Resultado: UI reflete o novo nome.
- **Cenário 4: Motor Logs**
  - AçÁo: Abrir /logs/motor e inspecionar um log.
  - Resultado: Payloads aparecem fechados por padrÁo; ao expandir, há clareza na separaçÁo de chaves.
- **Cenário 5: Input Focus**
  - AçÁo: Focar no `PromptInput`.
  - Resultado: Borda ganha destaque Zinc-600/700 (cinza claro), e nÁo verde.
