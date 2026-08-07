# Design: Passo a Passo Expansível, Tratamento de Erros Limpo e Prevenção de Respostas Vazias (fix-chat-steps-and-error-ui)

## Arquitetura Técnica

```
[useChat Messages Stream]
       │
       ▼
[MessageList.tsx]
       │
       ├── 1. Extração de Conteúdo e Etapas (extractSteps & getMessageContent)
       │    ├── textContent: Filtra partes de texto simples
       │    └── steps: Coleta reasoning, toolInvocations e parts de ferramenta
       │
       ├── 2. Renderização de Etapas (StepAccordion)
       │    ├── Botão Expansível: "X etapas concluídas ˅"
       │    └── Conteúdo Expansível: Lista de passos com ícone status + args/result
       │
       ├── 3. Renderização Condicional do Balão de Texto
       │    └── SE textContent.trim().length > 0 -> Renderiza ReactMarkdown em balão escuro
       │    └── SENÃO -> Oculta o balão escuro (evita caixa vazia)
       │
       └── 4. Renderização de Erro Limpo (ErrorCard)
            └── SE msg ou error -> Renderiza card de erro formatado e compacto
```

## Interfaces e Estrutura de Tipos

```ts
export type StepStatus = 'running' | 'completed' | 'error';

export type ChatStep = {
  id: string;
  name: string;
  label: string;
  status: StepStatus;
  args?: any;
  result?: any;
};
```

## Componentes / Hooks Modificados

### 1. `StepAccordion` em `src/components/chat/MessageList.tsx`
- **Props:** `{ steps: ChatStep[] }`
- **UI:**
  - Acordeão minimalista com botão toggle (`[ChevronDown/Up] X etapas concluídas`).
  - Lista interna com ícones `Loader2` (animado para `running`), `CheckCircle2` (verde/zinc para `completed`), `AlertCircle` (vermelho para `error`).
  - Nomes amigáveis mapeados automaticamente:
    - `consulta_resumo_os` → "Verificando Ordens de Serviço locais"
    - `consulta_os_detalhe_completo` → "Consultando detalhes completos na Oficina Inteligente"
    - `consulta_saldo_contas` → "Consultando fluxo de caixa e saldos"
    - `consulta_contas_pagar_oficina` → "Buscando contas a pagar na API externa"
    - fallback → Nome formatado sem underscores.

### 2. `SanitizeError` em `src/routes/agente.tsx` & `MessageList.tsx`
- Remove tags HTML (`<... >`).
- Se for um JSON string com `{ "error": "..." }`, extrai a propriedade `error`.
- Limita o texto do erro a 150 caracteres para não quebrar o layout.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1: Pergunta com uso de ferramenta (OS 22551 no Rei do Óleo Mauá)**
  - Ação: Enviar "quais os detalhes da OS 22551 no rei do oleo maua?"
  - Resultado esperado:
    1. A mensagem do usuário sobe imediatamente na direita.
    2. Aparece o acordeão `Executando etapa...` enquanto a ferramenta roda.
    3. Nenhum balão de texto em branco é exibido.
    4. Ao concluir, o acordeão vira `X etapas concluídas ˅` e o texto final do assistente aparece formatado em Markdown abaixo.

- **Cenário 2: Erro de API/Chave**
  - Ação: Simular falha de conexão ou erro HTTP
  - Resultado esperado: É exibido um card de erro compacto e limpo (`bg-red-950/20`), sem despejar HTML bruto nem travar a tela.
