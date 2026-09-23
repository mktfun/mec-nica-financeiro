# 📝 SDD Spec Plan: Spec 437 — Resolução de Pendências de Vendas em Cartão Rede Sem OS (Vínculo & Baixa Justificada)

## Tasks Atômicas de Implementação

### [BACKEND & HOOKS]
- [x] Completed **Task 1: Ajustar passagem de `p_store_id` e invalidação em `useManualMatch.ts`**
  - *Skill:* `backend-patterns`
  - *Ação:* Garantir que a chamada para a RPC `link_manual_rede_to_os` passe sempre `p_store_id: storeId || null`, e adicionar a invalidação de `store_pos_transactions` no `createAndLinkOs`, `linkTransactionToOs` e `unlinkTransaction`.
  - *Critério de Verificação:* Chamada de teste da RPC via node script executa com sucesso.

- [x] Completed **Task 2: Sincronizar invalidação de cache em `useCategorizeOrphan.ts` para cartões**
  - *Skill:* `backend-patterns`
  - *Ação:* Garantir que a mutação em `pos_transactions` ao justificar transação órfã invalide a query key `['store_pos_transactions']`.
  - *Critério de Verificação:* `npm run build` passa sem erros de tipagem.

---

### [FRONTEND UI]
- [x] Completed **Task 3: Implementar ações de Vincular OS, Baixa/Justificar e Desvincular em `StoreCartaoMaquininhaView.tsx`**
  - *Skill:* `frontend-design-pro`
  - *Ação:* 
    1. Incluir leitura de `manual_category` e `manual_justification` das linhas de `pos_transactions`.
    2. Na coluna "Referência / OS":
       - Se `hasOs`: Exibir link da OS + botão sutil de desvincular (`Unlink`).
       - Se `!hasOs` e possui `manual_category`: Exibir badge roxo com a categoria + botão de editar justificativa.
       - Se `!hasOs` e sem justificativa: Exibir botões compactos "Vincular OS" e "Dar Baixa / Justificar".
    3. Integrar os modais `ManualMatchOsModal` e `OrphanCategorizationModal` na view com callback de sucesso.
  - *Critério de Verificação:* `npm run build` passa sem nenhum warning de TypeScript ou lint.

---

### [QUALITY GATE & TESTES]
- [x] Completed **Task 4: Terminal Quality Gate e Validação de Tipos**
  - *Skill:* `security`
  - *Ação:* Executar `npm run build` e checar integridade de contratos.
  - *Critério de Verificação:* Terminal Gate limpo com exit code 0.
