# Parecer Técnico de Engenharia (The True Council - Round 1)
**Agente:** Engineer (Pragmático / Executor)  
**Tópico:** Audit Forense dos Motores de Match, Diagnóstico do "Entrou vs Não Entrou" (Retroativos/Feriados) e Implementação da Data Prevista de Crédito + Baixa de Lote Automática.

---

## 1. O Que Exatamente Está Quebrado no Código Atual

Uma inspeção cirúrgica no código-fonte do repositório revelou **4 falhas críticas estruturais** que invalidam o fechamento em dias posteriores a finais de semana e feriados (como o caso real de **08/09/2026** pós-feriado da Independência):

### A) Guardrail Cego de Data em autoMatchingEngine.ts (L101-148)
- Nas linhas 101–107 e 146–148: se `targetDate && tx.date && !isSameDate(tx.date, targetDate)`, a transação é descartada. Se rodar na terça (08/09), todas as vendas de sexta (04/09), sábado (05/09) e domingo (06/09) são sumariamente descartadas.
- Nas linhas 261–264, o mesmo filtro rígido é aplicado sobre os PIXs do OFX, impedindo o batimento de PIXs de fim de semana consolidados no primeiro dia útil.

### B) Rede x OFX Inexistente no Motor e Farsa no useConciliacao.ts (L530-604)
- No motor de memória (autoMatchingEngine.ts): Rede x OFX não existe. O motor só cruza Rede x OS e OFX PIX x OS.
- No hook de conciliação (useConciliacao.ts:L530-604):
  `cartao_entrou: cartaoEntrou, cartao_nao_entrou: 0` (hardcoded zero).
  O sistema assume que 100% das vendas da maquininha caíram na conta corrente no mesmo dia.

### C) Colapso do Loop Guloso no SQL
- O SQL antigo tentava somar transações aleatórias dos últimos 3 dias (Subset Sum).
- Na migration mais recente (04/09), o batimento Rede x OFX foi simplesmente omitido em auto_match_daily_transactions.

### D) Assimetria nos Parsers da Rede
- redeSalesParser.ts possui extração de creditDate, mas é usado exclusivamente para auditoria de taxas MDR.
- redeParser.ts ignora data de crédito, lote e prazo, pegando a primeira data que encontra na linha.

---

## 2. Implementação da Ideia 1: Data Prevista de Crédito (D+1 Útil e Feriados)

1. Extrair no redeParser.ts: prazo ('1 dias úteis'), data do crédito / data prevista, lote / resumo de vendas ('76549981'), modalidade.
2. Calendário de Feriados Bancários (ANBIMA/Febraban) para cálculo D+1 útil:
   - Sexta 04/09 -> Sáb 05/09 -> Dom 06/09 -> Seg 07/09 (Feriado) -> Terça 08/09.
   - Sábado 05/09 -> Terça 08/09.
   - Domingo 06/09 -> Terça 08/09.
   Todas as vendas convergem com precisão para 08/09/2026.
3. Mudança na chave do matcher: em vez de `isSameDate(tx.saleDate, targetDate)`, usar `isSameDate(tx.creditDate, targetDate)`.

---

## 3. Implementação da Ideia 2: Baixa de Lote Automática (O(n) Hash Grouping)

1. Agrupar vendas não liquidadas por chave composta: `${storeId}_${creditDate}_${modalidadeCode}` (DB para Débito, AT para Antecipação).
2. Casamento com lançamentos OFX de adquirente por lookup O(1) no mapa de lotes com tolerância <= 0.10.
3. Execução atômica da baixa: atualizar `pos_transactions` com `matched_ofx_id`, `settlement_status = 'entrou'` e `settled_at = now()`.
4. Impacto:
   - `cartao_entrou`: lotes efetivamente identificados e baixados no OFX de hoje.
   - `cartao_nao_entrou`: lotes com `creditDate <= targetDate` sem crédito no extrato (pendência real a cobrar da Rede).
   - `cartao_a_compensar`: vendas com `creditDate > targetDate`.

---

## 4. Correção Prática para o PIX Retroativo de Final de Semana

1. Regex de extração de data do memo do Itaú (`PIX RECEBIDO JOAO SILVA 05/09`).
2. Janela de tolerância temporal D-3 a D+0 para OSs.
3. Blindagem multicritério com tokens do cliente (`matchClientTokens`).
4. Eliminar `osPixList.splice` cego por valor.

---

## 5. Veredito Preliminar e Índice de Confiança

- Veredito: Aprovado com Máxima Prioridade de Execução.
- Confiança: 0.98 (98%)
