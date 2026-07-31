# Spec Plan: Redesign e Correção Lógica das Abas de Conciliação por Loja (conciliacao-tab-redesign)

## Tasks

- [x] [FRONTEND] Atualizar `src/hooks/useConciliacao.ts`:
  - [x] Corrigir cálculo de `delta` na Aba 1 (`osVsRede`) para respeitar o valor real do faturamento em cartão.
  - [x] Adicionar cálculo da nova Aba 3 (`pixVsOfx`) conciliando OSs PIX vs Entradas de PIX no OFX.
  - [x] Atualizar `ofxSemMatch` (Aba 4) para excluir estritamente depósitos da adquirente pareados na Aba 2.
- [x] [FRONTEND] Criar componente `src/components/conciliacao/PixVsOfxTable.tsx`:
  - [x] Tabela limpa de comparação entre PIX do Pátio (OS) e Entradas bancárias de PIX.
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.$lojaId.tsx`:
  - [x] Atualizar navegação de abas para a nova estrutura de 4 abas (`1. Cartão`, `2. Maquininha -> Banco`, `3. PIX (OS -> Banco)`, `4. Banco (Sem Origem)`).
- [x] [TEST] Verificar compilação limpa (`npm run build`).
