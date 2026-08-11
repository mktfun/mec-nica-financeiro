# Spec Plan: Marco Zero Global & Auditoria do Passivo (165)

## Tasks

- [x] [FRONTEND] Refatorar `src/lib/parsers/marcoZeroParser.ts` para usar uma heurística iterando sobre `workbook.SheetNames`, agrupando as abas por loja (ex: lendo cabeçalhos ou padrões de nome de aba) e retornar `GlobalMarcoZeroExtraction`.
- [x] [FRONTEND] Atualizar `src/components/importacoes/MarcoZeroWizard.tsx`:
  - [x] Remover state `targetStoreId` e o dropdown Select.
  - [x] Ao processar o Excel, renderizar um accordion ou grid exibindo os cards individuais de cada loja detectada (Saldos + N OSs pendentes).
  - [x] Criar rotina de `saveToDatabase` em lote: iterar sobre as lojas extraídas, dando upsert em `daily_snapshots`/`reconciliations` e insert em massa no `estoque_os_pendente`.
- [x] [FRONTEND] Criar `src/components/importacoes/AuditoriaPassivoWizard.tsx`:
  - [x] Consultar `estoque_os_pendente` para a loja ativa onde `status = 'PENDENTE'`.
  - [x] Exibir UI estilo checklist. Para cada OS, botões rápidos de "Dar Baixa", "Cancelar", "Manter Pendente".
  - [x] Quando o usuário der baixa, atualizar o status para `PAGA` e `data_baixa` = hoje.
- [x] [FRONTEND] Inserir `AuditoriaPassivoWizard` no fluxo do `CentralImportWizard.tsx` (Passo 2.5), forçando o usuário a revisar antes do Match Manual.
- [ ] [TEST] Rodar a importação do Marco Zero com a planilha completa.
- [ ] [TEST] Abrir o Wizard de conciliação diária no dia seguinte e validar a retenção na Auditoria do Passivo.
