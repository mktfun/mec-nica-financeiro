# Proposal: Fechamento Contábil Estrito 16/09, Gestão Rastreável de Dinheiro em Cofre & Sugestão Inteligente de Contas não-OFX (411)

## Problema
1. **Divergência Contábil no Fechamento sem Manipulação Arbitrária:**
   O usuário precisa que o fechamento de 16/09 (corte das 19h de 15/09) bata utilizando estritamente os 31 arquivos físicos da pasta `C:\Users\admin\Desktop\conciliacao\09-26\16-09` (10 OFX, 10 planilhas de OS, 9 relatórios de Rede e 1 contas a pagar), sem que ninguém precise manipular saldos bancários ou carros em pátio. Todas as vendas da Rede devem permanecer 100% a compensar (pois caem no dia seguinte).
2. **Opacidade e Inflexibilidade na Gestão do Dinheiro em Espécie (`store_cash_vault`):**
   - As 15 OSs com pagamentos em dinheiro vivo totalizam R$ 23.578,50. Atualmente, o usuário não consegue ver de forma clara a fração de onde veio cada valor (qual OS, qual loja, qual cliente, qual data).
   - Não existe interface para registrar saídas/despesas pagas com dinheiro físico direto da loja (ex: compras miúdas, adiantamentos, pagamentos locais com dinheiro do caixa).
   - Quando o usuário alterava as baixas de dinheiro físico, a RPC `get_daily_reconciliation_summary` não atualizava o card na UI porque o snapshot do dia estava travado com `is_closed: true`.
   - Falta de isolamento histórico: uma consulta daqui a uma semana precisa carregar a composição congelada do dia no snapshot sem sofrer interferência de movimentações de outros dias.
3. **Contas a Pagar Pagas em Dinheiro Físico Sem Rastreio Automático:**
   - Muitas despesas da planilha de contas (`BuscaContasAPagar.xls` importadas em `daily_manual_bills`) **não aparecem no extrato bancário (OFX)** porque foram pagas diretamente em dinheiro vivo pelas lojas ou sócios.
   - Hoje o operador precisa adivinhar ou lançar na mão do zero. Não pode ser automático para não causar falsos positivos, mas precisa ser **pré-disponibilizado e recomendado** na tela de dinheiro para que o operador possa dar baixa em 1 clique ou descartar conscientemente.

---

