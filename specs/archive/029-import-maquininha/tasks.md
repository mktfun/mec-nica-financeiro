# Tasks: Importação de Maquininha (Rede)

## Backend (Database & Hooks)
- [ ] Criar migração SQL `supabase migration new add_machine_total_to_reconciliations`.
- [ ] Alterar tabela `reconciliations` adicionando coluna `machine_total` NUMERIC DEFAULT 0.
- [ ] Aplicar migração e atualizar tipos TS (`database.types.ts`).
- [ ] Em `src/hooks/useConciliacao.ts`, atualizar as queries e as contas de `useConciliacaoResumo` e `calculateReconciliationStatus` para levarem em conta o `machine_total`.
- [ ] Criar um novo hook `useImportMaquininha` em `src/hooks/useImportProcessor.ts` que lida com a leitura do arquivo `.xlsx`, identificação da loja e upsert na tabela `reconciliations` no campo `machine_total`.

## Frontend (UI/UX)
- [ ] Na tela `src/routes/conciliacao.tsx`, adicionar o botão "Importar Maquininha" no Header, que deve abrir um `<input type="file" />` oculto.
- [ ] Ler o arquivo `xlsx` selecionado localmente e extrair o primeiro CNPJ válido e o Nome do Estabelecimento.
- [ ] Criar modal ou fluxo condicional:
  - Tentar achar uma loja que tenha esse CNPJ (se cadastrado).
  - Se não achar, buscar o CNPJ no `localStorage` (`maquininha_cnpj_mapping`).
  - Se totalmente desconhecido: Exibir modal pedindo para escolher a Loja (Dropdown), exibindo "Estabelecimento: XXXX (CNPJ: YYYY)". Salvar a escolha.
- [ ] Mostrar um Modal de Confirmação dizendo "Total Maquininha: R$ X. Deseja confirmar importação para a loja YYY?".
- [ ] Após confirmar, salvar via hook e fechar o modal.
- [ ] Nos Cards de Loja (em `conciliacao.tsx`), ajustar o layout do card para acomodar três colunas de valores: "Apurado Sistema", "Declarado Físico", "Apurado Maquininha".
- [ ] Ajustar a cor e cálculo de "Divergência" no card para refletir `Sistema - (Físico + Maquininha)`.
- [ ] Revisar Acessibilidade e Estética 2026 (Liquid Glass, Máximo Contraste na Divergência).

## Quality Assurance
- [ ] Validar o fluxo importando o `Rede_PIRA.xlsx` no dia selecionado.
- [ ] Conferir se o status da loja muda para aprovado/divergente corretamente.
- [ ] Validar build final.
