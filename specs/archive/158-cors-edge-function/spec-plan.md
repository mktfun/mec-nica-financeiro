# Spec Plan: Correção de CORS (158)

## Tasks

- [x] [BACKEND] Refatorar `supabase/functions/sync-oficina/index.ts` para incluir a const `corsHeaders` (com \`authorization, x-client-info, apikey, content-type\`).
- [x] [BACKEND] Modificar o bloco \`if (req.method === 'OPTIONS')\` para retornar \`corsHeaders\`.
- [x] [BACKEND] Injetar o \`corsHeaders\` em todos os retornos \`new Response(...)\` restantes do arquivo.
- [x] [TEST] Verificar visualmente se a sintaxe do arquivo de Edge Function está íntegra.
