# Spec Plan: Resiliência Anti-Hang, Consulta Local Inteligente Primeiro e Prova E2E (fix-ai-timeout-and-local-first)

## Tasks

- [x] [BACKEND] Refatorar `consulta_resumo_os` em `tools-local.ts` para buscar por `os_number` diretamente se `osNumber` for fornecido
- [x] [BACKEND] Adicionar `AbortSignal.timeout(5000)` e tratamento de resiliência em todos os `fetch()` de `tools-oficina.ts` para evitar travamentos
- [x] [BACKEND] Fazer deploy da Edge Function `ai-chat` com os ajustes de resiliência
- [x] [TEST] Executar teste E2E via Playwright (`node test_e2e.js`) enviando a mensagem da OS `22551` no Rei do Óleo Mauá, capturando screenshot para provar a resposta textual completa da IA na interface com 100% de sucesso
