# Proposta de Especificação Técnica: Restauração da View de Importação em Tela Cheia & Carga de Marco Zero (Spec 201)

## Contexto e Diagnóstico
A recente unificação dos componentes colocou o fluxo de fechamento e importação diária dentro de um modal flutuante (`ImportConciliacaoModal.tsx`). Isso gerou dois problemas operacionais críticos:
1. **Espaço Visual Confinado e Barras de Rolagem Duplas:** A densidade de dados (tabela de conciliação de OSs órfãs, upload de múltiplos arquivos, mapeamento de filiais e cartões de inputs manuais) ficou comprimida em uma janela modal flutuante, prejudicando a ergonomia e usabilidade.
2. **Omissão da Carga de Marco Zero:** O fluxo de implantação inicial de saldos e OSs legadas (Marco Zero) ficou inacessível na interface principal, impedindo a carga histórica isolada.

## Objetivos da Especificação
1. **Desmontar o Modal Popup e Promover para Full-Page View (`/importacoes`):**
   - Transformar a rota `/importacoes` em uma central de trabalho em tela cheia com abas/modos claros:
     - **Aba 1: Fechamento Diário & Importação Regular** (Layout espaçoso de 2 colunas com Upload/Mapeamento, Inputs Globais do Odômetro/Caixa/Contas e Grid de OSs Órfãs com edição direta e gravação em lote).
     - **Aba 2: Carga de Marco Zero** (Interface integrada do `MarcoZeroWizard` para implantação de saldos e OSs históricas via RPC atômica `process_marco_zero_import`).
     - **Aba 3: Histórico de Lotes & Auditoria** (Histórico de importações, status, desfazer em cascata e limpeza de dados).
2. **Navegação Fluida a partir da Conciliação:**
   - Na página de Conciliação Diária (`/conciliacao`), o botão **"Importar e Fechar Dia"** redirecionará diretamente para `/importacoes?date=YYYY-MM-DD`, carregando a data selecionada automaticamente sem popups flutuantes.
3. **Design System Zinc-950 Dark UI em Tela Cheia:**
   - Aproveitar 100% da largura útil da tela (`max-w-7xl` ou `w-full`), sem janelas sobrepostas e sem rolagem interna truncada.

## Critérios de Sucesso
- [x] Zero modais popups flutuantes para importação e fechamento diário.
- [x] Navegação `/conciliacao` -> `/importacoes` passando a data de fechamento via query param (`?date=`).
- [x] Carga de Marco Zero 100% funcional e acessível via aba dedicada na página `/importacoes`.
- [x] Histórico de Lotes com paginação e exclusão em cascata acessível em aba dedicada.
- [x] `npm run build` aprovado 100% verde.
