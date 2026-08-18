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

## Feature 227: Métricas do Dashboard e Gráfico de Evolução Macro 100% no PostgreSQL RPC
- Migração completa dos cálculos do Dashboard para a RPC PostgreSQL `get_dashboard_metrics`: zero cálculos no frontend.
- Gráfico de Evolução Macro alimentado pela série cronológica de snapshots fechados do mês (`daily_snapshots`), desenhando as curvas de Saldo, Faturamento e Contas a Pagar.
- Mapeamento normalizado de filiais com saldo bancário real (`R$ 186.496,03`) e pátio (`33 veículos / R$ 92.746,71`).
- Comparação dinâmica de Faturamento Atual vs Anterior ancorada no último fechamento registrado (Marco Zero / Período).

## Feature 228: Redesign do Dashboard com Tabs de Análise por Unidade e Tabela Horizontal
- Card de Análise Setorial por Unidades (`StoreAnalyticsTabs.tsx`) em tela cheia com 3 abas: Saldo Bancário (Itaú), Faturamento (OFX) e Contas (OFX).
- Cada aba com Donut Chart, centro luminoso exibindo Total Líquido, 4 cards de KPIs da dimensão e ranking das 10 unidades com barras de progresso proporcionais.
- Tabela "Resultado por Loja" em layout widescreen espaçoso e horizontal.

## Feature 230: Redesign da Etapa 4 de Importação Central (Orquestração Multi-Agente de IA)
- Remoção dos 4 cards estáticos redundantes e da barra de gradiente pesada no wizard de importação.
- Redesign completo com foco no painel de orquestração multi-agente (`AgentStageItem.tsx`), detalhando os 4 agentes especializados (Car, CreditCard, Landmark, Sparkles) com badges dinâmicos de status, sub-etapas e telemetria.
- Ajuste na RPC do Dashboard para desaninhar corretamente o JSON escalar de `diferenca_final`.

## Feature 231: Diagnóstico de Conciliação e Cartões a Compensar (18/08)
- Mapeamento matemático das regras da planilha de conciliação diária (`CONCILIAÇÃO 1808.xlsx`).
- Dedução automática de pagamentos do dia no cálculo de saldo retido de Carros em Pátio (OSs).
- Isolamento estrito de snapshots diários (`daily_snapshots`) por data no fechamento.

## Feature 232: Whisper Dots e Audit Trail Discreto de Divergências na Conciliação
- Hook de inteligência analítica `useReconciliationInsights.ts` que cruza dados de cartões a compensar, PIX avulsos, OSs do pátio e contas vs saídas OFX.
- Componente `WhisperDot.tsx`: Micro-indicador estático e suave (4px) nos 5 pilares (`Saldo Banco Itaú`, `Dinheiro MP`, `A Receber`, `Na Loja OS`, `Contas (Manual)`) com tooltip nativo descritivo no hover.
- Componente `AuditTrailBar.tsx`: Barra colapsável e elegante abaixo da Consolidação do Dia (`⚙ N observações de conferência · Expandir`), detalhando cada causa raiz e delta financeiro sem poluição visual.

## Feature 233: Gestão de Acessos, Permissões Granulares e Logs Diários
- Gestão completa de usuários em `UserManagementPanel.tsx` e `CreateUserModal.tsx`: cadastro direto de novos acessos com E-mail, Senha e Papéis (`Admin`, `Operador`, `Visualizador`).
- Controle granular de privilégios (`can_import` e `can_edit_data`) com travas em tempo real no botão "Editar Fechamento" da conciliação e no fluxo de importações.
- Visualizador de Logs de Auditoria Diária (`DailyAuditLogsView.tsx`) com seletor de data (`< 18/08/2026 >`), linha do tempo vertical por tipo de ação e visualizador de detalhes técnicos / payload.
- Organização do menu `/configuracoes` em 3 abas intuitivas: *Acessos & Permissões*, *Logs de Auditoria Diária* e *Motor & Lojas*.

## Feature 234: Conciliação Tripla de Maquininhas, Saldo a Compensar e Batimento OFX
- RPCs `get_store_pos_triple_reconciliation` e `get_daily_reconciliation_summary` no Supabase: 100% dos cálculos no backend confrontando o Total Líquido das vendas da Rede contra a soma de todas as bandeiras do OFX (`REDE MAST`, `REDE VISA`, `REDE ELO`, etc.) e OSs com pagamentos em cartão.
- Inclusão automática das vendas de maquininhas pendentes de crédito bancário (`cartoes_a_compensar`) no Saldo do Pilar 1 (`total_saldo_banco = saldo_bancos_ofx + cartoes_a_compensar`) e no Caixa Atual.
- Redesign do Card 1 em `ResumoDiaPanel.tsx` com sub-linhas transparentes (`OFX: R$ ...` | `+ Maq: R$ ...`) no padrão visual do card de Contas.
- Modal `MaquininhasDetailModal.tsx` com visão widescreen dos 4 KPIs globais e tabela detalhada das 10 lojas com status de compensação (`ENTROU`, `PARCIAL`, `NÃO ENTROU`).

## Feature 235: Exibição e Soma de Maquininhas Não Entradas por Loja e no Consolidador Geral
- Enriquecimento da lista `stores` da RPC `get_daily_reconciliation_summary` com `saldo_banco_ofx`, `nao_entrou_valor`, `saldo_banco` (Consolidado: $\text{OFX} + \text{Não Entrou}$) e `status_compensacao` por filial.
- Atualização do card de cada uma das 10 filiais em `conciliacao.index.tsx`: exibição do Saldo Consolidado, sub-linhas (`OFX: R$ ...` | `+ Maq: + R$ ...`) e badge no cabeçalho da loja (`ENTROU` / `NÃO ENTROU (+ R$ ...)`).
- Header de `conciliacao.$lojaId.tsx` com painel de 4 métricas da maquininha da loja (Vendas Líquido, Creditado no OFX, A Compensar e Status de Compensação).







