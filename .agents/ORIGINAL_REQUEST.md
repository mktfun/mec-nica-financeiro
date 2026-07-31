# Original User Request

## 2026-07-31T13:27:42Z

O projeto consiste em duas frentes de correção na Central de Agentes IAS: **(1)** Consertar o fluxo de envio e resposta de mensagens do chat (que atualmente exige F5 e não recebe resposta do bot) e **(2)** Desfazer a regressão de UI no menu lateral, restaurando os botões individuais de "Log do Agente de IA" e "Log do Motor de Conciliação" que foram aglutinados indevidamente na tela de configurações.

Working directory: `c:/Users/admin/.gemini/antigravity/scratch/financeiro`
Integrity mode: development

## Requirements

### R1. Correção do Chat (Envio e Resposta)
Diagnosticar e corrigir o porquê de as mensagens não aparecerem em tempo real no envio (exigindo refresh da página) e o porquê de o bot não estar respondendo. Garantir que o fluxo de WebSockets ou mutações locais de estado (React/Supabase) seja instantâneo e que a Edge Function do bot processe e responda na mesma interface.

### R2. Restauração do Layout do Menu Lateral (Logs)
Remover a aglutinação confusa ("salada") criada na tela de configurações. Restaurar no menu lateral (Sidebar) os botões distintos para:
- Log do Agente de IA
- Log do Motor de Conciliação
Esses botões devem apontar para suas respectivas telas de log isoladas, exatamente como era antes do último ajuste de UI.

## Acceptance Criteria

### UI e Navegação
- [ ] O menu lateral (`Sidebar`) possui botões separados e visíveis para "Log do Agente de IA" e "Log do Motor de Conciliação".
- [ ] Clicar em cada botão direciona para a visualização correta e isolada dos logs, sem misturar configurações não relacionadas.

### Funcionamento do Chat
- [ ] Ao enviar uma mensagem no chat, ela aparece imediatamente na interface sem necessidade de dar refresh (F5) na página.
- [ ] O bot recebe a mensagem e a interface exibe a resposta gerada de forma reativa.
