# Análise Crítica — [Contrarian]
**Agente:** Contrarian (O Advogado do Diabo Implacável)  
**Tópico:** Módulo de Recebíveis (Pilar 3) — Spec 284 & Fechamento Diário Contábil  
**Data da Análise:** 25/08/2026  
**Veredicto Preliminar:** **NEEDS-REWORK** (Confiança: **0.95**)

---

## 1. Premissas Falsas & Ataque aos 4 Tópicos da Especificação

### 💥 Tópico 1 — Ciclo de Vida e Sinalização no Vencimento (`due_date == today`)
* **A Premissa Falsa:** Assume-se que no dia do vencimento o título "deve ser cobrado/baixado" e que badges pulsantes ou alertas visuais são suficientes para guiar a operação.
* **O Ataque Implacável:**
  1. **Descompasso da Realidade B2B:** Clientes corporativos (ex: Orion, Massimo Pedras, Gestauto, locadoras e seguradoras) raramente liquidam exatamente na data nominal sem D+1/D+2 de compensação bancária ou rotinas próprias de tesouraria.
  2. **Incentivo Perverso à Baixa Cega:** Criar badges de alerta urgentes na tela de recebíveis incentiva o operador a clicar em "Marcar como Recebido" apenas para "limpar a tela", antes mesmo da compensação bancária real constar no extrato. Isso viola o princípio contábil da realização da receita e gera duplicidade de saldo no fechamento patrimonial.
  3. **A Armadilha do Status `vencido`:** Se um título não for pago no dia `due_date`, ele transita para `vencido`. Se a query de consolidação da conciliação (`get_daily_reconciliation_summary`) buscar ingenuamente por `status = 'pendente'`, **todos os títulos vencidos/inadimplentes somem do ativo circulante (Pilar 3) da noite para o dia!** No caso real de 25/08/2026, o boleto Orion OS 22529 1/3 (R$ 3.464,83) venceu em 24/08; se o filtro considerar apenas `pendente`, o total a receber desaba de R$ 11.814,50 para R$ 8.349,67, gerando uma falsa perda de patrimônio de R$ 3.464,83.

---

### 💥 Tópico 2 — Mecânica Contábil da Baixa & A Falácia do "Auto-Match"
* **A Premissa Falsa:** "O sistema cruza o valor do recebível com o extrato bancário OFX do dia. Ao encontrar uma entrada equivalente, dá baixa automática no recebível."
* **O Ataque Implacável:**
  1. **Colisão Fatal de Parcelas de Mesmo Valor:**
     - Observando os dados reais da Mauá (MHE):
       - `BOLETO ORION OS 22529 1/3` -> **R$ 3.464,83** (Vencimento 24/08/2026 - Vencido)
       - `BOLETO ORION OS 22530 2/3` -> **R$ 3.464,83** (Vencimento 22/09/2026 - A Vencer)
     - Se o cliente efetua um pagamento de **R$ 3.464,83** no banco Itaú, com qual critério o auto-match decide qual parcela baixar?
     - Como a descrição bancária típica do Itaú vem como `PIX RECEBIDO` ou `LIQ.COBRANCA SIMPLES` (sem número de OS ou parcela), um auto-match baseado puramente em valor numérico (`amount == 3464.83`) vai selecionar aleatoriamente a primeira linha retornada pelo banco de dados. Se selecionar a parcela 2/3, a parcela 1/3 permanecerá vencida (gerando falsa cobrança indevida ao cliente e auditoria furada).
  2. **Incapacidade de Tratar Pagamentos Agrupados (Lump-Sum):**
     - Se a Orion liquidar os dois boletos vencidos em um único PIX consolidado de **R$ 6.929,66** (ou os 3 boletos totalizando **R$ 10.394,50**), o auto-match unitário falha em 100% dos casos. Os 3 títulos permanecem abertos em Pilar 3 e o crédito no extrato fica sem match em Pilar 1.
  3. **Dupla Contagem Contábil Imediata (Double Counting no Caixa Atual):**
     - A fórmula patrimonial do sistema é:
       $$\text{Caixa Atual} = \text{Saldo Bancos (OFX)} + \text{Dinheiro Cofre} + \text{Cartões} + \text{Dinheiro MP} + \text{A Receber} + \text{Pátio OS}$$
     - Se o crédito de R$ 3.464,83 entra na conta bancária no dia 25/08, o **Saldo Bancos (Pilar 1)** já aumenta em R$ 3.464,83.
     - Se a baixa do boleto no **Pilar 3 (A Receber)** não ocorrer rigorosamente no mesmo milissegundo ou se houver delay operacional, o montante de R$ 3.464,83 constará SIMULTANEAMENTE no Banco e no A Receber. Isso infla artificialmente o `Caixa Atual` em R$ 3.464,83, destruindo o cálculo de `fluxo_caixa`, gerando um falso `valor_disp_contas` e estourando o batimento contábil.

