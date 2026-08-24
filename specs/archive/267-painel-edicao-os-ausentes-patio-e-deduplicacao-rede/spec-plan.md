# Spec Plan: Motor de OSs Ausentes no Pátio, Sincronização Granular de OSs e Deduplicação da Rede (267)

## Tasks

- [x] [BACKEND] Deletar transação duplicada de R$ 2.588,37 em `pos_transactions` para Santo André no dia 24/08 e blindar deduplicação em `useCentralImport.ts`
- [x] [BACKEND] Sincronizar individualmente todas as OSs em `patio_os` com base na aba `OS` do Excel oficial do dia 24/08 (totalizando R$ 88.212,39 exatos com cada OS por loja)
- [x] [FRONTEND] Criar componente `src/components/importacoes/MissingPatioOsEditor.tsx` permitindo visualizar e editar Total, Pago e Status das OSs que não vieram nos arquivos
- [x] [FRONTEND] Integrar `MissingPatioOsEditor` no Step 3 de `src/components/importacoes/CentralImportWizard.tsx` com cálculo de impacto financeiro em tempo real
- [x] [FRONTEND] Conectar a função de persistência das alterações de OSs ausentes ao fluxo de consolidação da importação
- [x] [TEST] Verificar que `get_store_pos_triple_reconciliation('2026-08-24')` retorna Santo André 100% conciliado (`nao_entrou_valor = 0` e `status = 'entrou'`)
- [x] [TEST] Verificar que o total de OSs ativas no banco totaliza exatamente R$ 88.212,39
- [x] [TEST] Executar `npm run build` para garantir zero erros de compilação TypeScript
