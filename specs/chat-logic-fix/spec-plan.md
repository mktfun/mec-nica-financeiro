# Spec Plan: Correção de Lógica da IA (chat-logic-fix)

## Tasks

- [ ] [BACKEND] Atualizar o bloco `<identidade_b2b>` em `supabase/functions/ai-chat/index.ts` com a dica de mapeamento do prefixo "Rei do Óleo".
- [ ] [BACKEND] Atualizar o bloco `<modos_operacao>` em `supabase/functions/ai-chat/index.ts` para instruir o fallback autônomo.
- [ ] [BACKEND] Atualizar a propriedade `description` da ferramenta `consulta_contas_pagar_oficina` em `supabase/functions/ai-chat/tools-oficina.ts` para obrigar o LLM a filtrar status `PAG`.
- [ ] [TEST] Executar deploy com `npx supabase functions deploy ai-chat` para confirmar o push da Edge Function atualizada para o Supabase.
