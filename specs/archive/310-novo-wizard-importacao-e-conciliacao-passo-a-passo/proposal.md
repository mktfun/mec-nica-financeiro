# Proposal: Novo Wizard Modular de Importação e Conciliação Passo a Passo (310)

## Problema
A esteira de conciliação diária necessita de uma separação estrita entre **Ingestão Global de Dados** (todos os arquivos e inputs juntos) e **Resolução Operacional de Pendências**:
1. **Uploads e Inputs Manuais Juntos na Entrada:** Para o batimento, o sistema precisa ter em memória simultaneamente: extratos OFX das 10 filiais Itaú, relatório de vendas da Rede (`.xlsx`), relatório de OSs do Pátio (`RelatorioOS...`), contas a pagar e inputs manuais (Data Alvo, Odômetro/Faturamento Acumulado e Despesas). Sem todos os arquivos e inputs na base, não há como saber o que casou ou o que ficou sem vínculo.
2. **Transações sem Lançamento de Pagamento na OS:** O veículo está no pátio da loja e a OS existe, mas o gerente da filial não lançou o pagamento na OS. A transação já existe fisicamente no extrato bancário ou no relatório de vendas da Rede, **já contendo seu valor exato e sua forma de pagamento real** (ex: Débito Elo, Crédito Visa, PIX).
   - **Vínculo Direto de 1 Clique:** O operador apenas clica na transação pendente e seleciona a OS correspondente daquela mesma loja. O sistema **herda compulsoriamente e automaticamente o valor e a forma de pagamento que já vieram da transação**, atualiza o `paid_value` da OS, grava o `payment_method` já existente no banco, abate o saldo em aberto do Pátio (`NA LOJA OS`) e concilia na hora, sem exigir que o operador preencha ou selecione nada repetido.
3. **Justificativas de Não-Faturamento (Editáveis e Canceláveis):** Movimentações do extrato que não são serviços de oficina (aportes, transferências entre filiais, estornos, tarifas) com filial de destino e justificativa contábil, com suporte completo para editar ou cancelar antes do envio final.
4. **Conferência de Cofre e Baixa do Daniel:** Pergunta explícita no fluxo: *"O Daniel recolheu dinheiro no cofre de alguma filial hoje para depósito/baixa?"*, permitindo digitar o valor recolhido por filial e dando baixa imediata em `store_cash_vault`.
5. **Configuração de IA:** Modelo oficial padronizado para **`gemini-3.5-flash-lite`**.

## Solução Proposta

### 1. Ingestão Global (Uploads + Inputs Manuais JUNTOS)
- Dropzone conjunto aceitando simultaneamente:
  - Extratos OFX das 10 filiais Itaú.
  - Relatório de Vendas da Rede (`.xlsx`).
  - Relatório de OSs do Pátio (`RelatorioOS...`).
  - Contas a Pagar (`BuscaContasAPagar.xls`).
- Inputs Manuais Iniciais:
  - Seletor de Data Alvo.
  - Odômetro / Faturamento por loja.
  - Despesas extras manuais.
- O sistema processa tudo junto e faz o batimento na memória.

### 2. Wizard de Resolução (4 Passos Focados)
- **Passo 1 — Vínculo Direto de Transações à OS (Herança Automática):**
  - Lista de transações de PIX ou Maquininha que caíram na conta/Rede mas o gerente não lançou na OS.
  - Cada item exibe seu valor e forma de pagamento já detectados da origem (ex: `R$ 350,00 • Crédito Visa`, `R$ 1.000,00 • PIX`).
  - **Ação com 1 Clique ("Vincular a uma OS"):**
    - Abre a lista de OSs no pátio daquela loja (com busca por placa, cliente, carro ou número de OS).
    - O operador apenas clica na OS desejada.
    - O sistema **aplica automaticamente o valor e a forma de pagamento já conhecidos da transação**:
      - Incrementa `paid_value = paid_value + valor_transacao`.
      - Atualiza `payment_method` na OS com a nomenclatura canônica já cadastrada no sistema.
      - Se `paid_value >= total_value`, atualiza o status da OS para `finalizada` (ou `pago_parcial`).
      - Abate o saldo em aberto do Pátio (`NA LOJA OS`) daquela filial.
      - Cria o vínculo em `conciliation_matches` e remove a transação da lista de pendências.
- **Passo 2 — Justificativas de Não-Faturamento por Loja (Editáveis/Canceláveis):**
  - Lista de transações avulsas que não são faturamento (Transferências entre lojas, Aportes, Estornos, Tarifas).
  - Seletor de filial de destino e justificativa contábil.
  - Operador pode editar, alterar categoria ou cancelar a justificativa a qualquer momento.
- **Passo 3 — Cofre & Recolhimento do Daniel:**
  - Pergunta: *"O Daniel recolheu dinheiro no cofre de alguma filial hoje para depósito?"*
  - Se SIM: Exibe os saldos dos 10 cofres com inputs monetários para registrar o valor recolhido por loja e dar baixa automática em `store_cash_vault`.
- **Passo 4 — Auditoria Pré-Fechamento & IA (`gemini-3.5-flash-lite`):**
  - Resumo dos 5 pilares com semáforo de tolerância ($\pm	ext{R\$}~50$).
  - Reconciliador assistido pelo **`gemini-3.5-flash-lite`** para casos residuais complexos.
  - Fechamento definitivo com snapshot imutável (`is_closed = true`).

## Contratos de Dados
- `patio_os`: `paid_value`, `payment_method`, `status`.
- `transactions`: `category`, `notes`, `store_id`.
- `store_cash_vault`: `status = 'depositado'`, `deposited_at = now()`, `notes = 'Recolhimento Daniel'`.
- `conciliation_matches`: vínculo de conciliação entre transação e OS.
- `daily_snapshots`: snapshot blindado do dia.
