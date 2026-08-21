# Spec Plan: Importação Analítica do "BuscaContasAPagar.xls" & Conciliação Triangular de Aportes/Transferências Intercompany (Spec 256)

---

## Tasks

- [ ] [BACKEND] Criar migration `20260821000008_accounts_payable_support.sql` com a tabela `accounts_payable_imports` e colunas estendidas em `daily_manual_bills`
- [ ] [FRONTEND] Criar parser `src/lib/parsers/contasPagarParser.ts` para processar arquivos `BuscaContasAPagar.xls` com mapeamento das 10 filiais e categorização inteligente
- [ ] [FRONTEND] Criar tipos TypeScript em `src/types/contasPagar.ts`
- [ ] [FRONTEND] Criar hook `src/hooks/useContasAPagarImport.ts` para persistência e consulta analítica das despesas
- [ ] [FRONTEND] Adicionar zona de drop / upload para arquivos de Contas a Pagar no `CentralImportWizard.tsx`
- [ ] [FRONTEND] Atualizar `ContasManualModal.tsx` para permitir visualização analítica por loja, categoria e busca
- [ ] [FRONTEND] Implementar a detecção de aportes intercompany no motor de auto-healing
- [ ] [TEST] Executar teste de parse com o arquivo real `BuscaContasAPagar (1).xls` e validar soma de R$ 195.066,04
- [ ] [TEST] Executar `npm run build` para garantir zero erros de TypeScript e compilação
