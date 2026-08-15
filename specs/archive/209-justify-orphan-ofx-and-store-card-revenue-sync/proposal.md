# Proposal: 209-justify-orphan-ofx-and-store-card-revenue-sync

## 1. Problema Identificado

1. **Faturamento Zerado em Cartão (Aba 1: Cartão OS → Maquininha)**:
   - Na tela interna da filial (`/conciliacao/$lojaId`), o card e a coluna `Faturamento Sistema (OS)` aparecem zerados quando não há pareamento unitário 1:1 com ordens de serviço individuais, ou quando as entradas de maquininha daquela loja no extrato bancário OFX não são consolidadas no faturamento da filial.
   - O faturamento de cartão da loja deve somar tudo que entrou no banco de maquininha do OFX daquela loja (`totalAdquirenteOfx` / `totalRedeNet`) ou as OSs de cartão do sistema, garantindo que o faturamento de cartão da loja reflita o valor real operado.

2. **Entradas Bancárias Sem Origem Gerando Divergência no Fechamento**:
   - No extrato bancário OFX (Aba 4: `Banco Sem Origem`), existem entradas que não são de maquininha nem de OSs padrão (ex: Venda de Sucata, Reembolso Limpa Baú, Aporte, Venda de Juros, Estornos).
   - O usuário não conseguia justificar/classificar essa transação diretamente na tela para que o valor entrasse automaticamente como **Faturamento Outros / Ajustes de Conciliação** (`faturamento_outros_valor`), o que impedia zerar a Diferença Final do dia no painel de conciliação.

---

## 2. Solução Proposta

1. **Consolidação do Faturamento de Cartão da Loja (`useConciliacao.ts` e `OsVsRedeTable.tsx`)**:
   - Em `useReconciliationViews`, calcular o faturamento de cartão da filial somando:
     - 1º: Total de pagamentos em cartão (`credit_value + debit_value`) nas OSs daquela loja em `patio_os`.
     - 2º: Se as OSs não estiverem discriminadas individualmente por cartão, somar todas as entradas bancárias de maquininha do OFX daquela filial (`totalAdquirenteOfx` / `totalRedeBruto`).
   - Distribuir e exibir esse faturamento no card `Faturamento Sistema (OS Cartão)` e na tabela de transações, calculando o `Delta` com precisão.

2. **Fluxo de Justificativa de Transações Órfãs do OFX (`OfxSemMatchTable.tsx`)**:
   - Adicionar botão interativo **"Justificar Entrada"** em cada linha da Aba 4 (Banco Sem Origem).
   - Integrar com o modal existente `OrphanCategorizationModal` permitindo escolher a categoria (ex: `Venda de Sucata`, `Reembolso Limpa Baú`, `Venda de Juros`, `Depósito Avulso`, `Aporte`, `Outros`) e inserir uma justificativa textual.
   - Ao confirmar a justificativa:
     - Grava `manual_category` e `manual_justification` na tabela `transactions`.
     - Atualiza e reflete o valor imediatamente na soma de `faturamento_outros_valor` no snapshot diário (`daily_snapshots`).

3. **Abatimento Automático da Diferença no Painel de Fechamento (`ResumoDiaPanel.tsx` / `useDashboardV2.ts`)**:
   - Somar todas as entradas avulsas justificadas do dia no `faturamento_outros_valor`.
   - O `Faturamento Total do Dia` passa a ser `Faturamento Líquido (Odômetro) + Faturamento Outros (Justificados)`, aumentando o `Valor Disponível Contas` e **zerando a Diferença Final** do dia.

---

## 3. Contratos de Dados

- **Tabela `transactions`**:
  - `manual_category` (`text`): ex: `'venda_sucata'`, `'reembolso_limpa_bau'`, `'venda_juros'`, `'deposito_avulso'`.
  - `manual_justification` (`text`): descrição digitada pelo usuário.
- **Tabela `daily_snapshots`**:
  - `faturamento_outros_valor` (`numeric`): soma de todas as receitas justificadas do dia.
  - `faturamento_outros_desc` (`text`): resumo textual das justificativas aplicadas.

---

## 4. Features Existentes Impactadas
- [`specs/global/features.md`](file:///c:/Users/User/.gemini/antigravity/repos/mec-nica-financeiro/specs/global/features.md) - Módulos de Conciliação Diária, Detalhes de Loja e Snapshot.
