# Proposal: Limpeza e Reorganização do Dashboard da Loja (016)

## Contexto e Problema
O usuário identificou vários problemas na tela de Detalhes da Loja (`/loja/$id`):

1. **"Último Fechamento" inútil:** Os cards "Apurado Sistema R$ 0,00" e "Liquidado Conta R$ 0,00" ocupam espaço sem trazer valor. A divergência aparece mas não diz ONDE/COMO resolver.
2. **Formas de Pagamento com ponto-e-vírgula:** No extrato, o `payment_method` é exibido cru (ex: `Credito: 8550.00;`), tornando a leitura horrível.
3. **Consolidado do Sheets vs Sistema:** O consolidado de 89k pode divergir do Sheets (106k) pois o sistema agrupa apenas as OSs finalizadas no período do filtro, enquanto o Sheets pode incluir períodos diferentes.

## Requisitos e User Stories
- **Eu como gestor**, quero que a lateral esquerda da tela da loja seja limpa e útil (remover o bloco "Último Fechamento" zerado).
- **Eu como gestor**, quero que as formas de pagamento no extrato sejam exibidas como badges bonitas e legíveis (sem ponto-e-vírgula, sem números crus).
- **Eu como gestor**, quero que o gráfico de pizza ocupe melhor o espaço liberado.

## O que já existe e será reutilizado
- Componentes `Badge`, `Card`, `AnimatedNumber`.
- Função `parsePaymentMethods()` já faz o parse do formato "Credito: 10000.00;" — só precisa usar ela na exibição também.
- Gráfico de pizza Recharts já funciona.

## O que precisa ser criado/alterado
- **Remover** todo o bloco "Último Fechamento" (linhas 234-276).
- **Criar** uma função `formatPaymentDisplay(raw)` que transforma "Credito: 8550.00;" em badges visuais como `💳 Crédito R$ 8.550,00`.
- **Reorganizar** o grid para que o gráfico de pizza e a lista de formas de pagamento tenham mais espaço.

## Critérios de Aceite
1. O bloco "Último Fechamento / Apurado / Liquidado" some completamente.
2. No extrato, cada OS mostra as formas de pagamento como badges coloridas e humanizadas.
3. O gráfico de pizza continua funcionando e fica mais visível.
