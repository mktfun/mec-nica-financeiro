# Design: Restauração do Chat Full-Bleed e Navegação Muted Sem Emojis em `/agente` (agente-fullbleed-layout-and-clean-tabs)

## Arquitetura de Interface em `/agente`

```
[Topo: Header Discreto de Navegação no Canto Superior Direito]
- Chat (Lucide Bot)
- Provedores & API (Lucide Key)
- Telemetria & Custos (Lucide BarChart3)
- Inspector JSON (Lucide Terminal)

[Se Aba === 'chat'] -> Layout Full-Bleed (Tela Cheia):
  +-----------------------+---------------------------------------------+
  | Sidebar Histórico     | Main Chat Area (Full Viewport Height)       |
  | (w-[260px])           | - Header do Oficina GPT                     |
  | - Botão "Nova Conversa"| - Lista de Mensagens (overflow-y-auto)     |
  | - Lista de Conversas  | - PromptBox Flutuante no Rodapé             |
  +-----------------------+---------------------------------------------+

[Se Aba !== 'chat'] -> Container de Gestão (p-6 max-w-6xl mx-auto):
  - Formulário de Provedor & API Key (Google, OpenAI, Claude)
  - Cards de Tokens Totais, Custos USD/BRL e Inspector de JSON
```

## Estilo Visual (Constraints)
- **Cores:** Fundo dark sólido Zinc-950 (`bg-[var(--bg-canvas)]`), bordas `border-white/10`, badges cinzas neutras.
- **Ícones:** Apenas `lucide-react` (zero emojis unicode como `♂` ou `⚙️`).
- **Botões de Aba:**
  `px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-tertiary)] hover:text-white border border-transparent transition-colors`
  Quando ativa: `bg-white/10 text-white font-semibold border-white/15`

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Chat Full-Bleed em Tela Cheia):**
  - *Ação:* Acessar `/agente` na aba "Chat".
  - *Resultado Esperado:* O chat ocupa 100% da altura da página abaixo da navbar principal, sem caixa restritiva `h-[680px]` ou margens externas.
- **Cenário 2 (Navegação Limpa Sem Emojis):**
  - *Ação:* Observar as pílulas de navegação no header.
  - *Resultado Esperado:* Apenas texto limpo com ícones Lucide vetoriais, sem nenhum emoji visível.
- **Cenário 3 (Alternância de Abas):**
  - *Ação:* Clicar em "Provedores & API", "Telemetria & Custos" ou "Inspector JSON".
  - *Resultado Esperado:* A tela alterna suavemente para os painéis correspondentes com formatação limpa e organizada.
