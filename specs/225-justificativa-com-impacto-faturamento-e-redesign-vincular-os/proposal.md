# Proposal: Justificativa com Controle de Faturamento e Redesign do Modal de Vincular OS (225)

## Contexto & Necessidade
1. **Controle de Impacto no Faturamento para Justificativas Avulsas:**
   - Durante a importação (especialmente no Marco Zero ou em transações bancárias como rendimentos de aplicação `R$ 0,11`, transferências ou ajustes), o operador precisa justificar a transação para tirá-la da pendência bancária.
   - **Problema:** Nem toda justificativa deve somar no Faturamento Atual da loja. Algumas são apenas conciliações contábeis de saldo (ex: rendimentos, transferências entre filiais, aportes, ajustes de saldo).
   - **Solução:** Adicionar um toggle explícito no modal de justificativa:
     - 🟢 **"Somar ao Faturamento Atual"** (Ex: Venda de sucata, serviço avulso sem OS, receita extra).
     - ⚪ **"Apenas Conciliar (NÃO somar ao faturamento)"** (Ex: Rendimento de aplicação, transferência, ajuste de Marco Zero).
2. **Redesign e Desduplicação do Modal "Vincular Transação à OS":**
   - **Problema:** O modal estava repetindo a mesma OS várias vezes (ex: OS #1818 e #1808 duplicadas em loop), com layout apertado e sem destaque para os matches exatos.
   - **Solução:**
     - Desduplicação estrita por `os_number`.
     - Destaque no topo para **Match Exato de Valor** (com card verde e badge luminoso).
     - Botão de ação largo e claro `[🔗 Vincular a esta OS]`.
     - Ordenação inteligente por proximidade de valor e relevância.
3. **Limpeza/Reset de Justificativas Anteriores:**
   - Reverter as transações justificadas nos testes para que o operador possa testar do zero com o novo fluxo.
