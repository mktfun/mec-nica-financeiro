# Memória Contínua do Agente

## Preferências de Arquitetura
- Frontend: React + Vite + Tailwind + shadcn/ui. TypeScript strict. Zustand para estado.
- Backend: Supabase para DB.
- Deploy/DNS: Cloudflare (quando aplicável).
- Integração Supabase self-hosted em VPS (quando aplicável).

## Erros Passados
- (Vazio até o momento)

## Persona do Usuário
- O usuário utiliza Windows com PowerShell.
- Desenvolve utilizando "vibe coding" (fluxo automatizado com agente IA Antigravity).
- Valoriza soluções headless (CLI sem interação manual) e robustez no design.

## Audit Pipeline (QA e Padronização)
- [x] **Alvo 1:** Dashboard (`index.tsx` e `components/dashboard/*`) - Concluído.
- [x] **Alvo 2:** Alertas (`alertas.tsx` e `AlertResolveDialog.tsx`) - Concluído.
- [x] **Alvo 3:** Conciliação (`conciliacao.index.tsx` e `ResumoDiaPanel.tsx`) - Concluído.
- [x] **Alvo 4:** Conciliação por Loja (`conciliacao.$lojaId.tsx`) - Concluído.
- [x] **Alvo 5:** Detalhes Conciliação (`conciliacao-detalhes.tsx`) - Concluído.
- [x] **Alvo 6:** Configurações (`configuracoes.tsx`) - Concluído.
- [x] **Alvo 7:** Histórico (`historico.tsx`) - Concluído.
- [x] **Alvo 8:** Importações (`importacoes.tsx`) - Concluído.
- [x] **Alvo 9:** Importações Despesas (`importacoes-despesas.tsx`) - Concluído.
- [x] **Alvo 10:** Importar OS (`importar-os.tsx`) - Concluído.
- [x] **Alvo 11:** Login (`login.tsx`) - Certificado limpo, sem intervenções.
- [x] **Alvo 12:** Loja Dashboard (`loja.$lojaId.tsx`) - Concluído.
- Próximos Alvos: (A definir pelo usuário)
