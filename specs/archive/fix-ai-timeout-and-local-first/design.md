# Design: Resiliência Anti-Hang, Consulta Local Inteligente Primeiro e Prova E2E (fix-ai-timeout-and-local-first)

## Arquitetura Técnica

```
[Pergunta do Usuário: OS 22551 no Rei do Óleo Mauá]
       │
       ▼
[Edge Function ai-chat]
       │
       ├── 1. LLM decide chamar a ferramenta local 'consulta_resumo_os'
       │
       ├── 2. consulta_resumo_os (tools-local.ts)
       │    └── Busca por os_number = '22551' no Supabase local
       │    └── Retorna instantaneamente (< 50ms): { os_number: '22551', store_name: 'ReiDoOleoMaua', total_value: 520, status: 'em_aberto' }
       │
       ├── 3. Caso ferramenta externa seja acionada (tools-oficina.ts)
       │    └── ProteçÁo AbortSignal.timeout(5000)
       │    └── Se timeout/falha -> Retorna aviso gracioso sem travar a Edge Function
       │
       └── 4. LLM gera resposta textual completa e formatada em Markdown
            └── Ex: "A OS #22551 do Rei do Óleo Mauá está em aberto no valor de R$ 520,00..."
```

## Componentes / Arquivos Modificados

1. **`supabase/functions/ai-chat/tools-local.ts`**:
   - `consulta_resumo_os`:
     ```ts
     execute: async ({ osNumber, loja, limit }) => {
       let query = supabaseClient.from('patio_os').select('*');
       if (osNumber) {
         query = query.eq('os_number', String(osNumber).trim());
       } else if (loja) {
         query = query.or(`store_id.eq.${loja},store_name.ilike.%${loja}%`);
       }
       const { data, error } = await query.limit(limit);
       if (error) return { erro_local: error.message };
       if (!data || data.length === 0) return { aviso: 'OS nÁo encontrada no banco local.' };
       return data;
     }
     ```

2. **`supabase/functions/ai-chat/tools-oficina.ts`**:
   - Adicionar `signal: AbortSignal.timeout(5000)` em todos os `fetch()` externos.
   - Capturar exceções de timeout e retornar aviso descritivo em vez de relançar erros.

3. **`supabase/functions/ai-chat/index.ts`**:
   - Reforçar no `SYSTEM_PROMPT` a instruçÁo para apresentar a resposta assim que os dados locais forem obtidos, evitando chamadas desnecessárias a ferramentas lentas.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1: Consulta da OS 22551 no Rei do Óleo Mauá**
  - AçÁo: Enviar "quais os detalhes da OS 22551 no rei do oleo maua?"
  - Resultado esperado:
    1. A IA consulta o banco local e encontra a OS 22551.
    2. A IA gera a resposta completa: OS 22551, Loja Rei do Óleo Mauá, Status Aberta, Valor R$ 520,00.
    3. A resposta nÁo trava nem congela no meio.
    4. Prova visual em screenshot (`tela_agente_e2e.png`).
