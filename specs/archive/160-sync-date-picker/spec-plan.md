# Spec Plan: Seletor de Data na Sincronização Cloud (160)

## Tasks

- [x] [FRONTEND] Injetar o campo `<input type="date">` visualmente coerente acima do botão no componente `CentralImportWizard.tsx` (linhas ~841).
- [x] [FRONTEND] Alterar a função \`supabase.functions.invoke\` no botão para enviar \`{ loja: store.id, data: targetDate }\`.
- [x] [BACKEND] Editar \`supabase/functions/sync-oficina/index.ts\` para extrair \`const { loja, data } = await req.json();\`.
- [x] [BACKEND] Acrescentar a interpolação \`&data=\${encodeURIComponent(data)}\` caso \`data\` exista, na variável \`urlContas\`.
- [x] [TEST] Compilar \`tsc --noEmit\` para garantir a integridade.
