# Proposal: Salvamento Direto e Simples do Marco Zero (184)

## Problema
O assistente `MarcoZeroWizard` extrai corretamente todos os saldos e faturamentos da planilha inicial no preview (ex: Caixa Atual R$ 222.798,65, Faturamento R$ 257.011,03, Fluxo R$ 36.402,91), porém ao clicar em Salvar:
1. Ele não grava esses valores consolidados nas tabelas oficiais de fechamento (`dashboard_daily_logs` e `daily_snapshots`), fazendo com que o Dashboard re-calcule tudo do zero e destrua a implantação.
2. As OSs pendentes extraídas da planilha por loja eram gravadas apenas em `estoque_os_pendente` e não apareciam na página de OSs do Pátio (`patio_os`) da respectiva loja.

## Solução Proposta
1. **Gravacao Direta do Fechamento (`MarcoZeroWizard.tsx`):**
   - Gravar os valores EXATOS do preview diretamente na tabela `daily_snapshots` (`caixa_atual`: 222k, `faturamento`: 257k, `fluxo_caixa`: 36k, `contas_a_pagar`: 12k, `diferenca`: -0.27).
   - Gravar os valores EXATOS diretamente em `dashboard_daily_logs` para que o Dashboard V2 exiba o dia implantado com 100% de fidelidade ao preview, sem recalculá-lo.
2. **Gravação de OSs Pendentes no Pátio por Loja:**
   - Gravar cada OS pendente lida da planilha diretamente na tabela `patio_os` de cada loja vinculada (com `os_number`, `total_value`, `paid_value: 0`, `status: 'em_aberto'`), fazendo com que a página de OSs de cada loja seja devidamente populada e possa ser atualizada em futuras importações ou manualmente.

## Contratos de Dados
- Tabelas afetadas: `daily_snapshots`, `dashboard_daily_logs`, `patio_os`, `reconciliations`.
- Nenhuma alteração de schema.

## API / Interface
- `handleSave` em `src/components/importacoes/MarcoZeroWizard.tsx`

## Features Existentes Impactadas
- Tela de Implantação Marco Zero
- Dashboard V2
- Tela de OSs do Pátio de cada loja

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Reversível
- **Mitigação:** Uso de `upsert` por data e `os_number` para evitar duplicatas ao reimportar.
