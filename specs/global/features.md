# Global Features

## Feature 217: Auditoria de MDR e Divergência Contratual Multi-Loja (Rede)
- Cálculo da Taxa Efetiva de MDR: `(1 - (líquido / bruto)) * 100`.
- Comparação contra tabela oficial de contratos (`pos_fee_contracts`) e alerta de divergência contratual.

## Feature 218: Tela Dedicada de Auditoria de Taxas, MDR Diário e por Transação (/taxas)
- Substituição da antiga rota `/alertas` pela nova `/taxas` no menu principal (`Sidebar.tsx` e `BottomNav.tsx`).
- Visão Diária com evolução de faturamento bruto, líquido, retenção em R$ e % média de MDR diária.
- Visão Transacional linha a linha com cálculo de taxas, desvio e prejuízo por venda de cartão.
- Gestão ativa de contratos de taxas (`ContractFeeEditorModal.tsx`) e exportação de planilha CSV de contestação.

## Feature 219: Faturamento Atual com Justificativas e Resolução de Diferenças na Loja
- Renomeação de *Faturamento Líquido* para *Faturamento Atual* e do input manual para *Faturamento Mapa de Metas*.
- Cálculo unificado: `Faturamento Atual = Faturamento Mapa de Metas + Soma(Transações Justificadas)`.
- Abatimento das transações justificadas no Previsto de cada loja em `conciliacao.index.tsx`, zerando a diferença da filial.
- Modal `FaturamentoAtualBreakdownModal.tsx` ao clicar no card de Faturamento Atual para exibir detalhamento linha a linha de cada justificativa.

## Feature 220: Correção de Justificativas no Faturamento e Redesign do Card de Diferença Final
- Correção de schema na busca de transações justificadas (`bank_name`, `counterpart_name` em vez de `title`) e suporte a justificativas por `manual_category`.
- Sincronização da tabela `transactions` no hook `useCategorizeOrphan.ts`.
- Redesign premium e harmonioso do card lateral de *Diferença Final* no `ResumoDiaPanel.tsx` com tipografia ampliada, gradiente suave e badge de tolerância.

## Feature 221: Vínculo Manual de PIX/Banco com OS, Desvinculação e Proteção contra Duplicidade
- Modal `ManualMatchOsModal.tsx` para busca e vínculo direto de qualquer transação bancária/PIX com as Ordens de Serviço da filial.
- Ação de `Desvincular` em `PixVsOfxTable.tsx` para corrigir OSs pagas em dinheiro vinculadas a PIX por engano.
- Regra contábil estrita: transações vinculadas a OS baixam a OS e o extrato bancário sem somar ao Faturamento Atual (evitando duplicar com o Mapa de Metas).
