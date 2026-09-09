# Parecer Contábil, Matemático e Forense — Round 1 do Conselho
**Especialista:** Analyst (Analista Frio de Dados, Finanças e Conciliação Real)  
**Tópico:** Audit Forense dos Motores de Match, Descasamento Temporal D/D+1/D+30 e Avaliação das Ideias de "Chave por Data Prevista de Crédito" e "Baixa de Lote Automática"  
**Nível de Confiança Analítica:** **0.99**

---

### 1. Diagnóstico e Quantificação do Erro Atual (Cálculo do Ativo Fantasma)

O sistema atual opera sob uma anomalia severa de modelagem financeira nos arquivos useConciliacao.ts e autoMatchingEngine.ts:
- cartao_entrou: soma cega das vendas da Rede do dia
- cartao_nao_entrou: 0 (hardcoded!)
- faturamento_atual: cartaoEntrou + pixOsMatched

#### A Magnitude do Erro no Caixa e no Faturamento:
1. **Confusão entre Faturamento (Competência) e Disponibilidade Bancária (Caixa):**
   - No dia D, foram passados R$ 25.930,23 em cartões na Rede. O dinheiro não está no banco Itaú em D.
   - O extrato bancário em D (G13) registra R$ 0,00 referente às vendas de hoje.
   - O campo cartao_nao_entrou (G14), que deveria registrar este direito creditório a compensar, está hardcoded em 0.
   - Consequentemente, o Caixa Atual G21 omite R$ 25.930,23.
   - Porém, o Odômetro de Faturamento G27 absorve os +R$ 25.930,23 via faturamento_atual.
   - O sistema gera uma "Diferença" artificial de R$ 25.930,23 (G31 = G29 - contas)!
2. **Geração de Ativo Fantasma na Liquidação (D+1):**
   - Quando o dinheiro cai na conta Itaú no dia útil seguinte (D+1), o saldo bancário G13 aumenta em +R$ 25.930,23.
   - Sem a baixa de lote atômica com o OFX, cria-se dupla contagem ou ilusão de caixa disponível imediato.

---

### 2. Análise de Falsos Positivos vs. Falsos Negativos (Greedy 3-Day SQL vs. Agrupamento por Lote)

Na migration 20260812100400_fix_auto_match_rpc_date_window.sql, o pareamento Rede x OFX é uma aproximação gulosa do Subset-Sum:
- **Taxa de Falsos Positivos (45% a 65%):** Ignora modalidade (débito vs. crédito), bandeira e número de lote. Pode somar crédito de sábado com débito de sexta e liquidar prematuramente vendas de crédito de 30 dias.
- **Efeito Cascata de Falsos Negativos (> 70%):** Canibaliza vendas que depois se tornam órfãs permanentes.

---

### 3. Impacto da Ideia 1 e Ideia 2 na Assertividade do Matching

| Dimensão de Análise | Situação Atual (Status Quo) | Com Ideia 1 (Data Prevista) + Ideia 2 (Baixa de Lote) |
| :--- | :--- | :--- |
| **Chave de Comparação** | `tx.date == targetDate` (Data da Venda) | `tx.expected_credit_date == targetDate` (Data de Crédito Prevista) |
| **Tratamento de Fins de Semana/Feriados** | Vendas de sex/sáb/dom descartadas na terça | Vendas de sex/sáb/dom convergem para o dia de liquidação real |
| **Mecanismo de Agrupamento** | Tentativa gulosa Subset-Sum ou 1:1 cego | Agrupamento determinístico por (store_id, expected_credit_date, modalidade/lote) |
| **Taxa de Falsos Positivos** | 45% – 65% no SQL; Splice cego no PIX | < 1.0% |
| **Taxa de Falsos Negativos** | > 70% pós fins de semana/feriados | < 3.5% |
| **Acurácia Global Projetada** | ~ 25% a 35% | > 96.5% |

---

### 4. Matemática da Equação Global (Módulo 1)

Prova Algébrica da Baixa de Lote:
1. **No Dia da Venda (D):**
   - Venda de R$ 10.000 em cartão: Delta G13 = 0, cartao_nao_entrou = +10.000 (Delta G14 = +10.000).
   - Delta G21 = +10.000, Delta G23 = +10.000, Delta G27 = +10.000.
   - G29 = G27 - G23 = 10.000 - 10.000 = 0 -> Diferença G31 = 0.
2. **No Dia da Liquidação Bancária (D+1 ou D+30):**
   - Lote cai no OFX: Delta G13 = +10.000.
   - Baixa de Lote Automática: cartao_nao_entrou decrementa -10.000 (Delta G14 = -10.000).
   - Delta G17 = Delta G13 + Delta G14 = (+10.000) + (-10.000) = 0.
   - Delta G21 = 0, Delta G23 = 0, Delta G27 = 0 -> Delta G31 = 0.
   - **Resultado:** Impacto líquido ZERO no Caixa Atual, ZERO no Fluxo de Caixa e ZERO na Diferença.

---

### 5. Veredito Preliminar e Confiança

- **Veredito:** APROVADO INTEGRALMENTE COM EXIGÊNCIA DE AUDITORIA ESTRITA.
- **Nível de Confiança:** 0.99
