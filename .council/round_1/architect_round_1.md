# PARECER ARQUITETURAL FORENSE (ROUND 1) — THE TRUE COUNCIL
**Papel:** Architect (Arquiteto de Sistemas & Soluções Contábeis/Financeiras)  
**Tópico:** Audit dos Motores de Conciliação Tripla, Clearing House Pattern, Desacoplamento Temporal D/D+1/D+30 e Sanidade Contábil do Módulo 1.

---

## 1. DIAGNÓSTICO ESTRUTURAL DAS ANOMALIAS NO CÓDIGO ATUAL

Após inspeção forense nos fontes do sistema, confirmamos a existência de quatro falhas arquiteturais estruturais que inviabilizam a integridade do fechamento contábil:

1. **Colapso Temporal em [autoMatchingEngine.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/matchers/autoMatchingEngine.ts#L101-L107):**
   A função `isSameDate(tx.date, targetDate)` é aplicada indiscriminadamente na conciliação operacional (**OS x Rede**) e financeira (**OS/PIX x OFX**). 
   - No caso real de 08/09/2026 (terça-feira pós feriado de 7 de setembro), as vendas de cartão passadas na sexta (04/09), sábado (05/09) e domingo (06/09) são **descartadas sumariamente** (`return;` em [L147](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/matchers/autoMatchingEngine.ts#L147)).
   - PIX recebido no sábado (05/09) e consolidado no extrato do Itaú em 08/09 é eliminado do match pelo mesmo guardrail cego ([L262](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/matchers/autoMatchingEngine.ts#L262)).
2. **Algoritmo Guloso Não Determinístico (Mochila Falsa) no SQL:**
   Em [20260821000010_auto_match_pending_os.sql](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260821000010_auto_match_pending_os.sql#L113-L142), a tentativa de casar Rede x OFX consiste em um loop que acumula transações arbitrárias ordenadas por `occurred_at DESC, net_amount DESC` até bater o valor do depósito OFX com tolerância de 5 centavos. 
   - Trata-se de uma heurística gulosa para o problema da soma de subconjuntos (*Subset-Sum*), que agrupa transações desconexas de produtos/bandeiras diferentes e sobrescreve `matched_os_number` com o UUID do OFX ([L127](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260821000010_auto_match_pending_os.sql#L127)), destruindo o vínculo original com a Ordem de Serviço.
3. **Hardcoding e Degeneração Contábil em [useConciliacao.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useConciliacao.ts#L530-L605):**
   `cartao_entrou` é calculado como a soma bruta das vendas da adquirente na data ([L530-L532](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useConciliacao.ts#L530-L532)), enquanto `cartao_nao_entrou` é forçado para `0` ([L604](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useConciliacao.ts#L604)). No pareamento de PIX ([L573-L581](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useConciliacao.ts#L573-L581)), um `findIndex` por valor puro (`Math.abs(osVal - amt) < 0.05`) executa `splice` na lista sem validação de cliente, loja ou documento.
4. **Cegueira de Lote no Parser da Rede:**
   O [redeParser.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/parsers/redeParser.ts#L177-L187) lê o arquivo da Rede ignorando a coluna `lote` (Resumo de Operações / RO, ex: 76549981), ignorando o `prazo` ("1 dias úteis") e extraindo qualquer célula que pareça uma data como se fosse a data da liquidação.

---

## 2. ARQUITETURA DA MÁQUINA DE ESTADOS DE CLEARING (DOMÍNIO FINANCEIRO)

Para eliminar definitivamente o acúmulo de dívida técnica e erros de conciliação, o sistema deve modelar explicitamente o ciclo de compensação bancária (*Clearing & Settlement Pattern*), separando os regimes de **Competência Operacional** e de **Caixa Financeiro**.

### Entidades e Papéis Estruturais:
1. **Título OS (`patio_os`):** Instrumento de cobrança emitido contra o cliente. Rege a **Competência da Receita**. Deve ser baixado/vinculado à transação POS ou PIX baseado no momento do evento e identificadores da transação.
2. **Transação POS (`pos_transactions` - Micro):** Registro individual da captura no terminal (NSU, Autorização, PV, Modalidade, Valor Bruto, Taxa MDR, Valor Líquido Previsto, `occurred_at`).
3. **Lote de Liquidação Adquirente (`pos_settlement_batches` - Meso):** Entidade agregadora gerada pela própria adquirente (Rede). Identificada univocamente por `(acquirer, store_id, terminal_pv, batch_number, brand, modality, expected_credit_date)`.
4. **Depósito OFX (`ofx_transactions` - Macro):** Evento no extrato Itaú. Não contém NSUs individuais; contém o total consolidado daquele Lote (ex: `RECEBIMENTO REDE MAST DB`, `RECEBIMENTO REDE MAST AT`).

---

## 3. AVALIAÇÃO DA IDEIA 1: CHAVE POR DATA PREVISTA DE CRÉDITO

> **Proposta Avaliada:** *O `autoMatchingEngine.ts` deve comparar o depósito bancário contra as vendas cuja data prevista de crédito é hoje (e não a data da venda).*

### Veredito Arquitetural: **PARCIALMENTE SÓLIDA, MAS COM RISCO SE APLICADA SEM DECOUPLING**

A ideia é matematicamente mandatória para a perna financeira (**Rede x OFX**), porém será catastrófica se for aplicada na perna operacional (**OS x Rede**):

1. **O Desacoplamento Obrigatório (Two-Legged Matching):**
   - **Perna 1: Match Operacional (OS x POS):** A chave temporal primária **DEVE SER A DATA DA VENDA** (`occurred_at` / `sale_date`). Uma OS faturada no sábado 05/09 casará com a venda da maquininha passada no sábado 05/09.
   - **Perna 2: Match Financeiro (Lote Rede x Depósito OFX):** A chave temporal primária **DEVE SER A DATA PREVISTA DE CRÉDITO** (`expected_credit_date`). As vendas de débito de 04/09 (sexta), 05/09 (sábado) e 06/09 (domingo) possuem prazo contratual de D+1 útil, portanto todas têm `expected_credit_date = 2026-09-08` (terça-feira, primeiro dia útil após o feriado da Independência).

2. **O Problema do Calendário Bancário (CIP / Bacen / Anbima):**
   - A adquirente não liquida em sábados, domingos e feriados nacionais. Um cálculo ingênuo `data_venda + 1 day` geraria liquidação em 05/09 (sábado) ou 07/09 (feriado).
   - **Solução Arquitetural:**
     - O parser da adquirente ([redeParser.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/parsers/redeParser.ts)) deve extrair a coluna já fornecida no arquivo da Rede: `Data Prevista de Pagamento` / `Prazo` (ex: "1 dias úteis").
     - Implementação de um módulo utilitário de **Calendário de Feriados Bancários Nacionais** (Bacen/CIP) no backend, garantindo que o avanço de D+1 útil salte finais de semana e feriados móveis/fixos.
     - **Janela de Tolerância de Compensação:** Permitir janela de compensação bancária de $[-1, +2]$ dias úteis para cobrir horários de corte (*cut-off time* bancário noturno de 21h45) e atrasos de liquidação interbancária.

---

## 4. AVALIAÇÃO DA IDEIA 2: BAIXA DE LOTE AUTOMÁTICA (COMPOSITE PATTERN)

> **Proposta Avaliada:** *Ao encontrar o depósito no OFX, o sistema baixa as vendas daquele lote, desfazendo a pendência e eliminando qualquer risco de duplicidade ou diferença no fluxo de caixa.*

### Veredito Arquitetural: **EXCELENTE E MANDATÓRIA (ELIMINA O LOOP GULOSO)**

A abordagem atual de tentar encontrar subconjuntos de vendas individuais via loop guloso em SQL é uma falha de design grave. 

1. **Identificador Imutável de Lote:**
   No arquivo de extrato de vendas da Rede, cada transação pertence a um `Resumo de Vendas / Lote` (ex: `76549981`), bandeira e modalidade específica. Ao importar o arquivo da Rede, o sistema cria/atualiza os registros na tabela `pos_settlement_batches`:
   - `id`: UUID
   - `batch_number`: `76549981`
   - `store_id`: ID da filial
   - `modalidade`: 'DEBITO' | 'CREDITO_AVISTA' | 'PARCELADO' | 'ANTECIPACAO'
   - `bandeira`: 'MASTERCARD' | 'VISA' | etc.
   - `expected_credit_date`: `2026-09-08`
   - `total_gross`: R$ 3.500,00
   - `total_net`: R$ 3.447,50
   - `status`: `'PENDING_SETTLEMENT'`
2. **Casamento 1:1 Inequívoco (OFX -> Meso Lote):**
   Quando o OFX traz `RECEBIMENTO REDE MAST DB` no valor de R$ 3.447,50 em 08/09/2026, o matcher busca diretamente:
   `WHERE store_id = S AND expected_credit_date = D AND modalidade = 'DEBITO' AND ABS(total_net - ofx_amount) < 0.05`
3. **Liquidação Atômica em Cascata (ACID Transaction):**
   Ao confirmar o match do Lote:
   - Baixar o Lote (Meso) para 'SETTLED' vinculado ao `ofx_transaction_id`.
   - Baixar em lote todas as Micro-Vendas POS filhas para `settlement_status = 'LIQUIDADO'`.
   Elimina-se a complexidade combinatorial da mochila gulosa. A busca torna-se um lookup direto O(1).

---

## 5. TRATAMENTO DO 'ENTROU VS NÃO ENTROU' NO BALANÇO DIÁRIO (MÓDULO 1)

O erro crônico do Módulo 1 reside na contaminação mútua entre Caixa e Competência em [modulo1Calculations.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/modulo1Calculations.ts#L131-L144):
- O código atual soma `cartao_nao_entrou` diretamente no `dinheiro_mp_g14`.
- Se o dinheiro ainda não caiu na conta corrente do Itaú e `cartao_nao_entrou` está zerado via hardcode, o ativo simplesmente desaparece do saldo da empresa no dia da venda.
- Quando o lote compensa no Itaú na terça-feira (08/09), o valor entra no saldo bancário `g13`, mas o faturamento do dia `g27` refere-se às vendas de terça. O fluxo de caixa `g23` distorce completamente em relação ao faturamento, gerando falsas divergências contábeis no fechamento diário.

### Isolamento Estrutural das Contas Patrimoniais:
1. **Conta 1.1.1 - Disponibilidades Imediatas (Caixa Físico + Banco):**
   - **Saldo Itaú (`g13`):** Lido estritamente do extrato bancário validado (OFX).
   - **Dinheiro em Caixa/Cofre Loja (`g14_dinheiro`):** Físico em espécie contado na gaveta/cofre da loja.
   - *Regra inviolável:* **NUNCA** somar cartão de crédito/débito a receber na rubrica de Dinheiro Físico.
2. **Conta 1.1.2 - Créditos em Trânsito / Adquirentes a Liquidar:**
   - Esta é a definição contábil canônica do `cartao_nao_entrou`:
     `CartaoNaoEntrou(D) = Soma(Vendas POS Capturadas) - Soma(Lotes Liquidados em Banco até D)`
   - Trata-se de um Ativo Circulante Real (direito de crédito contra a adquirente Rede), e não de dinheiro em espécie.
3. **Invariante de Equilíbrio no Fechamento Diário:**
   `Ativo Total(D) = Saldo Itaú(D) + Dinheiro Cofre(D) + Cartão a Liquidar(D) + OS em Carteira(D)`
   Quando o depósito OFX de R$ 3.447,50 cai na conta corrente:
   - Débito em Banco (+R$ 3.447,50 em `g13`).
   - Crédito em Cartão a Liquidar (-R$ 3.447,50 em `cartao_nao_entrou`).
   - O saldo patrimonial da empresa permanece perfeitamente equilibrado, sem criar ativo fantasma e sem gerar falsa variação no fluxo de caixa.

---

## 6. VEREDITO PRELIMINAR E GRAU DE CONFIANÇA

- **Clearing State Machine:** Aprovado
- **Ideia 1 (Chave Data Prevista):** Aprovado com Ressalvas (válido para Rede x OFX; OS x Rede deve manter data da venda; exige Calendário CIP)
- **Ideia 2 (Baixa de Lote Auto):** Aprovado com Louvor (substitui mochila gulosa por Composite Pattern 1:1)
- **Módulo 1 (Entrou vs Não Entrou):** Aprovado (transforma cartao_nao_entrou em conta contábil de Créditos em Trânsito)
- **Decisão:** Aprovado
- **Grau de Confiança:** 0.98
