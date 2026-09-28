# 📋 Plano de Implementação — Spec 443: Redesign & Anti-Slop no Vínculo de PIX e REDE a OS

## Checklist de Execução

- [ ] **Task 1: Redesenho do Top Banner e Segmented Control em `ManualMatchOsModal.tsx`**
  - Substituir o card anterior pelo banner fiduciário de alto contraste (origem, descrição da contraparte, valor em destaque mono tabular `text-2xl font-bold text-emerald-400`).
  - Implementar o Segmented Control sem emojis para alternar entre "Ordens de Serviço em Aberto" e "Cadastrar Nova OS".

- [ ] **Task 2: Implementação do Layout Split View Master-Detail (60% / 40%)**
  - Criar o painel esquerdo (Master):
    - Campo de busca instantânea com autofocus e contador de resultados.
    - Lista de OSs em cards espaçosos com tipografia mono para placas e números de OS, nome legível do cliente e saldos transparentes.
    - Badges sutis de sugestão (eliminando `<Sparkles>` e cores de arco-íris).
    - Estado de seleção reativo com auto-seleção da OS de maior pontuação/match exato.
  - Criar o painel direito (Detail):
    - Ficha da OS selecionada.
    - Receipt contábil de amortização (Saldo OS - Recebimento = Saldo Restante).
    - Botão de ação primária destacado `[ Confirmar Vínculo na OS #XXXX ]` ou `[ Vincular e Quitar OS ]`.
    - Ação secundária sutil para quitação de saldo residual em dinheiro físico no balcão.

- [ ] **Task 3: Refinamento da Aba "Cadastrar Nova OS" & Eliminação de Slop**
  - Alinhar o formulário em grid limpo de 2 colunas com tokens Zinc-950.
  - Remover todo e qualquer texto de aviso prolixo ("Garantia Contábil..."), emojis e badges decorativos.

- [ ] **Task 4: Terminal Gate & Quality Check**
  - Executar `npm run build` para garantir que o bundle compila com 0 erros de tipos e lint.
  - Validar a reatividade das mutações (`linkTransactionToOs`, `createAndLinkOs`, `settleOsWithCash`) e fechamento do modal com toasts claros.
