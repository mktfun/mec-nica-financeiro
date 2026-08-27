# Proposal: Correção de Dependência Descarregável llm-matcher no Build Remoto (309)

## Problema
Durante o build em ambiente remoto/CI (Lovable/Cloudflare/dev-server), o build falha com o erro:
`[UNLOADABLE_DEPENDENCY] Could not load src/lib/llm-matcher` referenciado em `src/components/importacoes/CentralImportWizard.tsx`.
A causa-raiz é que o arquivo `src/lib/llm-matcher.ts` foi criado localmente para a conciliação assistida por IA, mas permaneceu como arquivo não rastreado (*untracked file*) no Git. Ao subir as alterações da Spec 308 na branch `main`, o arquivo `CentralImportWizard.tsx` subiu importando `@/lib/llm-matcher`, mas o módulo `llm-matcher.ts` não existia no repositório remoto.

## Solução Proposta
1. Incluir e rastrear formalmente `src/lib/llm-matcher.ts` no Git.
2. Validar a tipagem TypeScript, exports e tratamento de fallback de `reconcileRedeWithOfxViaGemini` e `matchPixWithOsViaGemini`.
3. Garantir que `CentralImportWizard.tsx` importe de forma limpa e resiliente.
4. Executar o build de produção local (`node node_modules/vite/bin/vite.js build`) para atestar compilação limpa.
5. Fazer commit e push imediato para restabelecer a esteira de CI/CD remota.

## Contratos de Dados
- Nenhuma alteração de banco de dados ou migration é necessária.
- `src/lib/llm-matcher.ts` consome a tabela `ai_settings` via Supabase para chave de API do Gemini e executa chamadas para a API REST do Google Generative Language (`models/gemini-2.5-flash:generateContent`).

## API / Interface
- Exporta `reconcileRedeWithOfxViaGemini(options: { targetDate, storeId, redeTransactions, ofxTransactions, geminiApiKey? })`
- Exporta `matchPixWithOsViaGemini(options: { targetDate, storeId, patioOsList, ofxPixTransactions, geminiApiKey? })`
- Exporta interfaces `RedeSaleItem`, `OfxCreditItem`, `RedeReconciliationResult`, `AiTripleMatchResult`.

## Features Existentes Impactadas
- `CentralImportWizard.tsx` (Etapa 4 de conferência de maquininha e conciliação).
- Build do Vite (`npm run build` / Cloudflare Nitro).

## Risco Principal
Falso negativo no build remoto se houver dependências implícitas não declaradas no `package.json` dentro de `llm-matcher.ts`.
Mitigação: `src/lib/llm-matcher.ts` utiliza exclusivamente `fetch` nativo e `@/lib/supabase`, sem pacotes externos extras (não depende de `@google/generative-ai` nem bibliotecas pesadas).
