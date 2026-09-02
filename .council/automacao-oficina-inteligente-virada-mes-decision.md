# 🏛️ Conselho Deliberativo Técnico: Automação da Ingestão de OSs e Vínculo com PIX/Rede na Virada do Mês

**Data:** 02/09/2026  
**Tema:** Automação da Coleta de OSs do Oficina Inteligente e Vínculo Automático com PIX / Rede na Virada de Mês  
**Status:** CONCLUÍDO (Decisão: **GO — Arquitetura Híbrida 3-Tier: Watchdog Ingestor + Auto-Match Heurístico Temporal + Motor de Transição de Pátio**)

---

## 🎯 Contexto e Dor da Operação

Na virada de mês (dias 1, 2, 3 e até o faturamento de "virada de carro"), há uma defasagem natural no ERP Oficina Inteligente (OI):
1. Dezenas de veículos que entraram no mês anterior (ex: agosto) são finalizados, pagos ou complementados nos primeiros dias do mês seguinte (ex: setembro).
2. O operador precisa acessar loja por loja no Oficina Inteligente, baixar relatórios de conferência manuais e, no sistema financeiro, ficar caçando OS por OS e vinculando manualmente pagamentos de PIX e Cartão REDE.
3. O objetivo é eliminar 100% desse trabalho braçal através de automação inteligente.

---

## 👥 Round 1: Posições das Personas

### 1. O Pragmático (Simplicidade & Entrega Imediata)
> *"Não tente construir uma integração reversa complexa direto no banco do ERP se não temos API pública documentada. A solução de menor atrito e maior robustez é uma **Pasta Monitorada Inteligente (Watchdog Daemon)** + **Motor de Auto-Vínculo Temporal**:*
> - *O usuário (ou um script em background) joga os arquivos de OSs em uma pasta monitorada (ex: `C:\Users\admin\Desktop\conciliacao\auto-import`).*
> - *O sistema processa as 10 lojas em lote instantaneamente (Batch Ingestion) com 0 cliques.*
> - *O motor de matching cruza automaticamente na virada do mês todos os PIX e comprovantes da REDE num intervalo de $\pm 3$ dias com as OSs de pátio abertas, atualizando a forma de pagamento e o status da OS."*

### 2. O Cético (Segurança, Concorrência & Riscos de Regressão)
> *"Cuidado com falsos positivos na virada de mês! Se abrirmos uma janela de match de 5 dias entre agosto e setembro, um PIX de R$ 500,00 de um cliente novo em 01/09 pode casar acidentalmente com uma OS de R$ 500,00 aberta em 25/08 na mesma loja. O motor precisa de **Travas de Precisão Multicritério**:*
> 1. *Match de Nível 1 (100% de Confiança): Número da OS exato no memo do PIX ou autorização da máquina.*
> 2. *Match de Nível 2 (99% de Confiança): Valor exato + CPF/CNPJ ou Nome do Cliente (usando distância de Levenshtein/Jaro-Winkler $\ge 0.85$).*
> 3. *Match de Nível 3 (90% de Confiança): Valor exato + Placa do Veículo na descrição.*
> 4. *Apenas valores órfãos sem nenhum identificador devem solicitar confirmação do operador com 1 clique."*

### 3. O Arquiteto (Padrões, Sustentabilidade & Transição de Pátio)
> *"O verdadeiro problema na virada do mês é a **Transição Contábil de Pátio (Monthly Rollover)**:*
> - *Uma OS aberta em agosto gerou pátio retido em 31/08 (Pilar 4).*
> - *Quando ela é finalizada e paga em 02/09, ela DEVE ser subtraída do Pátio e somada ao Faturamento Realizado do novo mês sem gerar duplicidade.*
> - *Proponho uma RPC dedicada `process_monthly_os_rollover(p_from_date, p_to_date)` que reconcilia a saída do pátio e o faturamento das lojas de forma atômica no banco."*

### 4. O Advogado do Diabo (Abordagem Autônoma de Coleta / Headless Bot)
> *"Por que o operador ainda precisa ir no browser do Oficina Inteligente baixar os 10 arquivos manualmente na virada do mês?*
> - *Podemos fornecer um **Robô Headless em Playwright / Python (`oi-scraper-sidecar`)** que roda via cron / comando único.*
> - *Ele loga no Oficina Inteligente com as credenciais salvas no `.env`, seleciona as 10 filiais, baixa os relatórios de conferência de OSs dos últimos 7 dias e dispara a ingestão direta no Supabase via API.*
> - *Resultado: Zero intervenção humana na virada do mês."*

---

## ⚔️ Round 2: Refutação Cruzada & Trade-offs

- **O Pragmático vs O Advogado do Diabo:**
  - *Debate:* Um crawler headless direto no Oficina Inteligente pode quebrar se o ERP mudar o HTML ou exigir captcha/2FA.
  - *Consenso:* A arquitetura deve ser **Híbrida**: O motor aceita tanto a ingestão via **Robô Crawler Automático** (quando funcional) quanto via **Dropzone / Pasta Monitorada em Lote** (fallback infalível).
- **O Cético vs O Arquiteto:**
  - *Debate:* Como garantir que as 24 OSs de agosto que viraram faturamento em setembro não alterem retroativamente os saldos de agosto?
  - *Consenso:* Cada snapshot diário é **imutável (`is_closed = true`)**. A transição da OS é gravada na data do pagamento/fechamento em setembro, preservando 100% da integridade histórica de agosto.

---

## 📜 Round 3: Síntese e 4 Propostas Estratégicas Recomendadas

Para resolver definitivamente o problema da virada de mês, o Conselho definiu o seguinte plano arquitetural em 4 pilares:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DE AUTOMAÇÃO VIRADA DE MÊS                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  1. INGESTÃO ZERO-TOUCH                                                      │
│     ├── Opção A: Robô Headless Playwright (baixa 10 lojas do OI em 1 comando)│
│     └── Opção B: Multi-Dropzone Lote (arrastar 10 arquivos de uma só vez)    │
│                                                                              │
│  2. MOTOR DE AUTO-MATCH MULTICRITÉRIO (Cross-Month)                          │
│     ├── Janela temporal dinâmica (D-3 a D+3 na virada de mês)                │
│     ├── Match por Nome do Cliente + Valor Exato (Fuzzy matching > 85%)       │
│     └── Match por Placa do Veículo + Loja + Valor                            │
│                                                                              │
│  3. AUTO-UPDATE DE FORMA DE PAGAMENTO EM PATIO_OS                            │
│     ├── Ao casar PIX: incrementa pix_transfer_value e paid_value             │
│     ├── Ao casar REDE: incrementa credit/debit_value e paid_value            │
│     └── Se paid_value >= total_value - 0.05 -> OS vira status 'finalizada'   │
│                                                                              │
│  4. MOTOR DE TRANSIÇÃO DE PÁTIO (Rollover DRE)                               │
│     └── Transição automática de Pátio Antigo -> Faturamento Novo             │
└──────────────────────────────────────────────────────────────────────────────┘
```
