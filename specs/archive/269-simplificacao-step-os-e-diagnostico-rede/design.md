# Design: Simplificação do Card de OSs Ausentes no Wizard e Diagnóstico de Juros/Compensação Rede (269)

## Arquitetura Técnica & Fluxo de UI
1. **Wizard de Importação (Step 3):**
   - O usuário importa os arquivos de pátio (Excel).
   - O wizard carrega as OSs abertas do banco e calcula o `missingOsList` (as OSs que estavam em aberto no sistema, mas não constam nos arquivos de hoje).
   - A Step 3 renderiza **exclusivamente o componente `<MissingPatioOsEditor />`**, com visual Dark Premium (Zinc-900), indicadores de status, badge de impacto e edição inline de Total, Pago e Status.
   - O bloco de código redundante `<div className="p-6 bg-[var(--bg-canvas)] ...">{/* Tabela Unificada de Ordens de Serviço */}</div>` é completamente removido.

## Componentes / Arquivos Tocados
- `src/components/importacoes/CentralImportWizard.tsx`:
  - Remover a renderização da tabela redundante `allPreviewOsList`.
  - Manter o card dos 3 KPIs do topo (Total OS, Maquininha, Saldo Bancário).
  - Manter o card central único com `<MissingPatioOsEditor />`.
  - Remover estados e variáveis auxiliares não utilizados decorrentes da remoção da tabela redundante (`osSearchQuery`, `osStoreFilter`, `osStatusFilter`, `osTabFilter`, `osPage`, `osCounts`).

## Cenários de Verificação
- **Cenário 1 (Visual Step 3):** Ao avançar para a Step 3 após o upload dos arquivos, a tela exibe apenas os 3 KPIs resumidos e o card único `<MissingPatioOsEditor>`, sem duplicar listas de OSs nem exibir tabelas desnecessárias com centenas de linhas.
- **Cenário 2 (Persistência):** As edições realizadas no `MissingPatioOsEditor` continuam sendo salvas normalmente no banco de dados e refletindo no cálculo do `caixa_atual` e `total_patio`.
- **Cenário 3 (Build Clean):** `npm run build` executa com sucesso sem warnings de variáveis não utilizadas ou erros de TypeScript.
