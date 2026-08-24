# Proposal: Alinhamento da Conciliação 24/08 com Excel Oficial, Âncora do Dia Anterior (21/08) e Fallbacks (266)

## Problema

1. **Âncora do Dia Anterior Errada:**
   O sistema buscou dados do dia 22/08 (fim de semana sem conciliação) ou usou valor desatualizado para o Caixa Anterior, em vez de ancorar no fechamento oficial da sexta-feira 21/08 (`Caixa Anterior = R$ 150.600,29`, `Faturamento Anterior = R$ 746.804,77`).

2. **Divergências Matemáticas nos Componentes do Dia 24/08 vs `CONCILIAÇÃO 2408.xlsx`:**
   - **Saldo Bancos:** O Excel separa Saldo Positivo (R$ 102.999,61) e Saldo Negativo Itaú (R$ 39.498,51), resultando em Saldo Bancário Líquido de R$ 63.501,10.
   - **Dinheiro MP:** Excel tem **R$ 13.278,00** (sistema tinha 13.425,00).
   - **A Receber:** Excel tem **R$ 10.694,50** (sistema tinha 10.694,00).
   - **Pátio (OS em Aberto):** Excel tem **R$ 88.212,39** (sistema tinha 86.217,06).
   - **Caixa Atual Líquido:** No Excel é **R$ 175.685,99** (`215.184,50 bruto - 39.498,51 negativo Itaú`).
   - **Fluxo de Caixa:** No Excel é `175.685,99 - 150.600,29 = +R$ 25.085,70`.
   - **Faturamento Atual:** `Faturamento OI R$ 70.721,56` (`817.526,33 - 746.804,77`) + `Sucatas R$ 90,00` (`R$ 60 HD + R$ 30 JB`) = **R$ 70.811,56**.
   - **Valor Disponível para Contas:** `70.811,56 - 25.085,70 = R$ 45.725,86`.
   - **Contas a Pagar a Cobrir:** `Contas Efetivas do Dia R$ 29.999,51` + `Pró-labore Daniel R$ 10.070,00` + `Juros da Rede R$ 5.650,15` = **R$ 45.719,66**.
   - **Diferença Final no Excel:** `R$ 45.725,86 - R$ 45.719,66 = +R$ 6,20` (zero / conforme).

## Solução Proposta

1. **Âncora Inteligente de Dia Anterior Útil:**
   - Atualizar a RPC `get_daily_reconciliation_summary` e o hook `usePreviousDaySnapshot` para ignorar dias vazios de fins de semana e buscar o **último dia com snapshot consolidado válido** (`date < target_date` com `caixa_atual > 0` e `faturamento > 0`).
   - Sincronizar o snapshot do dia 21/08 no banco com os valores oficiais (`caixa_atual = 150.600,29`, `faturamento = 746.804,77`).

2. **Atualização Fiel do Snapshot do Dia 24/08 com Base nas Fontes:**
   - Inserir/atualizar o snapshot do dia 24/08 com os valores idênticos ao Excel oficial:
     - `saldo_bancario`: 63.501,10 (Líquido: Positivos 102.999,61 - Negativo Itaú 39.498,51)
     - `saldo_negativo_itau`: 39.498,51
     - `dinheiro_mp`: 13.278,00
     - `a_receber_manual`: 10.694,50
     - `total_patio`: 88.212,39
     - `caixa_atual`: 175.685,99
     - `faturamento`: 817.526,33 (Odômetro Hoje)
     - `faturamento_outros_valor`: 90,00 (Sucata HD R$ 60 + Sucata JB R$ 30)
     - `faturamento_outros_desc`: 'Sucatas HD (R$ 60) + JB (R$ 30)'
     - `contas_a_pagar`: 29.999,51 (Contas operacionais do dia)
     - `juros_rede`: 5.650,15
   - Inserir na tabela `daily_manual_bills` o item `prolabore daniel` com valor exato de **R$ 10.070,00** (como consta no Excel).
   - Inserir na tabela `daily_revenue_adjustments` os 2 itens de sucata: `Sucata HD` (R$ 60,00) e `Sucata JB` (R$ 30,00).

3. **Plano de Fallback para Cada Ponto de Divergência:**
   - **Fallback 1 (Dias Não Trabalhados / Fim de Semana):** Se a conciliação for feita numa segunda-feira, o sistema busca automaticamente a sexta-feira anterior com dados fechados.
   - **Fallback 2 (Saldo Negativo Itaú):** A dedução do saldo negativo é aplicada diretamente na fórmula do Caixa Atual: `Caixa Atual = (Saldo Positivo + Dinheiro + A Receber + Pátio) - Saldo Negativo Itaú`.
   - **Fallback 3 (Contas da Planilha vs Contas Efetivas):** O parser de contas filtra contas pagas/vencidas na data, permitindo ao operador ajustar o corte ou adicionar despesas avulsas com indicação clara.
   - **Fallback 4 (Ajustes de Faturamento - Sucatas / Entradas Avulsas):** Registro nativo em `daily_revenue_adjustments` integrado automaticamente ao cálculo de `faturamento_periodo`.

## Contratos de Dados

### Tabelas:
- `daily_snapshots`: Atualização dos registros de `2026-08-21` e `2026-08-24`.
- `daily_manual_bills`: `title = 'prolabore daniel'`, `amount = 10070.00`, `category = 'Retirada / Sócios'`, `date = '2026-08-24'`.
- `daily_revenue_adjustments`: 
  - `{ title: 'Sucata HD', amount: 60.00, type: 'entrada', date: '2026-08-24' }`
  - `{ title: 'Sucata JB', amount: 30.00, type: 'entrada', date: '2026-08-24' }`

## Features Existentes Impactadas

- `get_daily_reconciliation_summary(p_date)`: Ajuste na busca do snapshot anterior para selecionar o último snapshot consolidado (`caixa_atual > 0`).
- `usePreviousDaySnapshot.ts`: Mesma regra de busca do último snapshot válido.
- `ResumoDiaPanel.tsx`: Exibição da diferença final alinhada com tolerância (+R$ 6,20).

## Risco Principal

Tentativa de conciliar dias de fim de semana gerando snapshots intermediários vazios que quebram o carry-over. Mitigado filtrando apenas dias consolidados com `caixa_atual > 0`.
