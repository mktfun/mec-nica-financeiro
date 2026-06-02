# Design: Dashboard Gerencial de Lojas (014)

## Componentes Afetados

1. **`src/routes/loja.$lojaId.tsx`**
   - **Remodelagem do Grid Superior:** O grid superior (atualmente 1/3 vs 2/3) será repensado para incluir um novo conjunto de "Cards de Resumo".
   - **Novos Cards (Métricas Básicas):**
     - Card 1: **Saldo Banco Itaú** (R$ 0,00 ou mock) + Badge Negativo/Positivo.
     - Card 2: **Limite da Conta** (R$ 0,00 ou mock).
     - Card 3: **Faturamento Atual** (Somatório ou mockado caso não exista no DB ainda).
     - Card 4: **Fluxo de Caixa** (Faturamento - Contas).
     - Card 5: **Valor das Contas**.
   - **Extrato Bancário Timeline (Já Existente):**
     - Continuará exibindo o Extrato (Lançamentos), mas visualmente separado do bloco gerencial.
   
## Mapa de Dependências
- **React Components:** Depende do `<Card>`, `<AnimatedNumber>`, `<Badge>` e ícones como `Landmark` (banco), `TrendingUp` (faturamento), `TrendingDown` (contas).
- **Dados / Supabase:** Inicialmente a interface usará os dados extraídos das OSs (para faturamento e fluxo) onde possível, e constantes/mocks visuais com "R$ 0,00" ou badges indicativos (`Ex: "Saldo Integrado em breve"`) para os dados bancários que ainda não estão armazenados no banco de dados.
