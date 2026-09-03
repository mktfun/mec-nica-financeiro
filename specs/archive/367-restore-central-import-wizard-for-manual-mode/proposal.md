# Proposal — Spec 367: Restauração do CentralImportWizard no Modo Manual (Importação em Massa)

## 1. Contexto e Feedback do Operador
O operador solicitou simplificar o fluxo de fechamento manual diário:
> *"ah mano n ta legal nao, deixa o manual ao esoclher manual da forma ue tava antes, import emmassa e aos poucos dps r ajustando a casinha vai... /vibe-proposal-solo"*

Na Spec 361, havíamos substituído o componente do modo manual pelo `FechamentoManualWizard` (dividido rigidamente em 4 fases isoladas com 4 dropzones independentes). O operador constatou que essa divisão excessiva tornou a operação lenta e truncada, pois ele precisa soltar 40+ arquivos de uma vez e prefere o comportamento clássico do `CentralImportWizard` com **importação em massa** e esteira de conciliação assistida já consolidada.

---

## 2. Solução Proposta
1. **Roteamento de Modo em `src/routes/importacoes.tsx`:**
   - Ao selecionar ou estar no `mode === 'manual'`, renderizar o `CentralImportWizard` com `targetDate` predefinido pela data selecionada no seletor.
   - Adicionar barra superior de contexto permitindo ao operador:
     - Voltar para a seleção de modo (`mode = undefined`).
     - Alternar para o Workspace Conversacional com IA (`mode = 'ai'`).
   - Ao cancelar ou concluir, navegar adequadamente.
2. **Atualização do Card em `src/components/importacoes/bifurcacao/FechamentoModeSelector.tsx`:**
   - Ajustar a descrição do Card 1 ("Modo Manual"):
     - **Título:** *"Modo Manual (Importação em Massa)"*
     - **Subtítulo:** *"Importação em lote de todas as planilhas e arquivos (.xlsx, .ofx, .csv) de uma vez só no Wizard Central clássico com conciliação assistida."*
     - **Badges:** *"Sem IA · Import em Lote · Clássico"*
     - **Itens:**
       - **Dropzone Universal:** Arraste planilhas de OS, arquivos da Rede, extratos OFX e contas juntos de uma só vez.
       - **Processamento em Lote:** Auto-leitura das 10 filiais e matching preliminar automático.
       - **Esteira Assistida:** Resolução de pendências, sobras e fechamento do dia.
     - **Botão:** *"Iniciar Importação em Massa (Clássico)"*

---

## 3. Critérios de Aceite
- [ ] Clicar no Card 1 ("Modo Manual") abre diretamente o `CentralImportWizard` clássico.
- [ ] O operador pode soltar todos os arquivos de uma só vez no dropzone universal.
- [ ] Existe botão claro para voltar à tela de seleção de modo caso deseje alternar.
- [ ] O modo conversacional Hydra (`mode === 'ai'`) continua perfeitamente acessível no Card 2.
- [ ] `bun run build` compila com código 0.
