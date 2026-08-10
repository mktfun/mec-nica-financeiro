# Spec Plan: Painel Detalhado de Fontes de Dados (149-conciliation-details)

## Tasks

- [x] [BACKEND] Criar migration para adicionar RPC `get_raw_os_data(p_store_id uuid, p_date date)` que retorna a lista formatada de OSs e calcula o `remaining_value` (`total_value - paid_value`).
- [x] [BACKEND] Criar migration para adicionar RPC `get_raw_rede_data(p_store_id uuid, p_date date)` que retorna transações de maquininha, efetuando o cálculo da `fee_percentage`.
- [x] [BACKEND] Criar migration para adicionar RPC `get_raw_ofx_data(p_store_id uuid, p_date date)` que retorna JSON contendo o array de transações OFX, o `account_limit` (da tabela stores) e o `previous_balance` (da tabela reconciliations).
- [x] [FRONTEND] Criar hook `useRawImportData` em `src/hooks/useRawImportData.ts` invocando estas 3 novas RPCs.
- [/] [FRONTEND] Criar componente `RawOsTable` em `src/components/conciliacao/RawOsTable.tsx`.
- [/] [FRONTEND] Criar componente `RawRedeTable` em `src/components/conciliacao/RawRedeTable.tsx`.
- [/] [FRONTEND] Criar componente `RawOfxTable` em `src/components/conciliacao/RawOfxTable.tsx`.
- [/] [FRONTEND] Criar componente `ImportSourceBadges` em `src/components/conciliacao/ImportSourceBadges.tsx` que gerencia a exibição dos modais.
- [ ] [FRONTEND] Injetar `<ImportSourceBadges storeId={lojaId} targetDate={targetDate} />` em `src/routes/conciliacao.$lojaId.tsx`.
- [ ] [TEST] Verificar renderização dos modais isolados.
- [ ] [TEST] Garantir que o frontend não contenha cálculos lógicos (como % ou subtração de saldos), apenas formatadores visuais (como máscara de moeda).
