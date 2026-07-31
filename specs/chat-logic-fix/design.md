# Design: Correção de Lógica e Mapeamento de Lojas da IA (chat-logic-fix)

## Arquitetura Técnica
Ajuste de System Prompt na Edge Function `ai-chat`. O motor usa `generateText` do `@ai-sdk/core`, e as Tools são definidas com `zod`. Atualizar a `description` das ferramentas é a maneira mais direta de ditar o comportamento do LLM com o payload retornado da API Externa.

## Alterações de Prompt (TypeScript)

**Arquivo `index.ts`**
Em `<identidade_b2b>`:
```text
DICA DE MAPEAMENTO: Os clientes geralmente chamam as lojas com o prefixo "Rei do Óleo" (ex: "Rei do Óleo Mauá", "Rei do Óleo Jabaquara"). Associe automaticamente à loja respectiva.
```

Em `<modos_operacao>`:
```text
3. **FALLBACK AUTOMÁTICO DE OS**: Se a `consulta_resumo_os` (banco local) não encontrar a OS ou retornar vazia, VOCÊ DEVE IMEDIATAMENTE acionar a ferramenta externa `consulta_os_detalhe_completo` SEM PERGUNTAR ao usuário. Tenha proatividade.
```

**Arquivo `tools-oficina.ts`**
Na tool `consulta_contas_pagar_oficina`:
```typescript
description: 'Busca Contas a Pagar no sistema externo. ATENÇÃO MÁXIMA: O JSON retornado costuma incluir contas já pagas (status "PAG" ou valores zerados). Você DEVE OMITIR e FILTRAR os status "PAG" na sua resposta final, mostrando APENAS as contas em aberto, exceto se o usuário pedir o histórico de pagas.'
```

## Fluxo de UI
Nenhuma mudança visual. Chat passa a ser mais fluido e sem interrupções pedindo autorização para consultar a fonte primária/secundária.

## Infra / Deploy
Supabase Edge Function: `npx supabase functions deploy ai-chat`

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [O usuário digita "Rei do Óleo Mauá"] → [LLM converte corretamente para mhe_maua sem dizer que a loja não existe]
- Cenário 2: [O usuário pede contas a pagar de Jabaquara] → [LLM retorna vazio se todas estiverem como PAG, invés de listar uma tabela gigante inútil]
- Cenário 3: [O usuário pede dados de uma OS antiga não cacheadas localmente] → [LLM usa a tool local, não acha, invoca a externa sozinho e dá a resposta final]
