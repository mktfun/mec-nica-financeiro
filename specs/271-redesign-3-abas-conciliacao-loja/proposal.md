# Proposal: Redesign e Simplificação em 3 Abas Intuitivas na Conciliação por Loja (Spec 271)

## Problema
A tela de conciliação individual de cada filial (`/conciliacao/$lojaId`) possui 4 abas redundantes, poluídas e confusas:
1. **Aba 1 (OS -> Maquininha) e Aba 2 (Maquininha Líq -> Banco):** Mostram rigorosamente as mesmas transações de cartão com pequenas variações de layout.
2. **Aba 3 (PIX) e Aba 4 (Entradas Avulsas):** Separam de forma artificial os lançamentos bancários, gerando status confusos ("Aguardando extrato" com badge verde "Entrou no banco").
3. **Ausência de Aba de OSs da Loja:** O operador não possui uma tabela clara e editável de todas as Ordens de Serviço daquela loja específica (com total, pago, saldo restante e timeline).

## Solução Proposta: 3 Abas Claras e Diretas
Substituir as 4 abas atuais por **3 visões focadas**:

1. **Aba 1: Cartão / Maquininha (Vendas & Liquidação):**
   * Unifica a conciliação de cartão: Valor Bruto, Taxa MDR, Valor Líquido, OS vinculada e se já foi liquidado no banco Itaú ou se está a compensar.
2. **Aba 2: Extrato Bancário (OFX & PIX / Entradas):**
   * Visão cronológica no padrão de extrato bancário real.
   * Exibe todas as entradas bancárias da filial, identificando com clareza:
     - Lotes de cartão Rede liquidados
     - PIX / Transferências vinculados a OSs (com cliente e placa)
     - Entradas avulsas justificadas (Sucata, Aporte, Rendimento)
     - Lançamentos pendentes (com botões de ação rápida: *Vincular OS* ou *Justificar*).
3. **Aba 3: Ordens de Serviço (OSs & Pátio da Loja):**
   * Tabela dedicada de todas as OSs daquela loja na data.
   * Exibe Total, Pago, Saldo Restante / Pátio, Modalidade de pagamento e Status.
   * Botão `+ Nova OS Manual` para cadastrar ordens ausentes no relatório.
   * Edição inline/modal para atualizar valores e status em tempo real com recálculo sincronizado.

## Contratos de Dados
- **`transactions` & `ofx_transactions`:** Vínculos entre extrato bancário e OSs (`os_number`, `matched_os_number`, `manual_category`, `manual_justification`).
- **`patio_os`:** Consulta canônica de OSs filtradas por `store_id` e data alvo.
- **`pos_transactions`:** Transações de maquininha da loja com `gross_amount`, `fee_amount`, `net_amount` e status de liquidação bancária.

## Features Existentes Impactadas
- `src/routes/conciliacao.$lojaId.tsx` (Roteamento das 3 abas)
- Criação dos 3 componentes modulares:
  - `src/components/conciliacao/StoreCartaoMaquininhaView.tsx`
  - `src/components/conciliacao/StoreExtratoBancarioView.tsx`
  - `src/components/conciliacao/StoreOrdensServicoView.tsx`
- Refatoração / Limpeza de componentes legados redundantes (`OsVsRedeTable`, `RedeVsOfxTable`, `PixVsOfxTable`, `OfxSemMatchTable`).

## Risco Principal
- Manter o comportamento das ações de *Vincular OS* e *Justificar Lançamento* 100% funcional na nova aba de Extrato Bancário sem perder as mutações que já foram salvas.
