# Proposal — Etapa 7: Estruturação de OS (Pátio, Faturamento & Recebíveis)

## 1. Problema Diagnosticado
O usuário identificou um ponto crucial de estabilização contábil:
1. **Blindagem do Pátio (Carros em Pátio):** O valor canônico apurado no pátio físico para o dia 17/09 é **R$ 74.433,57** (composto exatamente por 35 Ordens de Serviço ativas em `patio_os`: 25 com status `em_aberto` totalizando R$ 43.724,24 e 10 com status `pago_parcial` totalizando R$ 30.709,33). Qualquer tentativa de forçar recálculo raso ou zerar o pátio derruba o Caixa Atual (`R$ 260.542,65`), corrompe o Fluxo de Caixa (`R$ 16.786,98`) e gera uma falsa explosão no Valor Disponível de Contas.
2. **Recebíveis Desestruturados:** A tabela de recebíveis possui pouquíssimas linhas sem vínculo de baixa automática com extrato OFX.
3. **Formas de Pagamento em Texto Solto:** As OSs importadas armazenam as formas de pagamento em string não-estruturada (`"Credito: 980.00; PIX: 1000.00; Dinheiro: 220.00"`), e 34 OSs chegam sem método explícito (R$ 43.724,24), sendo tratadas via regex frágil no navegador.
4. **Faturamento Mensal Fragmentado:** O faturamento mensal depende da soma de fechamentos diários, ficando incompleto quando nem todos os dias estão fechados.

## 2. Solução Proposta
1. **SSOT e Blindagem Incondicional do Pátio (R$ 74.433,57):**
   - Fixar e proteger a fórmula de Pátio no banco (`get_daily_reconciliation_summary`) para ler rigorosamente o passivo de OSs ativas (`status IN ('em_aberto', 'pago_parcial')`), garantindo que o valor de R$ 74.433,57 permaneça estável como pilar do Caixa Atual.
2. **Estruturação de Pagamentos da OS na Ingestão (Backend):**
   - Criar parser e migration que decompõe os pagamentos em colunas normalizadas por natureza: `dinheiro`, `debito`, `credito`, `pix`, `boleto`, `transferencia`, e `saldo_aberto`.
   - Validar invariante contábil: a soma das naturezas deve bater com `valor_pago` da OS.
3. **Automação de Recebíveis (Boletos/Transferências):**
   - Recebíveis futuros (boletos e transferências a compensar) são gerados no banco com data de vencimento calculada e status `pending`, habilitando pareamento automático com créditos do OFX.

## 3. Skills Especializadas Aplicadas
- `database`: Migrações no Supabase, queries indexadas em `patio_os`, constraints de integridade e triggers.
- `backend-patterns`: Normalização defensiva de payloads de importação e validação matemática de somatórios.
- `frontend-design-pro`: Apresentação semântica do card "Na Loja OS (Pátio)" respeitando os tokens do `DESIGN.md`.

## 4. Arquivos Afetados
### Arquivos Existentes Modificados:
- `supabase/migrations/20260917000001_redefine_daily_reconciliation_summary_ssot.sql` (ajuste do filtro de pátio para `em_aberto` e `pago_parcial`)
- `src/hooks/useOsImportProcessor.ts` (padronização de extração e suporte a status estruturados)
- `src/components/importacoes/CentralImportWizard.tsx` (blindagem para não sobrescrever pátio com 0)
- `src/components/conciliacao/ResumoDiaPanel.tsx` (leitura canônica de `total_patio`)

### Arquivos Novos:
- `supabase/migrations/20260917000003_structure_os_payments_and_patio_ssot.sql`

## 5. Plano de Rollback
- A migration adiciona colunas opcionais ou atualiza a view sem dropar tabelas físicas. Caso ocorra divergência, o rollback pode restaurar a versão anterior da RPC `get_daily_reconciliation_summary` via Git revert atômico.

## 6. Risco Principal e Mitigação
- **Risco:** Alguma importação de planilha antiga sobrescrever o passivo de OS de 17/09/2026.
- **Mitigação:** Trava de snapshot imutável para dias fechados: se `is_closed = true`, `total_patio` é lido prioritariamente do snapshot consolidado (R$ 74.433,57).
