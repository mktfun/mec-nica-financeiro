# Proposal: Gestão de OSs Legadas do Marco Zero (187-gestao-os-legadas)

## Problema
O Marco Zero (importação de saldos iniciais) inseriu diversas OSs no pátio com o status 'em_aberto' retroativas a uma data específica. Atualmente, a interface operacional diária para essa data base exibe componentes que esperam dados dinâmicos de OFX (painéis de conciliação diária), o que confunde o usuário. Além disso, não há um fluxo simples e dedicado para visualizar, auditar e realizar a "baixa" (liquidação) manual em lote ou unitária dessas OSs legadas pendentes sem envolver a importação diária de extratos.

## Solução Proposta
1. **Frontend:** Interceptar a visualização da loja em `/conciliacao/$lojaId` quando a data for originária de um Marco Zero (`isMarcoZero = true`). Nesses dias, a UI padrão de abas (OS vs Rede, etc.) será inteiramente substituída por um componente dedicado: `LegacyOsTable`.
2. **Backend (Supabase):** Criar uma RPC dedicada (`liquidate_legacy_os`) para baixar as OSs pendentes, suportando liquidação em lote (array de IDs) e garantindo que o status mude para 'pago' e o valor pago se equipare ao valor total, abatendo do "Na Loja OS" dinamicamente (pois a View consolidadora já lê `status IN ('em_aberto', 'pago_parcial')`).

## Contratos de Dados
- **Tabela Afetada:** `patio_os`
- **Mutação de Estado (UPDATE):**
  - Mudar `status` de `'em_aberto'` para `'pago'`.
  - Mudar `paid_value` para ser igual a `total_value`.
  - Atualizar `updated_at`.
- Nenhuma nova tabela ou coluna é necessária, o schema já suporta esses estados.

## API / Interface
- **Nova RPC:** `liquidate_legacy_os(p_os_ids uuid[])`
- **Frontend Hook:** Atualização em `useConciliacao.ts` ou novo hook `useLegacyOs` para invocar a RPC.
- **Componente Novo:** `src/components/conciliacao/LegacyOsTable.tsx` que recebe `storeId` e `date`.

## Features Existentes Impactadas
- `src/routes/conciliacao.$lojaId.tsx`: Adicionaremos a verificação de `isMarcoZero` para renderizar o fallback de OS Legada. Isso é seguro, pois atualmente essa página apenas exibe as views vazias na data do Marco Zero.
- Global Math (`calculate_global_conciliation`): Totalmente preservada, pois o backend e o frontend já deduzem do `na_loja` (Pátio Pendente) apenas as OSs com status `em_aberto`.

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Reversível
- **Risco:** O usuário tentar liquidar acidentalmente múltiplas vezes a mesma OS caso haja delay visual.
- **Mitigação:** Optimistic UI local durante a liquidação em lote, `isPending` state bloqueando a tabela, e invalidação rigorosa do query cache (`useQueryClient`) após sucesso da RPC.
