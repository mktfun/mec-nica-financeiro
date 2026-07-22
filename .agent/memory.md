# Memória Contínua do Agente

## Preferências de Arquitetura
- Frontend: React + Vite + Tailwind + shadcn/ui. TypeScript strict. Zustand para estado.
- Backend: Supabase para DB.
- Deploy/DNS: Cloudflare (quando aplicável).
- Integração Supabase self-hosted em VPS (quando aplicável).

## Erros Passados e Lições Aprendidas
- **Duplicação de transações da Rede:** Inserções da planilha da Rede sem um UUID único ou FitID geravam transações duplicadas no painel. Solucionado criando uma chave única (`storeName_grossAmount_netAmount_method_date`) no parser/wizard.
- **Conciliação Maquininha vs OS:** A lógica de interface sempre deve ter a transação bruta da Maquininha como coluna base (âncora) e buscar a OS que justifica a entrada, e não o inverso.

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
- [x] **Alvo 13:** Lojas (`lojas.tsx`) - Certificado limpo, sem intervenções.
- [x] **Alvo 14:** Pátio (`patio.tsx`) - Concluído.
- [x] **Alvo 15:** Proposta (`proposta.tsx`) - Concluído.
- [x] **Alvo 16:** Recebíveis (`recebiveis.tsx`) - Concluído.
- [x] **Alvo 17:** Components UI (`components/ui`) - Concluído.
- [x] **Alvo 18:** Components Layout (`components/layout`) - Certificado limpo, sem intervenções.
- [x] **Alvo 19:** Components Dashboard (`components/dashboard`) - Concluído.
- [x] **Alvo 20:** Components Conciliação (`components/conciliacao`) - Concluído.
- [x] **Alvo 21:** Components Importações (`components/importacoes`) - Concluído.

**Status Final:** QA e Padronização concluídos em toda a codebase (Alvos 1 a 21). Nenhum hardcoded restante. Design System consolidado.
