# COUNCIL DEBATE: MÓDULO DE RECEBÍVEIS (PILAR 3) — ROUND 2
**Agente:** Architect (Arquiteto de Sistemas e Soluções)  
**Tópico:** Refutação Obrigatória & Refinamento Estrutural da Spec 284  
**Data:** 25/08/2026  
**Status:** Posicionamento de Rodada 2  

---

## Análise Arquitetural — [Architect]

### Avaliação da Proposta & Reações aos Claims do Round 1

O Round 1 estabeleceu uma base sólida, mas o confronto entre a visão de entrega do **Engineer**, o rigor quantitativo do **Analyst** e as contestações cirúrgicas do **Contrarian** expôs detalhes críticos de implementação que precisavam de formalização arquitetural. Analiso a seguir cada um dos claims levantados pelos pares:

---

#### 1. Reação ao [Contrarian] — Claim 1: "Falta de UNIQUE CONSTRAINT na tabela `receivables` causará duplicações catastróficas ou reabertura indevida em reimportações diárias"
**Postura: (AGREE com Ampliação Arquitetural de Idempotência)**

* **Diagnóstico:** O Contrarian apontou com precisão a maior vulnerabilidade do schema inicial. O processo operacional envolve reimportações periódicas da planilha `CONCILIAÇÃO *.xlsx` (Aba `RECEBIVEIS `). Sem uma restrição de unicidade física no banco, qualquer upload subsequente duplicaria os R$ 11.814,50 ou, pior, um `UPSERT` ingênuo poderia reescrever títulos já liquidados (`status = 'recebido'`) de volta para `pendente`.
* **Solução Arquitetural Mandatória:**
  1. **Índice Único Composto Condicional:**
     ```sql
     CREATE UNIQUE INDEX idx_receivables_natural_key
       ON public.receivables (store_id, description, due_date, round(value, 2))
       WHERE status != 'cancelado';
     ```
  2. **Regra de UPSERT Defensivo e Não-Regressivo:**
     A instrução de carga nunca deve sobrescrever registros liquidados. Se o título já foi marcado como `recebido` no sistema, uma nova importação da planilha Excel apenas atualiza metadados secundários (`os_number`, `installment`), preservando intactos o `status`, `received_at` e `matched_ofx_id`:
     ```sql
     INSERT INTO public.receivables (store_id, store_name, description, os_number, installment, value, due_date, date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendente')
     ON CONFLICT (store_id, description, due_date, round(value, 2)) WHERE status != 'cancelado'
     DO UPDATE SET
       os_number = COALESCE(EXCLUDED.os_number, receivables.os_number),
       installment = COALESCE(EXCLUDED.installment, receivables.installment),
       updated_at = now()
     WHERE receivables.status = 'pendente'; -- Guardrail: jamais regride 'recebido' para 'pendente'
     ```

---

#### 2. Reação ao [Contrarian] — Claim 2: "Armadilha do Status `vencido`: Títulos inadimplentes (ex: Orion OS 22529 R$ 3.464,83 vencida em 24/08) somem do ativo circulante se a query filtrar `status = 'pendente'`"
**Postura: (REFINE — O perigo contábil é real para queries ingênuas, mas a FSM Canônica já neutraliza o problema ao não persistir `vencido` como enum)**

* **Diagnóstico:** O alerta contábil do Contrarian é fundamental: títulos vencidos permanecem como direitos a receber da empresa (Ativo Circulante) até que haja baixa, cancelamento ou provisão de devedores duvidosos (PDD). No entanto, o Contrarian assumiu a hipótese de que o banco conteria uma linha com `status = 'vencido'`.
* **Refinamento Arquitetural:**
  - A Máquina de Estados Finitos (FSM) desenhada no Round 1 estabelece que **`status` persistido no banco possui estritamente 3 valores: `'pendente'`, `'recebido'`, `'cancelado'`**.
  - O conceito de "vencido" é um **estado derivado/computado** em tempo de execução (`due_date < target_date AND status = 'pendente'`).
  - Consequentemente, a query da RPC `get_daily_reconciliation_summary` ao filtrar `status = 'pendente'` captura **automaticamente 100% dos títulos vencidos e a vencer**, somando perfeitamente os R$ 11.814,50 sem nenhuma perda de patrimônio.
  - Para blindar futuras consultas, adicionamos um comentário DDL explícito e uma regra no backend impedindo a criação de status temporal no banco.

---

#### 3. Reação ao [Contrarian] & [Engineer] — Claim 3: "Colisão de Parcelas Gêmeas no Auto-Match Cego (ex: 2 parcelas de R$ 3.464,83 da Orion) e Defesa do Modelo Híbrido Pragmático"
**Postura: (AGREE com Engineer & Contrarian / REBUT do Auto-Match Cego)**

* **Diagnóstico:** O Contrarian demonstrou o caso real em que a Mauá (MHE) possui duas parcelas rigorosamente idênticas da Orion (R$ 3.464,83 em 24/08 e R$ 3.464,83 em 22/09). Um auto-match autônomo sem chave unívoca no extrato bancário (que muitas vezes traz apenas `PIX RECEBIDO` ou `LIQ.COBRANCA`) geraria baixas aleatórias da parcela futura, mantendo a vencida em aberto.
* **Consenso Arquitetural:** O **Modelo Híbrido Pragmático** proposto pelo Engineer é a solução correta.
  - A automação atua como **sistema de recomendação visual** (apontando um chip de sugestão `💡 Crédito OFX detectado: R$ 3.464,83`), mas a liquidação transacional exige a **confirmação humana em 1 clique**.
  - Esse padrão mantém a latência de baixa próxima de zero (conforme meta do Analyst) sem abrir mão do controle determinístico e da auditabilidade.

