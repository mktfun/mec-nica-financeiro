# Spec Plan: Refatoração da Conciliação Diária (conciliacao-diaria-refactor)

## Tasks

- [x] [BACKEND] Criar nova migration Supabase (`20260801000000_daily_snapshots_extension.sql`) para adicionar os 5 novos campos manuais à tabela `daily_snapshots`.
- [x] [FRONTEND] Atualizar `DailySnapshotRow` em `src/hooks/useDailySnapshot.ts` com os novos campos.
- [x] [FRONTEND] Modificar `CentralImportWizard.tsx` adicionando uma etapa de formulário (`<form>`) restrita aos 5 inputs manuais (Dinheiro MP, A Receber, Outros Faturamentos, Contas a Pagar, Provisão) antes do `handleConfirm`.
- [x] [FRONTEND] Extrair e processar os totais de "Saldo Negativo Itaú" diretamente do OFX e "Juros" do extrato REDE (se disponível) durante a importação.
- [x] [FRONTEND] Atualizar `src/lib/modulo1Calculations.ts` para baterem exatamente com a regra de negócios, focando em comparar métricas da data de conciliação solicitada com a data da **CONCILIAÇÃO ANTERIOR**.
- [x] [FRONTEND] Alterar `ResumoDiaPanel.tsx` para remover quaisquer inputs, usando a estrutura de UI pedida: os 4 cards top intocados, um card grandão para consolidação e um card lateral verde/vermelho baseado na tolerância de 50 reais.
- [x] [TEST] Verificar cenário 1: Importar planilha passando os inputs, abrir a aba conciliação e garantir leitura correta read-only.
- [x] [TEST] Verificar cenário 2: Calcular a lógica de limite da diferença (+50 e -50) para checar o estilo CSS.