---

### 💥 Tópico 3 — Comportamento Retroativo vs Histórico de Snapshots (`received_at > target_date`)
* **A Premissa Falsa:** "A RPC deve avaliar `status = 'pendente' OR received_at > target_date` para dias anteriores, garantindo que o saldo histórico permaneça intacto."
* **O Ataque Implacável:**
  1. **A Armadilha de Timezone entre PostgreSQL (UTC) e Navegador (Brasília - UTC-3):**
     - `target_date` é do tipo `DATE` (ex: `2026-08-25`).
     - `received_at` é do tipo `TIMESTAMPTZ` (ex: gravado como `2026-08-26 02:00:00+00` quando o operador baixa às 23:00 de Brasília do dia 25/08).
     - No PostgreSQL, a comparação ingênua `received_at > '2026-08-25'::date` converte a data para `'2026-08-25 00:00:00+00'`. Qualquer baixa realizada durante o dia 25/08 (ex: às 14:00 BRT = 17:00 UTC) é estritamente MAIOR que a meia-noite UTC.
     - **Consequência:** Na consulta da conciliação do próprio dia 25/08, o PostgreSQL considerará que o título foi baixado no "futuro" e continuará somando o título em `A Receber` no dia em que ele já foi baixado!
     - É mandatório truncar e converter com fuso explícito: `(received_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date`.
  2. **Violação da Imutabilidade de Fechamentos Homologados (`is_closed = true`):**
     - Em contabilidade formal, fechamentos passados congelados não podem depender de joins dinâmicos em tabelas mutáveis. Se uma conciliação foi fechada e assinada em 24/08 com R$ 11.814,50, ela deve ler ESTRITAMENTE o valor congelado no snapshot físico (`daily_snapshots.a_receber_manual` ou `daily_snapshots.receivables_snapshot`). Permitir recálculo dinâmico em datas fechadas é vulnerabilidade de integridade contábil.

---

### 💥 Tópico 4 — Experiência do Usuário (UX) & Complexidade Desnecessária
* **A Premissa Falsa:** Criar 10 cards em grid com Framer Motion e modais avulsos resolve a conciliação diária de recebíveis.
* **O Ataque Implacável:**
  - O operador não quer navegar por 10 cards isolados e clicar 10 vezes em botões de confirmação.
  - O que a operação necessita é de uma **Mesa de Conciliação Bipartida**: Extrato Bancário OFX de um lado (com entradas não conciliadas) e Recebíveis Pendentes do outro, permitindo associação visual assistida, baixa com 1 clique e conferência imediata do impacto no fechamento diário.

---

## 2. Edge Cases Fatais Identificados

| # | Cenário Crítico (Edge Case) | Por que quebra o sistema atual / Proposta da Spec | Impacto Financeiro / Operacional |
|---|---|---|---|
| **E1** | **Colisão de Parcelas Idênticas** (Ex: Orion 1/3 e 2/3 ambas de R$ 3.464,83) | O auto-match não possui chave discriminadora e baixa a parcela futura em vez da vencida. | Cobrança indevida ao cliente e inadimplência fantasma no sistema. |
| **E2** | **Reimportação da Planilha Excel do Dia Anterior** | A tabela `receivables` da Spec NÃO possui `UNIQUE CONSTRAINT`. Ao reimportar, o parser executa `INSERT` cego, duplicando todos os títulos (R$ 11.814,50 vira R$ 23.629,00) ou reabrindo títulos baixados. | Falsa duplicação do ativo a receber da empresa e estouro do fechamento. |
| **E3** | **Baixa com Desconto Comercial ou Juros de Mora** | Cliente com título de R$ 3.464,83 paga R$ 3.414,83 (com desconto de R$ 50) ou R$ 3.484,83 (com juros de R$ 20). A spec não prevê `discount_amount` nem `interest_amount`. | Divergência de centavos/reais na fórmula patrimonial (`diferenca_final`), reprovando a conciliação (`status = divergent`). |
| **E4** | **Baixa Parcial de Título** | Cliente paga R$ 1.500,00 de uma OS de R$ 3.464,83 e combina pagar o saldo na semana seguinte. O schema não possui status `pago_parcial` nem campo `residual_value`. | Obriga o operador a deletar e recriar títulos manualmente ou adulterar o valor original do boleto, destruindo a trilha de auditoria. |
| **E5** | **Filtro Temporal Excluindo Títulos Vencidos** | Query filtra `WHERE status = 'pendente'`. O título vence e vira `status = 'vencido'`. | Títulos inadimplentes evaporam do cálculo do Pilar 3, gerando redução artificial do patrimônio apurado. |
| **E6** | **Timezone Drift em Fechamentos Noturnos** | Fechamento rodado às 23:30 (horário de Brasília) grava timestamp UTC (`02:30` do dia seguinte). | Baixa cai no dia seguinte, desbalanceando a conciliação do dia corrente. |