---

#### 4. Reação ao [Contrarian] — Claim 4: "Ausência de campos de liquidação para tratar desvios: `paid_value`, `discount_value`, `interest_value`"
**Postura: (REFINE com Modelagem de Partidas Dobradas para Divergências)**

* **Diagnóstico:** Pagamentos no mundo real frequentemente divergem do valor de face por descontos comerciais pontuais, tarifas bancárias ou juros de mora. Se um título de R$ 3.464,83 for liquidado por R$ 3.414,83 (com R$ 50,00 de desconto), a falta de colunas dedicadas criaria uma assimetria entre o saldo bancário (Pilar 1) e a baixa de recebíveis (Pilar 3).
* **Solução Arquitetural:**
  - Adição formal ao schema de `receivables`:
    - `paid_value NUMERIC(12,2)` (valor efetivamente creditado no banco)
    - `discount_value NUMERIC(12,2) DEFAULT 0.00` (desconto concedido / despesa comercial)
    - `interest_value NUMERIC(12,2) DEFAULT 0.00` (juros / acréscimos recebidos)
    - `payment_method TEXT` (PIX, TED, Boleto, Cartão, Dinheiro)
  - **Equação de Fechamento da Baixa:**
    $$\text{Valor do Título (Face)} - \text{Desconto} + \text{Juros} = \text{Valor Liquidado (Banco)}$$
    Na RPC de conciliação, a baixa remove o valor integral de face do Pilar 3 e reconhece a diferença em contas de resultado, preservando a identidade patrimonial exata do Fechamento Diário.

---

#### 5. Reação ao [Analyst] — Claim 5: "Sensibilidade $\frac{\partial \text{Diferença}}{\partial \text{Pilar 3}} = \pm 1.0$: Omissão de R$ 11.814,50 estoura em 236x a tolerância de R$ 50,00; Payback em 1,25 meses"
**Postura: (AGREE)**

* **Diagnóstico:** O cálculo matemático do Analyst comprova o risco estrutural de manter a digitação manual cega. Com uma margem de corte estrita de R$ 50,00, a omissão de um único boleto de R$ 300,00 da loja Piraporinha (EMPORIO) reprova o fechamento de todas as 10 lojas simultaneamente.
* **Validação Arquitetural:** A automatização da extração da aba `RECEBIVEIS ` via `recebiveisParser.ts` e sua persistência relacional reduzem o risco de falha operacional a zero e justificam o investimento imediato de engenharia.

---

### Pontos Fortes Arquiteturais

1. **Idempotência Absoluta em Múltiplas Camadas (Defense in Depth):**
   - Camada DDL: `UNIQUE INDEX` condicional em `(store_id, description, due_date, round(value, 2))`.
   - Camada Transacional: `ON CONFLICT DO UPDATE` com predicado de proteção que impede a regressão de títulos com `status = 'recebido'`.
   - Camada de Aplicação: Higienização e deduplicação em memória no `recebiveisParser.ts`.
2. **Separação Rigorosa entre FSM Transacional e Estado Derivado:**
   - Coluna física `status` imune à passagem do tempo (`pendente`, `recebido`, `cancelado`), eliminando dependência de cron jobs noturnos e eliminando a armadilha de sumiço de títulos vencidos.
3. **Isolamento Temporal e Blindagem de Timezone:**
   - Truncamento explícito com `(received_at AT TIME ZONE 'America/Sao_Paulo')::date` em consultas dinâmicas de dias abertos e respeito sagrado à imutabilidade de `daily_snapshots.is_closed = true` em datas históricas.
4. **Ergonomia Operacional Multi-Loja:**
   - Visualização clara em grid de 10 cards por filial (`StoreReceivablesCard.tsx`), modal analítico de conferência (`RecebiveisDetailModal.tsx`) integrado ao `ResumoDiaPanel.tsx` e conciliação assistida sem risco de automação cega.

---

### Riscos Estruturais e Dívida Técnica (Mitigações Consolidadas)

| Risco Estrutural | Severidade | Resolução Arquitetural Consolidada no Round 2 |
| :--- | :---: | :--- |
| **Duplicação por Reimportação Excel** | 🔴 ALTA | `UNIQUE INDEX` condicional + `ON CONFLICT DO UPDATE` com cláusula guardrail `WHERE status = 'pendente'`. |
| **Colisão de Parcelas Gêmeas** | 🔴 ALTA | Rejeição do auto-match cego; adoção do Modelo Híbrido (Sugestão Visual + Baixa Manual em 1 clique). |
| **Divergências na Liquidação (Descontos/Juros)** | 🟠 MÉDIA | Schema expandido com `paid_value`, `discount_value` e `interest_value`, mantendo partidas dobradas. |
| **Distorção de Timezone em Baixas Noturnas** | 🟠 MÉDIA | Conversão explícita para o fuso `'America/Sao_Paulo'` em todas as comparações temporais da RPC. |

---

### Recomendação Final

**Veredicto:** **GO**  
**Confiança:** **0.96** (↑ de 0.95)  
**Justificativa:** A arquitetura do Módulo de Recebíveis (Pilar 3) atinge maturidade técnica plena no Round 2. A incorporação das críticas pertinentes do Contrarian refinou a DDL com índice de unicidade e proteção contra regressão de status em reimportações, adicionou os campos necessários para liquidações com descontos ou juros, e consagrou o Modelo Híbrido Pragmático do Engineer contra falsos positivos de parcelas gêmeas. Aliado ao altíssimo retorno sobre investimento demonstrado pelo Analyst e à blindagem da FSM contra a perda de títulos vencidos, o projeto está 100% pronto para implementação segura e imediata.
