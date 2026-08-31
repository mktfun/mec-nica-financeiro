# Proposal: Correção do Saldo de Pátio OS por Filial, Sincronização de Totais e Baixa Granular de Dinheiro por OS (318)

## Problema
1. **Divergência entre 'Valor Total' e 'Saldo no Pátio' & Inconsistência no Card da Filial:**
   - Na tela de conciliação por filial (`/conciliacao/$lojaId`), o card superior "NA LOJA OS" exibe R$ 7.938,92 enquanto a aba "3. Ordens de Serviço (OS & Pátio)" calcula R$ 15.488,57.
   - O formulário de inserção manual de OS (`handleCreateManualOs`) insere a OS em `patio_os`, mas não sincroniza a tabela `reconciliations.na_loja_os` e `daily_snapshots.total_patio`.
   - Nas RPCs `get_daily_reconciliation_summary` e `calculate_daily_conciliation`, a leitura de `na_loja_os` em dias abertos priorizava snapshots estáticos de `reconciliations` em vez de apurar a soma canônica em tempo real da tabela `patio_os` (`GREATEST(0, total_value - paid_value)`).
2. **Baixa em Dinheiro no Cofre sem Granularidade por OS:**
   - O botão "Dar Baixa" no modal de raio-x bancário (`SaldoBancosDetailModal.tsx`) executava uma baixa cega e total no montante consolidado do cofre da loja, sem permitir ao operador selecionar quais OSs específicas pagas em dinheiro foram recolhidas e depositadas, nem efetuar baixas parciais.
3. **Auditoria de Saldo Negativo (Cheque Especial):**
   - Garantir que a segregação de saldo credor disponível (+R$ 203.755,46) vs cheque especial (-R$ 30.628,21) mantenha o Caixa Atual blindado sem dupla dedução.

## Solução Proposta (Foco em Reuso e Correção)
1. **[MODIFY] RPCs SQL Canônicas (`get_daily_reconciliation_summary` e `calculate_daily_conciliation`):**
   - Unificar a apuração de `na_loja_os` lendo diretamente a soma ativa de `patio_os` (`opened_at <= target_date`, `status NOT IN ('finalizada', 'cancelada')`, `saldo > 0.05`) para o cômputo global e para cada uma das 10 filiais em dias abertos.
   - Criar RPC `dar_baixa_dinheiro` para registrar a baixa unitária de registros em `store_cash_vault` com vínculo de OS e histórico em `patio_os`.
2. **[MODIFY] `StoreOrdensServicoView.tsx` & `PatioOsDetailModal.tsx`:**
   - Corrigir o formulário de Nova OS Manual adicionando cálculo reativo de Saldo Restante (`total - paid`) e auto-sugestão de status (`pago_parcial` ou `finalizado`).
   - Propagar a sincronização atômica para `reconciliations` e `daily_snapshots` imediatamente após a inserção de nova OS manual.
3. **[MODIFY] `BaixaDinheiroModal.tsx` & `SaldoBancosDetailModal.tsx`:**
   - Transformar o botão "Dar Baixa" em acionador do modal `BaixaDinheiroModal`.
   - Exibir lista das OSs com recebimento em espécie no cofre daquela filial, permitindo selecionar quais OSs depositar, informar valor parcial e registrar comprovante/observações.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Encontradas:**
  - `patio_os`: Tabela canônica de ordens de serviço. Mantém `total_value`, `paid_value` e breakdown. Será reutilizada adicionando `matched_ofx_id`.
  - `store_cash_vault`: Tabela de controle de custódia de dinheiro em espécie em trânsito/cofre. Será reutilizada adicionando `patio_os_id` e `matched_ofx_id`.
  - `reconciliations`: Tabela de fechamento diário por filial.
  - `get_daily_reconciliation_summary` e `calculate_daily_conciliation`: RPCs existentes que serão ajustadas para priorizar `patio_os` dinâmico.
- **Componentes / Hooks Existentes Encontrados:**
  - `StoreOrdensServicoView.tsx`: Grid de OSs da filial, será ajustado com reatividade de saldo e sync.
  - `SaldoBancosDetailModal.tsx`: Tabela de 10 bancos e cofre, será integrada ao `BaixaDinheiroModal`.
  - `BaixaDinheiroModal.tsx`: Já existe em `src/components/conciliacao/` e será remodelado em Dark UI com seleção por OS.

## Contratos de Dados & SQL (Supabase)

```sql
-- Extensão da tabela store_cash_vault
ALTER TABLE public.store_cash_vault
ADD COLUMN IF NOT EXISTS patio_os_id UUID REFERENCES public.patio_os(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS matched_ofx_id UUID REFERENCES public.ofx_transactions(id) ON DELETE SET NULL;

-- RPC para baixa granular de dinheiro no cofre
CREATE OR REPLACE FUNCTION public.dar_baixa_dinheiro(
    p_vault_id UUID DEFAULT NULL,
    p_os_number TEXT DEFAULT NULL,
    p_store_id TEXT DEFAULT NULL,
    p_deposit_date DATE DEFAULT CURRENT_DATE,
    p_ofx_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS jsonb;
```

## API & Componentes (Frontend)
- `StoreOrdensServicoView.tsx` `[MODIFY]`
- `PatioOsDetailModal.tsx` `[MODIFY]`
- `SaldoBancosDetailModal.tsx` `[MODIFY]`
- `BaixaDinheiroModal.tsx` `[MODIFY]`
- `conciliacao.$lojaId.tsx` `[MODIFY]`

## Risco Principal e Mitigação
- **Risco:** Uma baixa de dinheiro no cofre ser contabilizada em duplicidade quando o crédito bancário correspondente for importado no OFX.
- **Mitigação:** Ao marcar `store_cash_vault.status = 'depositado'`, o valor é deduzido do cofre no momento do depósito e registrado com `deposited_at`, garantindo que o extrato bancário assuma a custódia sem dupla contagem patrimonial e sem alterar o histórico de dias anteriores.
