# Proposal: Baixa Manual Universal & Forçar Status 'ENTROU' para OSs e Pendências (conciliacao-baixa-manual-override)

## Problema
Durante a primeira importaçÁo massiva ou operaçÁo diária, muitas OSs e lançamentos bancários/maquininha legítimos podem nÁo ter a correspondência exata das 4 pontas no extrato (ex: pagamento em dinheiro nÁo depositado, extrato de dia anterior ausente, ou relatórios parciais de gestÁo).
Sem a possibilidade de intervençÁo humana rápida, essas OSs e lançamentos ficam "travados" como pendentes indefinidamente, poluindo as telas de exceçÁo e distorcendo os saldos calculados na Aba SALDO.

## SoluçÁo Proposta

1. **AçÁo de Baixa Manual Direta em OSs (`patio_os`):**
   - Adicionar botÁo **"Marcar como ENTROU (Baixa Manual)"** no modal de detalhes da OS (`OsDetailModal.tsx`) e na tabela de OSs (`OsVsRedeTable.tsx`).
   - Ao ser acionado, atualiza a OS no Supabase para `status = 'ENTROU'`, definindo `manually_approved = true` e registrando no histórico da OS.
   - A OS baixa instantaneamente do saldo "NA LOJA (G16)", migrando para o caixa realizado da loja.

2. **ResoluçÁo Manual de Alertas e Lançamentos sem Vínculo (`ConciliacaoAlertsSection.tsx` & `RedeVsOfxTable.tsx`):**
   - Adicionar botÁo **"Baixar / Resolver Manualmente"** nos cards de alertas de "Venda sem Depósito" e "Depósito sem Venda".
   - Salva a resoluçÁo na tabela `conciliation_matches` com `match_type = 'MANUAL_OVERRIDE'`, removendo o alerta da tela e aprovando o saldo.

3. **ConfirmaçÁo Visual e Desfazimento (Desfazer Baixa):**
   - Exibir badge com selo visual verde **"ENTROU (Manual)"**.
   - Permitir que o usuário desfazer a baixa manual ("Reverter para Pendente") se cometer algum engano durante a importaçÁo.

## Contratos de Dados
- **Tabela `patio_os`**:
  - `status`: passa para `'ENTROU'`.
  - `history_log`: grava entrada `{ date, action: 'MANUAL_ENTROU', user: 'Gerente' }`.
- **Tabela `conciliation_matches`**:
  - Insert com `store_id`, `system_os_number`, `target_date`, `status = 'APPROVED'`, `match_type = 'MANUAL_OVERRIDE'`.

## API / Hooks Envolvidos
- `useUpdateOsStatus`: mutation para alterar status da OS para `'ENTROU'` ou `'finalizado'`.
- `useResolveUnmatchedAlert`: mutation para salvar resoluçÁo manual no Supabase.

## Features Existentes Impactadas
- `src/components/conciliacao/OsDetailModal.tsx` (InclusÁo do botÁo de açÁo manual)
- `src/components/conciliacao/OsVsRedeTable.tsx` (InclusÁo de atalho de baixa por linha)
- `src/components/conciliacao/ConciliacaoAlertsSection.tsx` (BotÁo de resolver pendência)
- `src/hooks/useConciliacao.ts` (Mutations de atualizaçÁo e invalidaçÁo de cache)

## Risco Principal
Garantir que a baixa manual rescinda imediatamente os alertas e atualize em tempo real a Aba SALDO sem requerer F5 na página.
*MitigaçÁo:* Usar `queryClient.invalidateQueries` para sincronizar os hooks `useReconciliationViews` e `useModulo1StoresData` instantaneamente.
