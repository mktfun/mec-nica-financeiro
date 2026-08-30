# Proposal: Reativacao do Gemini na Conciliacao Inteligente e Equalizacao de Cartoes (307)

## Problema
1. **Remocao Acidental da IA na Conciliacao:** No commit `3ef34551`, o arquivo `src/lib/llm-matcher.ts` foi removido, deixando o motor de conciliação do `CentralImportWizard.tsx` dependente exclusivamente de procedures SQL rigidas (`auto_match_transactions`).
2. **Falha de Conciliacao da Rede (D-1 para D0):** Como o SQL rigido nao fez o cruzamento semantico dos lotes de cartao de ontem que cairam hoje no extrato (ex: Dom Pedro R$ 6.619,25 e Rei do Modulo R$ 3.169,62), o sistema marcou essas transacoes como `nao_entrou` e somou indevidamente `+ R$ 7.231,41` no "A Compensar", duplicando valores no saldo bancario.
3. **Persistencia da Chave do Gemini:** A tabela `public.ai_settings` no Supabase esta atualmente vazia (`[]`), impedindo que chamadas headless encontrem a chave cadastrada pelo usuario.

## Solucao Proposta
1. **Restaurar e Otimizar `src/lib/llm-matcher.ts`:**
   - Implementar chamada nativa direta a API do **Google Gemini** com suporte aos modelos `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash` ou `gemini-3.5-flash-lite`.
   - Prompt de sistema especializado em conciliação tripla:
     - **Regra 1 (Rede ? OFX):** Identificar se os lotes de cartao de D-1 entraram no OFX de D0. Se entraram, marcar status `entrou` e zerar o "A Compensar". Se faltou parte, apontar a venda pendente e calcular o "A Compensar" exato.
     - **Regra 2 (PIX ? OS):** Parear entradas PIX no extrato com OSs em aberto por valor e similaridade de nome do titular.
   - Resiliencia: Timeout estrito de 4s com fallback automatico deterministico caso a API oscile ou esteja sem cota.
2. **Integracao no `CentralImportWizard.tsx`:**
   - Durante a etapa de conciliação do wizard, executar o `llm-matcher` em lote antes de persistir o fechamento, enriquecendo o `auto_match_transactions` com os pareceres da IA.
   - Atualizar a tabela `pos_transactions` e `conciliation_matches` com os resultados inteligentes.
3. **Persistencia da Chave e Configuracoes:**
   - Atualizar `useAiSettings.ts` e a tabela `public.ai_settings` no Supabase garantindo que a chave de API e provedor `google` fiquem gravados com fallback para `import.meta.env.VITE_GEMINI_API_KEY`.
4. **Equalizacao Contabil:**
   - Garantir que o saldo consolidado de bancos no fechamento reflita com fidelidade `OFX Positivo + A Compensar Real (somente o que NAO caiu) + Dinheiro em Cofre`, batendo 1:1 com a planilha oficial.

## Contratos de Dados
- **Tabela `ai_settings`:**
  - `user_id`: text / uuid ('GLOBAL' ou user autenticado)
  - `provider`: 'google'
  - `model`: 'gemini-2.5-flash' / 'gemini-1.5-flash' / 'gemini-3.5-flash-lite'
  - `api_key`: string criptografada / chave Google AI Studio
- **Tabela `conciliation_matches`:**
  - `confidence_score`: pontuação de confiança gerada pelo Gemini (0-100)
  - `ai_reasoning`: justificativa textual do pareamento (ex: "Lote Rede Visa R$ 5.524,13 caiu no OFX de 27/08")
  - `status`: 'perfect_match' | 'ai_matched' | 'manual'
- **Tabela `pos_transactions`:**
  - `settlement_status`: 'entrou' | 'nao_entrou' | 'divergente'

## API / Interface
- `src/lib/llm-matcher.ts`: Função `generateTripleMatchSuggestions()` e `reconcileRedeWithOfxViaGemini()`.
- `src/components/importacoes/CentralImportWizard.tsx`: Integração da etapa de IA no stepper de gravação.
- `src/hooks/useAiSettings.ts`: Carregamento confiável com fallback robusto.

## Features Existentes Impactadas
- `CentralImportWizard.tsx` (Etapa de conciliação)
- `auto_match_transactions` (RPC auxiliar)
- `SaldoBancosDetailModal.tsx` (Exibição coerente da coluna Maquininhas)

## Risco Principal
- Falha de conexão ou quota da API do Google Gemini durante a importação.
- *Mitigação:* Fallback determinístico instantâneo que executa as regras matemáticas do SQL caso a chamada de IA falhe, nunca travando a importação do operador.
