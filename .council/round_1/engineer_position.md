# Engineer Position: Round 1

## 1. Viabilidade Prática e Execução Rápida
Concordo que o modelo atual de tentar casar apenas `OFX.date === OS.date` quebra o fluxo de trabalho real, porque adiantamentos de clientes (sinais via PIX) ocorrem antes do faturamento final da OS.

## 2. Implementação Concreta Sem Super-Engenharia
1. **Idempotência no Importador de Pátio:**
   - Na tabela `estoque_os_pendente` / `patio_os`, manter as colunas `matched_ofx_id` e `status`.
   - Ao executar um novo upload de relatório de pátio, o algoritmo não apaga nem sobrescreve as OSs que já possuem `matched_ofx_id != null`.
2. **Algoritmo de Auto-Match sob Demanda:**
   - Ao importar o extrato OFX do dia, para cada transação de entrada PIX não vinculada:
     - Busca em `estoque_os_pendente` onde `store_id = ofx.store_id`, `matched_ofx_id IS NULL` e `ABS(pix_transfer_value - ofx.amount) < 0.05`.
     - **Regra de Unicidade:** Se houver exatamente **1 OS candidata**, vincula automaticamente (`match_status = 'MATCHED'`).
     - Se houver **mais de 1 OS com o mesmo valor exato** (colisão de valores comuns, ex: R$ 150 ou R$ 500): não força match automático perigoso; marca como `SUGGESTED` para o operador confirmar com 1 clique no modal.

## 3. Veredito Técnico do Engineer
Extremamente simples de implementar. Requer apenas ajustar o hook de importação de pátio para preservar vínculos existentes e a consulta de candidatos para abrir a janela temporal de $\pm 30$ dias.