---

## 3. O que a Especificação Atual NÃO Resolve / Omissões Graves

1. **Ausência de Chave Natural de Deduplicação na Tabela `receivables`:**
   - A migration proposta na spec (`20260825000003_receivables_schema_and_rpc.sql`) define apenas `id UUID PRIMARY KEY`.
   - **Omissão:** Não existe `UNIQUE CONSTRAINT` ou índice único sobre `(store_id, description, due_date)` ou `(store_id, os_number, installment)`. Sem isso, qualquer upload repetido na Central de Importações ou no modal de recebíveis inserirá linhas duplicadas no banco.

2. **Falta de Estrutura Contábil para Divergências na Liquidação:**
   - A tabela `receivables` não contém:
     - `paid_value NUMERIC(12,2)` (Valor efetivamente liquidado)
     - `discount_value NUMERIC(12,2)` (Descontos concedidos)
     - `interest_value NUMERIC(12,2)` (Juros/multas auferidos)
     - `payment_method TEXT` (PIX, TED, Boleto Itaú, Dinheiro)
     - `settlement_account_id TEXT` (Conta bancária de destino)

3. **Inexistência de Suporte a Relacionamentos N:1 e 1:N no Match com OFX:**
   - O campo `matched_ofx_id UUID` assume uma relação estritamente 1:1.
   - Na prática, 1 transação OFX pode quitar 3 boletos (N:1), ou 1 boleto de alto valor pode ser liquidado em 2 transferências bancárias (1:N). O modelo proposto colapsa nesses cenários.

4. **Tratamento de Cancelamento e Devolução:**
   - A spec não detalha o fluxo de cancelamento de um recebível: se um boleto for cancelado, ele deve estornar a OS vinculada no Pátio (Pilar 4) ou gerar lançamento contábil compensatório?

5. **Regras de Precedência de Snapshot vs Dinâmico na RPC:**
   - A RPC `get_daily_reconciliation_summary` não explicita a regra de fallback: para datas fechadas com snapshot existente, o valor congelado tem prioridade absoluta sobre a soma dinâmica da tabela `receivables`.

---

## 4. Riscos Ocultos & Armadilhas Operacionais

* 🚨 **Risco de Falsa Aprovação de Caixa:** Um falso positivo no auto-match pode baixar um boleto não pago, ocultando uma inadimplência de milhares de reais da diretoria.
* 🚨 **Risco de Bloqueio da Central de Importações:** Se o parser de Excel falhar ao ler formatos heterogêneos de data (ex: strings `'24/08/2026'` vs serial numérico Excel `46258`), a importação centralizada travará por completo.
* 🚨 **Risco de Perda de Dados em Reimportação:** Sem merge defensivo (que preserve registros com `status = 'recebido'`), reimportar a planilha do mês sobrescreverá títulos já pagos de volta para `pendente`.

---

## 5. Recomendação Final

**Veredicto:** ❌ **NEEDS-REWORK**  
**Confiança:** **0.95**  
**Justificativa:**  
A iniciativa de estruturar os recebíveis loja a loja e integrá-los de forma automatizada ao Pilar 3 é essencial para eliminar a digitação manual cega. No entanto, a especificação técnica atual é perigosa e incompleta: a falta de uma chave única de deduplicação provocará duplicações catastróficas em reimportações diárias; o conceito de "auto-match" cego por valor causará baixas equivocadas em parcelas gêmeas (como o caso real da Orion); a comparação temporal sem fuso explícito e a exclusão do status `vencido` corromperão a equação patrimonial; e a ausência de suporte a juros, descontos e liquidações parciais inviabilizará o fechamento diário na operação real. A spec precisa incorporar imediatamente constraints de unicidade, tolerância a divergências na baixa, chave de relacionamento robusta e governança estrita de snapshots antes do início da implementação.
