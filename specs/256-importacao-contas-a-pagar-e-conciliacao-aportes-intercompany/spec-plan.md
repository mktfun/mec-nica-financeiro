# Spec Plan: Importação Analítica do "BuscaContasAPagar.xls", Cadastro de Entidades e Motor Triangular Intercompany (Spec 256)

---

## Tasks

- [ ] [BACKEND] Criar migration `20260821000008_accounts_payable_support.sql` com as tabelas `intercompany_entities`, `expense_category_rules`, `accounts_payable_imports` e colunas estendidas em `daily_manual_bills`
- [ ] [BACKEND] Seed inicial das entidades padrão (Sócios: Daniel, Rogério, Raphael e 10 Lojas) e regras padrão de categorias (Peças, Uber OS, Cartão, Sócios)
- [ ] [FRONTEND] Criar tipos TypeScript em `src/types/contasPagar.ts`
- [ ] [FRONTEND] Criar parser `src/lib/parsers/contasPagarParser.ts` para processar arquivos `BuscaContasAPagar.xls` com mapeamento das 10 filiais, regras de categoria e extração de Uber OS
- [ ] [FRONTEND] Criar hook `src/hooks/useIntercompanyEntities.ts` para gerenciamento de entidades, sócios e regras de categorias
- [ ] [FRONTEND] Criar hook `src/hooks/useContasAPagarImport.ts` para persistência e consulta analítica das despesas
- [ ] [FRONTEND] Adicionar zona de drop / upload para arquivos de Contas a Pagar no `CentralImportWizard.tsx`
- [ ] [FRONTEND] Criar modal `IntercompanyEntitiesModal.tsx` para cadastro/edição de sócios, contas bancárias e regras
- [ ] [FRONTEND] Atualizar `ContasManualModal.tsx` para permitir visualização analítica por loja, categoria, reclassificação rápida e busca
- [ ] [FRONTEND] Integrar a lógica de cruzamento triangular de aportes/transferências no motor de conciliação autônoma
- [ ] [TEST] Executar teste de parse com o arquivo real `BuscaContasAPagar (1).xls` e validar soma de R$ 195.066,04
- [ ] [TEST] Testar o cenário triangular (Retirada R$ 10k ➔ Aporte R$ 16k ➔ Despesa Delta R$ 6k)
- [ ] [TEST] Executar `npm run build` para garantir zero erros de compilação
