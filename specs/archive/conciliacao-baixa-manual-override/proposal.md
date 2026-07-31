# Proposal: Baixa Manual Universal & Forçar Status 'ENTROU' para OSs e Pendências (conciliacao-baixa-manual-override)

## Problema
Durante a primeira importação massiva ou operação diária, muitas OSs e lançamentos bancários/maquininha legítimos podem não ter a correspondência exata das 4 pontas no extrato (ex: pagamento em dinheiro não depositado, extrato de dia anterior ausente, ou relatórios parciais de gestão).
Sem a possibilidade de intervenção humana rápida, essas OSs e lançamentos ficam "travados" como pendentes indefinidamente, poluindo as telas de exceção e distorcendo os saldos calculados na Aba SALDO.

## Solução Proposta

1. **Ação de Baixa Manual Direta em OSs (`patio_os`):**
   - Adicionar botão **"Marcar como ENTROU (Baixa Manual)"** no modal de detalhes da OS (`OsDetailModal.tsx`) e na tabela de OSs (`OsVsRedeTable.tsx`).
   - Ao ser acionado, atualiza a OS no Supabase para `status = 'ENTROU'`, definindo `manually_approved = true` e registrando no histórico da OS.
   - A OS baixa instantaneamente do saldo "NA LOJA (G16)", migrando para o caixa realizado da loja.

2. **Resolução Manual de Alertas e Lançamentos sem Vínculo (`ConciliacaoAlertsSection.tsx` & `RedeVsOfxTable.tsx`):**
   - Adicionar botão **"Baixar / Resolver Manualmente"** nos cards de alertas de "Venda sem Depósito" e "Depósito sem Venda".
   - Salva a resolução na tabela `conciliation_matches` com `match_type = 'MANUAL_OVERRIDE'`, removendo o alerta da tela e aprovando o saldo.

3. **Confirmação Visual e Desfazimento (Desfazer Baixa):**
   - Exibir badge com selo visual verde **"ENTROU (Manual)"**.
   - Permitir que o usuário desfazer a baixa manual ("Reverter para Pendente") se cometer algum engano durante a importação.

## Contratos de Dados
- **Tabela `patio_os`**:
  - `status`: passa para `'ENTROU'`.
  - `history_log`: grava entrada `{ date, action: 'MANUAL_ENTROU', user: 'Gerente' }`.
- **Tabela `conciliation_matches`**:
  - Insert com `store_id`, `system_os_number`, `target_date`, `status = 'APPROVED'`, `match_type = 'MANUAL_OVERRIDE'`.

## API / Hooks Envolvidos
- `useUpdateOsStatus`: mutation para alterar status da OS para `'ENTROU'` ou `'finalizado'`.
- `useResolveUnmatchedAlert`: mutation para salvar resolução manual no Supabase.

## Features Existentes Impactadas
- `src/components/conciliacao/OsDetailModal.tsx` (Inclusão do botão de ação manual)
- `src/components/conciliacao/OsVsRedeTable.tsx` (Inclusão de atalho de baixa por linha)
- `src/components/conciliacao/ConciliacaoAlertsSection.tsx` (Botão de resolver pendência)
- `src/hooks/useConciliacao.ts` (Mutations de atualização e invalidação de cache)

## Risco Principal
Garantir que a baixa manual rescinda imediatamente os alertas e atualize em tempo real a Aba SALDO sem requerer F5 na página.
*Mitigação:* Usar `queryClient.invalidateQueries` para sincronizar os hooks `useReconciliationViews` e `useModulo1StoresData` instantaneamente.
