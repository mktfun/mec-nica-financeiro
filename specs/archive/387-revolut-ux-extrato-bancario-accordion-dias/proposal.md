# Proposal: Redesign Revolut Fintech UX do Extrato Bancário da Filial (387)

## Problema
O usuário apontou falhas críticas de UX e design na visualização do extrato bancário (`StoreExtratoBancarioView.tsx`):
1. **Cards de KPIs Engessados:** A conversão recente para 5 cartões apertados com bordas laterais pesadas e etiquetas técnicas (`LEDGERBAL`, `Abertura Lote`) quebrou a harmonia visual da aplicação, gerando poluição e insatisfação ("nao sei pq mas vc mudou o design dos cards d kpis (nao gostei)").
2. **Redundância Severa de Informação:** A tabela exibia a mesma informação repetida lado a lado nas colunas *Descrição / Histórico Bancário* e *Favorecido / Documento* (ex: razão social e CNPJ duplicados linha por linha), gerando poluição visual, fadiga cognitiva e aparência amadora ("duas vezes aparece a msm info, tipo, o titulo da transacao saca?").
3. **Falta de Agrupamento Interativo (Sem Accordion por Dia):** O extrato exibia todos os lançamentos em uma única lista contínua e achatada. O usuário solicitou explicitamente a capacidade de clicar no cabeçalho de cada dia para colapsar/expandir as transações daquela data ("poder clicar em um header ai fecha as transacoes pra mim do dia no card de extrato").
4. **Mandato Universal de Estética Revolut:** O usuário exigiu como padrão mandatório a estética e micro-interações da **Revolut** ([Revolut Analytics 2.0](https://dribbble.com/shots/14830139-Revolut-Analytics-2-0) e [Revolut Cards List](https://dribbble.com/shots/26151879-Revolut-cards-list-Card-details)), exigindo tipografia refinada, pílulas suaves, ícones de categoria estilizados e animações fluidas.

---

## Solução Proposta (Foco em Reuso e Redesign Revolut)

Reestruturar a experiência de uso de `StoreExtratoBancarioView.tsx` seguindo o design system premium da Revolut:

1. **Restauração e Polimento dos Cards de KPIs (Padrão Revolut Analytics 2.0):**
   - Retornar ao grid harmônico de 4 cards com espaçamento nobre (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`), cantos arredondados (`rounded-2xl`), superfícies foscas em Zinc-950/Zinc-900 e micro-ícones de categoria:
     - **Card 1: Saldo Oficial da Conta (`<LEDGERBAL>`)**: Posição consolidada do Itaú (-R$ 5.659,95), com badge elegante de status bancário e indicação contextual do Saldo Anterior (+R$ 412,78).
     - **Card 2: Total Entradas**: Créditos recebidos com pill suave em tom esmeralda e contagem de itens.
     - **Card 3: Total Saídas**: Débitos e pagamentos com pill suave em tom rosé e contagem de itens.
     - **Card 4: Movimentação Líquida**: Saldo líquido do período com status de conciliação integrado.

2. **Eliminação de Duplicidade — Bloco Unificado de Transação (Revolut Item):**
   - Fundir as colunas redundantes *Descrição* e *Favorecido* em uma única célula mestra **"Lançamento / Favorecido"**:
     - **Ícone / Avatar de Categoria**: Squircle com fundo sutil (`rounded-xl p-2.5`) e ícone contextual (Rede = Cartão azul, Boleto = Recibo teal, PIX In = Seta verde, PIX Out/Saque = Seta vermelha, Banco = Landmark roxo).
     - **Título Principal**: Razão social ou descrição limpa e humanizada (sem strings de sistema cortadas).
     - **Subtítulo Único**: Metadados essenciais (CNPJ/CPF formatado, FITID e justificativa contábil em itálico quando houver).
     - **Badges de Associação Inline**: Pílula Revolut arredondada (`rounded-full`) destacando se é `Conta: Fornecedor`, `OS #1234` ou `Lote Rede`.

3. **Agrupamento por Dia com Accordion Interativo e Animações Framer Motion:**
   - Agrupar as transações automaticamente por data contábil (ex: `09/09/2026` e `08/09/2026`).
   - Cada dia possui um **Header Accordion Clicável**:
     - Data formatada por extenso (ex: `Quarta-feira, 09 de Setembro` e `Terça-feira, 08 de Setembro`).
     - Badge com quantidade de lançamentos (`3 transações`, `11 transações`).
     - Subtotal financeiro consolidado do dia (Entradas, Saídas e Líquido).
     - Ícone `ChevronDown` / `ChevronUp` com rotação animada.
     - Controle global `[Expandir Todos]` / `[Recolher Todos]`.
   - Clicar no header abre/fecha as movimentações daquele dia com transição suave via `framer-motion` (`AnimatePresence` / `motion.div`).

---

## Investigação e Análise de Reuso
- **Tabelas / RPCs:** O backend, o hook `useStoreExtratoBancario` e as views de dados do Supabase continuam 100% íntegros e aproveitados. Nenhuma alteração de banco é necessária.
- **Componentes / Bibliotecas Existentes:**
  - `framer-motion`: Já instalado no projeto (`package.json`), perfeitamente compatível para sanfonas e micro-interações fluidas.
  - `AmountCell`: Reutilizado para formatação consistente de moedas.
  - `Badge`, `Card`, `Button`: Reutilizados e polidos com classes Tailwind de estilo Revolut.
- **Arquivo Modificado:** Exclusivamente `src/components/conciliacao/StoreExtratoBancarioView.tsx` (`[MODIFY]`).

---

## Risco Principal e Mitigação
- **Risco:** O agrupamento de transações em arrays por data afetar o funcionamento dos modais de justificativa (`OrphanCategorizationModal`) e vínculo de OS (`ManualMatchOsModal`).
- **Mitigação:** Manter os objetos de transação (`tx`) exatamente com os mesmos identificadores e contratos de dados esperados pelos modais, mudando unicamente a camada de renderização visual e o mapa de chaves de data.
