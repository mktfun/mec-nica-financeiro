# Proposal: Correção do Fechamento por Filial e Cálculo de Diferença por Loja (279)

## 1. Problema

No painel de Conciliação Diária (`/conciliacao`), a seção **"Fechamento por Filial"** continua apresentando inconsistências graves no cálculo por loja:

1. **Saldo Total e PIX Zerados ou Inconsistentes por Loja:**
   - Saldo Total e PIX aparecem zerados (`R$ 0,00`) na maioria das lojas, com exceção de lojas isoladas (ex: Jorge Beretta e Kennedy), indicando que a agregação por filial não estava consultando as fontes canônicas de forma homogênea para as 10 contas Itaú.
2. **Maquininha Zerado para 100% das Filiais:**
   - Mesmo havendo vendas de cartões e ordens de serviço em pátio, a métrica de Maquininha (`rede_liquido`) ficava zerada devido a agrupamentos frágeis entre a tabela `stores` e `pos_transactions` (onde 9 lojas usam IDs curtos `st-01` a `st-09` e Mauá usa UUID nativo `3a3dd7ce...`).
3. **Previsto Zerado por Herança:**
   - O "Previsto" de cada filial depende da soma dos recebimentos esperados nos canais eletrônicos (Maquininha + PIX). Com Maquininha e PIX zerados, o Previsto herdava R$ 0,00 em todas as unidades.
4. **Diferença por Filial Zerada (Ocultando o Furo Contábil):**
   - A coluna de **Diferença por filial** vinha zerada em vez de calcular o confronto entre o previsto e o realizado/creditado no banco por loja. Com a diferença zerada por loja, a auditoria perdia a rastreabilidade da divergência global (ex: -R$ 6.417,22), impedindo o gestor de identificar exatamente qual filial está causando a discrepância.

---

## 2. Solução Proposta (Foco em Reuso e Correção)

1. **Revisão Canônica das CTEs da RPC `get_daily_reconciliation_summary` [MODIFY]:**
   - Utilizar CTEs pré-agrupadas por `store_id` (tipo `TEXT`) para evitar produto cartesiano e falhas de casting UUID:
     * `rede_agg`: Agregação de `pos_transactions` (`gross_amount`, `net_amount`, `fee_amount`) filtrada por `target_date = p_target_date`.
     * `ofx_rede_agg`: Créditos de maquininhas no extrato Itaú da respectiva conta em `ofx_transactions`.
     * `pix_agg`: Créditos bancários via PIX na conta de cada loja (`ofx_transactions` onde `type = 'in'` e com identificação de PIX ou OS pareada).
     * `patio_agg`: Ordens de serviço em aberto até a data alvo em `patio_os`.
     * `vault_agg`: Dinheiro no cofre em trânsito por loja em `store_cash_vault`.
     * `recon_latest`: Saldo patrimonial em conta corrente Itaú (`reconciliations.bank_total`).
2. **Cálculo da Diferença e do Previsto por Filial:**
   - Previsão da Loja: $\text{Previsto Loja}_i = \text{Rede Líquido (Maquininha)}_i + \text{PIX}_i$.
   - Realizado da Loja: $\text{Realizado Loja}_i = \text{OFX Maquininhas}_i + \text{PIX}_i$.
   - Diferença da Loja: $\text{Diferença Loja}_i = \text{Realizado Loja}_i - \text{Previsto Loja}_i$.
   - Não Entrou (A Compensar): $\text{Não Entrou}_i = \max(0, \text{Rede Líquido}_i - \text{OFX Maquininhas}_i)$.
   - Se houver divergência de entradas, a coluna `diferenca` evidencia o desvio em reais (positivo ou negativo) com status `'divergence'`.
3. **Compatibilização de Chaves de Lojas (UUID vs IDs Curtos):**
   - Padronização em `TEXT` de todas as operações de junção sobre `store_id`, garantindo que Mauá (`3a3dd7ce...`) e as outras 9 lojas (`st-01` a `st-09`) agreguem com 100% de precisão.
4. **Modularização e Tipagem do Frontend [MODIFY]:**
   - Extração do componente `StoreCardModulo1.tsx` e do container `ConciliacaoLojasView.tsx`.
   - Eliminação de `(rawLog as any)` através da interface canônica `StoreCardData`.
   - Exibição de badges explícitas: `ENTROU`, `A COMPENSAR (+ R$)`, `DIVERGÊNCIA (R$)` e `SEM MOVIMENTO`.
   - Correção da navegação de volta em `conciliacao.$lojaId.tsx` mantendo a data selecionada (`search={{ date: targetDate }}`).

---

## 3. Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Encontradas:**
  - `get_daily_reconciliation_summary`: RPC canônica dos 5 Pilares e detalhe de filiais. Será reaproveitada e aprimorada.
  - `get_store_pos_triple_reconciliation`: RPC de tripla conciliação de maquininhas.
  - `stores`: Tabela cadastral das 10 filiais da holding.
  - `reconciliations`: Tabela de saldos bancários e pátio por filial e por data.
  - `ofx_transactions`, `pos_transactions`, `patio_os`, `store_cash_vault`: Fontes brutas de movimentação diária.
- **Componentes / Hooks Existentes Encontrados:**
  - `src/routes/conciliacao.index.tsx` e `src/routes/conciliacao.$lojaId.tsx`: Páginas de exibição das filiais.
  - `src/hooks/useBackendConciliacao.ts`: Hook de consumo da RPC.

---

## 4. Contratos de Dados & SQL (Supabase)

### Retorno de cada objeto do array `stores` em `get_daily_reconciliation_summary`:
```json
{
  "store_id": "st-01",
  "store_name": "Dom Pedro - DP",
  "saldo_banco": 8046.25,
  "saldo_banco_ofx": 8046.25,
  "saldo_banco_itau": 8046.25,
  "maquininha": 14194.90,
  "rede_bruto": 14500.00,
  "rede_liquido": 14194.90,
  "rede_taxas": 305.10,
  "ofx_maquininhas": 14194.90,
  "nao_entrou_valor": 0.00,
  "pix": 1250.00,
  "pix_os": 1250.00,
  "na_loja_os": 13553.80,
  "previsto_ofx": 15444.90,
  "diferenca": 0.00,
  "status_compensacao": "entrou",
  "status": "approved"
}
```

---

## 5. Risco Principal e Mitigação

- **Risco:** Erro de tipagem de chave estrangeira ao cruzar o UUID de Mauá (`3a3dd7ce...`) com IDs curtos (`st-XX`).
- **Mitigação:** Tratamento uniforme de `store_id` como `TEXT` em todo o pipeline SQL e nos hooks TypeScript.

