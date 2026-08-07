# Proposal: CorreçÁo de Foreign Key no Importador e HarmonizaçÁo Visual da ConciliaçÁo (conciliacao-fk-fix-ui-harmony)

## Problema

1. **Erro de FK na ImportaçÁo (`conciliation_matches_ofx_transaction_id_fkey`):**
   - Ao confirmar a importaçÁo na Central de ImportaçÁo ou ao resolver alertas manuais, se o `ofx_transaction_id` for nulo, indefinido ou um ID sintético (ex: `ALERT_178491741`), o Supabase rejeita a operaçÁo com o erro: `foreign key constraint "conciliation_matches_ofx_transaction_id_fkey"`.
2. **Desalinhamento e PoluiçÁo Visual no Painel de ConciliaçÁo (`/conciliacao`):**
   - Foram empilhados dois blocos gigantes (o `ResumoDiaPanel` antigo e o `Modulo1SaldoPanel` novo), poluindo o topo da tela de conciliaçÁo.
   - O usuário deseja que o card de topo substitua perfeitamente a visÁo antiga pelo **Hero Card Consolidado do Módulo 1 (Aba SALDO G13 a G31)** no mesmo layout elegante escuro do sistema.
3. **Falta dos 6 Pilares por Loja na Lista de Fechamento:**
   - Na lista "Fechamento por Loja" da tela principal, os cards de loja nÁo exibiam a régua completa dos 6 pilares do Módulo 1 por unidade.

## SoluçÁo Proposta

1. **CorreçÁo Definitiva da Constraint de Foreign Key (`useConciliacao.ts` & `CentralImportWizard.tsx`):**
   - Em `useResolveUnmatchedAlert`: sanitizar o `txId`. Se nÁo for um UUID de transaçÁo bancária real em `transactions`, atribuir `ofx_transaction_id: null`.
   - Em `CentralImportWizard.tsx`: sanitizar `matchesToInsert` antes do salvamento, garantindo que `ofx_transaction_id` e `rede_transaction_id` pertençam a transações salvas ou sejam `null`.

2. **UnificaçÁo e Redesign do Hero Card Principal (`ResumoDiaPanel.tsx`):**
   - Substituir o antigo `ResumoDiaPanel` e unificar com o Módulo 1 da Aba SALDO em um único **Hero Card Consolidado**:
     - Exibir no topo: Data com navegaçÁo, Seletor de dia, Saldo Banco Itaú, Dinheiro MP (manual), A Receber, Na Loja OS, Saldo Total, Caixa Atual, Disponível Contas e **Resultado Final (G31 Saldo Livre Real)** com destaque visual Teal/Verde.

3. **Novo Card de Loja com os 6 Pilares na Lista (`conciliacao.index.tsx`):**
   - Reformular cada card de loja na lista "Fechamento por Loja" para exibir limpo e alinhado os 6 campos solicitados:
     - **`Banco Itaú`** | **`Dinheiro MP (Manual)`** | **`A Receber`** | **`Na Loja OS`** | **`Saldo Total`** | **`Resultado Final (G31)`**

4. **Alinhamento Visual 100% com o Design System:**
   - Respeitar a estética escura elegante (Zinc-950, `#050711`, `#0F121D`, `border-white/10`, badges arredondados compactos, fontes Inter/Outfit).

## Contratos de Dados
- **Tabela `conciliation_matches`**:
  - `ofx_transaction_id`: aceita `UUID` ou `NULL` quando a resoluçÁo for puramente manual sem vinculo a ID de transaçÁo.
- **Tabela `stores`**:
  - `dinheiro_mp_manual`: mantido e sincronizado no estado.

## Features Existentes Impactadas
- `src/hooks/useConciliacao.ts` (SanitizaçÁo de IDs nas mutations)
- `src/components/importacoes/CentralImportWizard.tsx` (SanitizaçÁo dos matches da importaçÁo)
- `src/components/conciliacao/ResumoDiaPanel.tsx` (Redesign completo para o Módulo 1)
- `src/routes/conciliacao.index.tsx` (HarmonizaçÁo da página e cards de lojas)

## Risco Principal
Garantir que a remoçÁo do bloco duplicado e a substituiçÁo no `ResumoDiaPanel` mantenham 100% dos seletores de data funcionais.
*MitigaçÁo:* Preservar as props de navegaçÁo por data (`onDayChange`, `onDateSelect`, `selectedDate`).
