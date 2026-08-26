# Proposal: Extrato Bancário Nativo por Loja com Entradas, Saídas, Filtros e Fuzzy Match de Despesas (290)

## Problema
A visualização atual do Extrato Bancário da Filial (`StoreExtratoBancarioView.tsx`) possui lacunas que prejudicam o fluxo de trabalho do operador:
1. **Ocultação de Saídas:** A tela filtra apenas `type === 'in'`, tornando invisíveis todos os pagamentos de boletos, transferências PIX e tarifas bancárias da conta.
2. **Débitos Não Justificados Manualmente:** As saídas bancárias precisam ser cruzadas uma a uma com a planilha de Contas a Pagar importada (`daily_manual_bills`), gerando retrabalho manual.
3. **Cegueira Temporal de Lotes D-1:** Transações postadas com data do dia anterior no OFX desaparecem da visualização da conciliação do dia.
4. **Falta de Filtros Ágeis:** O operador não consegue isolar rapidamente apenas o que falta justificar, apenas entradas ou apenas saídas.

## Solução Proposta (100% Padrão Nativo do Sistema)
Refatorar `StoreExtratoBancarioView.tsx` mantendo estritamente a identidade visual já estabelecida no projeto (Zinc-950, cards nativos, tipografia padrão, zero invenções visuais), com as seguintes melhorias funcionais:

1. **Visão Integral de Movimentação (Entradas e Saídas):**
   - Exibir todos os créditos (`in`) e débitos (`out`) importados do OFX.
   - **Formatação de Data:** Exclusivamente no padrão **DD/MM/AAAA** (sem horário).
2. **Fuzzy Match Automático de Despesas com Contas Importadas (`daily_manual_bills`):**
   - Para cada débito (`out`) no extrato OFX:
     - Algoritmo de cruzamento inteligente que compara o **valor exato (`amount`)** e a **similaridade de nome (`recipient_name` / `description` / `counterpart_name`)** com as contas a pagar da loja importadas na data.
     - Ao detectar correspondência, aplica automaticamente o status **`🟢 Conta Paga: [Favorecido]`**, justificando a saída no extrato sem esforço manual.
3. **Cruzamento de Entradas (Rede e PIX de OS):**
   - Créditos da Rede identificados como **`🔵 Rede / Cartão`**.
   - PIX de clientes vinculados à OS como **`🟢 OS #[Número]`**.
   - Outras entradas justificadas como **`🟣 [Categoria Manual]`**.
   - Entradas sem identificação sinalizadas como **`🟡 Pendente`**.
4. **Barra de Filtros Segmentados Nativa:**
   - Botões com contadores dinâmicos no padrão do sistema:
     - **`[ Todas (N) ]`**
     - **`[ ⚠️ Pendentes (N) ]`** (transações que ainda não possuem vínculo de OS, Rede ou Conta Paga)
     - **`[ Entradas (+N) ]`**
     - **`[ Saídas (-N) ]`**
     - **`[ 🟢 Contas Pagas (N) ]`**
     - **`[ 🔵 Rede / Cartão (N) ]`**
5. **Cards de KPIs no Topo (Design Nativo):**
   - **(+) Entradas do Extrato** (ex: R$ 7.615,74)
   - **(-) Saídas do Extrato** (ex: R$ 1.370,00)
   - **(=) Movimentação Líquida** (ex: +R$ 6.245,74)
   - **Saldo do Extrato em Conta** (ex: -R$ 1.165,43)

## Contratos de Dados
- **Tabelas Supabase:**
  - `public.transactions` (transações OFX)
  - `public.daily_manual_bills` (contas a pagar importadas para o fuzzy match)
- **Hooks Existentes Utilizados:**
  - `useTransactionsPorDataELoja(date, storeId)`
  - `useDailyManualBills(date, storeId)` (ou query direta em `daily_manual_bills`)

## Regras de Design e Constraints
- ⛔ **Proibido:** Glassmorphism, fontes fora do padrão, exibir horário nas datas, criar modais ou elementos visuais extravagantes.
- ✅ **Obrigatório:** Seguir o padrão `Card`, `Badge`, `Button`, paleta Zinc-950/Zinc-900/Zinc-800 e tipografia mono pt-BR para valores monetários.

## Risco Principal
- **Risco:** Falsos positivos no fuzzy match de despesas se houver dois pagamentos de mesmo valor no mesmo dia.
- **Mitigação:** Exigir combinação de valor idêntico + tolerância de similaridade de texto no nome do favorecido, permitindo sempre desvincular ou editar manualmente pelo operador.
