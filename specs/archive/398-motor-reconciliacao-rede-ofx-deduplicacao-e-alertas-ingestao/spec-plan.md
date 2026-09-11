# Spec Plan: Motor de Reconciliação Rede x OFX, Deduplicação e Alertas de Ingestão (398)

## Tasks

- [x] [ETL] Implementar deduplicação de OFX, OS e Rede em `src/lib/parsers/centralImportManager.ts` com alerta de duplicatas
- [x] [ETL] Implementar filtro de descarte automático para arquivos Rede com movimento zero (`totalNet <= 0`)
- [x] [ETL] Implementar scanner de cobertura das 10 lojas ativas identificando extratos OFX e planilhas de OS faltantes
- [x] [ENGINE] Criar módulo `src/lib/matchers/reconciliadorRedeOfx.ts` com a classe canônica `ReconciliadorRedeOFX` (Greedy 1:1, Lote MDR e 3 Vetores de saída)
- [x] [UI] Integrar painel de alertas visuais (duplicados, faltantes, ignorados) em `src/components/importacoes/CentralImportWizard.tsx`
- [x] [UI] Acoplar o motor `ReconciliadorRedeOFX` na etapa de gravação do `CentralImportWizard.tsx` e no `Step4FinalAuditAndClose.tsx`
- [x] [TEST] Executar teste de regressão com dados canônicos de 10/09 garantindo R$ 4.642,10 em `nao_entrou` e build limpo