## Solução Proposta (Foco em Reuso e Extensão Cirúrgica)
1. **Reconciliação e Alinhamento Matemático Estrito dos 5 Pilares:**
   - **Bancos (OFX):** Reutilizar a extração direta dos 10 OFX (Positivos: R$ 129.709,49; Negativos: -R$ 23.994,58; Líquido: R$ 105.714,91).
   - **Contas a Pagar:** R$ 40.118,13 (`BuscaContasAPagar.xls`) + R$ 2.332,92 (Juros Rede) = R$ 42.451,05.
   - **Cartões a Compensar:** Manter 100% a compensar das 8 lojas da Rede: R$ 29.198,28 (líquido) e juros de R$ 2.332,92.
   - **Pátio OS:** Pátio físico cru de R$ 66.359,76 somado às 3 OSs manuais legítimas mantidas pelo usuário (Dom Pedro #596: R$ 8.822,46; Rei do Módulo #1856: R$ 4.000,00 e #1818: R$ 4.241,30), totalizando R$ 83.423,57.
   - **Equalização do Caixa Atual:** Saneamento da composição de ativos circulantes do Caixa Atual para que o dinheiro depositado não duplique com o saldo bancário OFX, mantendo apenas o dinheiro físico efetivamente em trânsito no cofre.
2. **Drawer / Modal de Composição do Dinheiro em Cofre (`CashVaultCompositionModal.tsx`):**
   - Integrado ao card "Dinheiro em Lojas / Cofre" no [ResumoDiaPanel.tsx](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/ResumoDiaPanel.tsx).
   - Exibe a lista discriminada de todas as frações de dinheiro vivo:
     - Loja de origem, OS associada, Cliente, Data/Hora de entrada, Valor e Status (`em_transito` vs `depositado`).
   - Botão para **Marcar Depósito**: transfere frações do cofre para o status depositado no banco.
3. **Módulo de Sugestão Inteligente de Saídas em Dinheiro (Contas Sem Débito no OFX):**
   - Na mesma tela/modal do dinheiro, exibe a aba/seção **"💡 Contas a Pagar sem Débito no OFX (Sugestão de Saída em Dinheiro)"**:
     - Varre `daily_manual_bills` da data buscando contas com `match_status = 'unmatched'` (sem saída bancária).
     - Apresenta: Loja, Título / Favorecido, Descrição, Vencimento e Valor da Conta.
     - Botão direto: **"Dar Baixa como Saída em Dinheiro"** (cria a saída no cofre da loja e marca a conta como `paid_cash`).
     - Botão: **"Ignorar / Manter Aberto"** (preserva para outro dia ou descarte manual).
4. **Persistência Imutável no Snapshot Diário (`daily_snapshots.metadata.cash_vault_snapshot`):**
   - Ao salvar ou fechar o dia, grava no JSON de metadados a foto completa do cofre e das contas baixadas em dinheiro daquela data.
   - Ao carregar uma data que já está fechada, a UI e a RPC leem o snapshot congelado daquele dia sem conflitos futuros.
   - Ao trabalhar em um dia em aberto, a RPC calcula de forma dinâmica em tempo real.

---

## Investigação e Análise de Reuso (Tabelas e Componentes Existentes)
- **Tabela Existente Reutilizada:** `public.store_cash_vault` (já possui `store_id`, `amount`, `status`, `entry_date`, `description`, `patio_os_id`).
  - Será estendida com suporte a registro de saídas de despesas (`entry_type: 'entrada' | 'saida'`, `expense_category`, `bill_id`).
- **Tabela Existente Reutilizada:** `public.daily_manual_bills` (já possui `amount`, `category`, `match_status`, `matched_ofx_id`).
  - Será estendida com `matched_cash_vault_id` e status `paid_cash`.
- **RPC Existente Reutilizada:** `public.get_daily_reconciliation_summary` (em `supabase/migrations/`).
  - Ajustada para garantir que o dinheiro em cofre reflita as transações reais da tabela (entradas - saídas em dinheiro) sem travar em snapshots antigos desatualizados quando em edição.
- **Componentes Existentes Reutilizados:**
  - [ResumoDiaPanel.tsx](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/ResumoDiaPanel.tsx): Reaproveitar o card de "Dinheiro em Lojas" para abrir o modal de composição.
  - [useBackendConciliacao.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useBackendConciliacao.ts): Atualizar a consolidação do Pilar 1 e dinheiro em trânsito.
  - [StoreOrdensServicoView.tsx](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/StoreOrdensServicoView.tsx): Manter a exibição das 3 OSs manuais já suportada.

---

## Classificação de Arquivos
- **[MODIFY]** `supabase/migrations/20260916000001_enhance_store_cash_vault_and_rpc.sql` (Adicionar colunas de despesa em dinheiro, vínculo com `daily_manual_bills` e atualizar RPC).
- **[MODIFY]** `src/hooks/useBackendConciliacao.ts` (Sincronização dinâmica de dinheiro em cofre e snapshot imutável).
- **[MODIFY]** `src/components/conciliacao/ResumoDiaPanel.tsx` (Adicionar clique interativo no card de dinheiro para abrir o modal de composição).
- **[NEW]** `src/components/conciliacao/CashVaultCompositionModal.tsx` (Modal de detalhamento fração por fração do dinheiro, sugestão de contas não-OFX e registro de baixa em dinheiro).

---

## Risco Principal e Mitigação
- **Risco:** Baixar uma conta em dinheiro que posteriormente apareça no extrato OFX do dia seguinte.
- **Mitigação:** O operador mantém 100% o controle manual com confirmação explícita. Se necessário, uma baixa em dinheiro pode ser revertida com 1 clique ("Desfazer Baixa em Dinheiro").
