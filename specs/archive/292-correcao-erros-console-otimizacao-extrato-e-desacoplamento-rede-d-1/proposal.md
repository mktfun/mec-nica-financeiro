# Proposal: Desacoplamento Temporal da Rede (D-1 ⇄ D0), Correção de Erros de Console e Blindagem do Motor de Conciliação (292)

## Contexto & Parecer Unânime do Conselho Deliberativo (/council)
Após 3 rounds de deliberação rigorosa entre os especialistas (**Architect**, **Engineer**, **Analyst** e **Contrarian**), o Conselho emitiu veredito **[GO]** para a separação definitiva entre o **Regime de Competência (Vendas de Cartão de Hoje D0)** e o **Regime de Caixa (Depósito Bancário de Vendas Anteriores D-1)**.

---

## Problema
1. **Falha de Acoplamento Intra-Dia no Motor de Maquininhas:**
   - A fórmula legada `nao_entrou = max(0, rede_liquido_D0 - ofx_maquininhas_D0)` subtraía os créditos que caíram no banco hoje (+R$ 5.770,74, referentes a D-1) das vendas da maquininha de hoje (R$ 5.884,95).
   - Isso gerava um falso saldo a compensar de apenas **R$ 114,21** (em vez dos reais R$ 5.884,95), fazendo "sumir" R$ 5.770,74 do Ativo Circulante no Caixa Atual ($G21$) e gerando falsas diferenças residuais.
   - Nas segundas-feiras e pós-feriados, onde o crédito do OFX acumula 3 dias de vendas passadas, a fórmula zerava o Saldo a Compensar de D0, colapsando o painel.
2. **Erros HTTP 400 no Console e Lentidão de Carregamento:**
   - `ai_settings`: Query com `user_id = 'GLOBAL'` gerava erro 400 (UUID inválido no Postgres).
   - `useTransactions`: Sintaxe incorreta do operador `.or()` gerava múltiplos 400 com loops de retry no React Query.
   - RPC `get_daily_reconciliation_summary`: Falta de overload para assinatura de texto causava warnings na auditoria pericial.
3. **Saídas (Débitos) com Botão "Justificar" Indevido:**
   - Débitos bancários estavam exibindo botão de justificativa, permitindo categorizações errôneas de pagamentos como receitas avulsas.
4. **Hardcodes de Filiais no Backend:**
   - A presença de remendos como `s.id NOT IN ('st-01', 'st-05')` violava a universalidade das 10 filiais.

---

## Solução Consensual do Conselho (Council-Backed)

### 1. Arquitetura em Duas Trilhas Desacopladas (Conciliação Tripla)
- **Trilha 1 — Competência / Pátio (Vendas POS em D0):**
  - Vendas em Cartão de Hoje ($D_0$) ⇄ OSs do Pátio ($D_0$).
  - O total líquido da maquininha apurado em $D_0$ (R$ 5.884,95 na Dom Pedro) compõe **integralmente** o Ativo de **Cartões a Compensar** no Pilar 1.
  - **Zero subtração indevida** contra o extrato bancário de hoje.
- **Trilha 2 — Caixa / Bancos (Depósitos OFX em D0):**
  - O crédito de +R$ 5.770,74 no extrato de hoje é reconhecido automaticamente pelo sistema como **`🔵 Lote Rede Liquidado (Ref: D-1)`** (Zero Clicks Default).
  - O valor já compõe o **Saldo Bancário da Conta Corrente** no Pilar 1.
  - **Bloqueio de Vínculo Manual Lote $leftrightarrow$ OSs:** Fica proibido quebrar um depósito líquido de adquirente em dezenas de OSs unitárias (o vínculo com OS continua ativo para transações unitárias como PIX/TED).
  - Se houver divergência no lote (ex: desconto de taxa de conectividade ou aluguel de POS), o operador pode justificar o ajuste na linha da transação.

### 2. Conservação Exata da Massa Financeira ($G21$ Caixa Atual)
$$	ext{Caixa Atual} = 	ext{Saldo Bancos OFX} (+5.770,74) + 	ext{Cartões a Compensar} (+5.884,95) + 	ext{Cofre} + 	ext{MP} + 	ext{A Receber} + 	ext{Pátio OS}$$
- Diferença contábil da conciliação = **R$ 0,00** (Zero Divergência).

### 3. Expurgo Definitivo de Hardcodes & Blindagem de Snapshots
- Remoção total da cláusula `s.id NOT IN ('st-01', 'st-05')`.
- Imutabilidade absoluta do Ramal 1 da RPC para os 5 fechamentos homologados (`is_closed = true`).

### 4. Eliminação de 100% dos Erros 400 & Performance Instantânea
- Blindagem de `useAiSettings.ts` com regex de UUID.
- Query PostgREST otimizada com cache de 5min e zero retries espúrios.
- Badges de status compactados para `h-5 px-2 text-[10px]`.

---

## Contratos de Dados & Backend
- **RPCs Atualizadas:** `get_daily_reconciliation_summary`, `get_store_pos_triple_reconciliation`.
- **Frontend:** `StoreExtratoBancarioView.tsx`, `useTransactions.ts`, `useAiSettings.ts`.

## Risco Principal & Mitigação
- **Risco:** Regressão nos 5 snapshots homologados no banco.
- **Mitigação:** O Ramal 1 da RPC `get_daily_reconciliation_summary` possui guarda imutável (`IF v_is_closed THEN RETURN v_snapshot`), garantindo que nenhuma alteração dinâmica afete os dias já fechados.
