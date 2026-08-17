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

## Feature 222: Ajuste da Tabela de Cartão da Maquininha (Bruto, Taxa MDR, Líquido e Bandeira)
- Remoção completa da média artificial (`R$ 2.907,025` / divisão por lote) na coluna de banco.
- Exibição de colunas transparentes e individuais por venda: Bandeira/Modalidade (*Visa, Mastercard, Elo, Hipercard, Amex, PIX*), Bruto, Taxa MDR (-R$ e %), Líquido Creditado, Referência/OS e Status.
- Cards do topo atualizados com Total Bruto, Total Taxas Retidas e Total Líquido a Receber.

## Feature 223: Auditoria de Status de Liquidação Bancária para Cartões e PIX de OS
- Exibição rica dos dados do extrato Itaú (contraparte, banco e valor) para PIXs confirmados.
- Modal `LinkOfxToOsModal.tsx` acionado diretamente pela tabela de PIX para vincular OSs pendentes a depósitos bancários avulsos.
- Status claro de liquidação bancária para lotes de cartões (`Liquidado no Banco` vs `Aguardando Compensação`).

## Feature 224: Conciliação Atemporal e Persistente de PIX (OFX-Centric)
- Inversão da polaridade para modelo *OFX-First Ledger*: fluxo guiado pela entrada real de dinheiro no banco.
- Busca atemporal no pool de OSs abertas do pátio em janela de $\pm 15$ dias.
- Regra de Ouro da Unicidade Estrita: auto-match apenas para valores 1:1 sem ambiguidade; múltiplas OSs com o mesmo valor geram sugestão para confirmação humana com 1 clique.
- Persistência imutável em banco relacional: reimportações diárias de relatórios de pátio não desfazem os vínculos já estabelecidos.

## Feature 225: Justificativa com Controle de Faturamento e Redesign de Vínculo de OS
- Modal `OrphanCategorizationModal.tsx` com opção explícita: "Somar ao Faturamento da Loja" (receitas sem OS) vs "Apenas Conciliar (NÃO Somar)" (Rendimentos, Marco Zero, transferências entre filiais, aportes).
- `useJustifiedTransactions.ts` somando no Faturamento Atual apenas transações justificadas que realmente impactam receita.
- Redesign completo do `ManualMatchOsModal.tsx`: desduplicação estrita de OSs, matches exatos no topo com badge verde luminoso e botão largo de vínculo.
- Reversão e limpeza de justificativas de teste para novos ensaios.

## Feature 226: Correção de Filtro PIX vs Movimentações Bancárias e Sincronização de Diferenças por Loja
- Isolamento estrito de PIX de clientes: termos corporativos e bancários (`SISPAG`, `REND PAGO`, `APLIC AUT`, `TRANSF CC`, `APORTE`, `RESGATE`, `APLICACAO`, `TAR BANCARIA`, `BOLETO`) são proibidos de entrar no pool de PIX de OS e direcionados 100% para a aba de *Entradas Avulsas*.
- Desvinculação no banco de 11 falsos matches automáticos de aportes, transferências de óleo e rendimentos que estavam indevidamente atrelados a OSs.
- Sincronização e abate automático na Diferença da filial no fechamento por loja para todas as entradas justificadas como "Apenas Conciliar (Não Somar)".
- Badge dinâmico de contagem de pendências avulsas na aba 4 da conciliação por loja.


