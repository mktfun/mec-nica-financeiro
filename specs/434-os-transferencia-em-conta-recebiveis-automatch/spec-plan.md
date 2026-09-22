# 📝 Spec Plan — Cadastro Ágil de Transferência em Conta na OS e Baixa Automática no OFX

- **Spec ID:** `434-os-transferencia-em-conta-recebiveis-automatch`
- **Skill Canônica:** `frontend-design-pro`, `backend-patterns`, `database`

---

### [FRONTEND/MODAL]
- [x] Criar `src/components/conciliacao/CadastrarTransferenciaOsModal.tsx` seguindo tokens Zinc-950 de `DESIGN.md`.
- [x] Implementar divisão automática de parcelas com recalibração de centavos e campos de vencimento inline.

### [BACKEND/HOOKS]
- [x] Criar hook `useCreateBatchReceivables` em `src/hooks/useRecebiveis.ts` para inserção atômica de parcelas vinculadas à OS.

### [FRONTEND/OS_VIEW]
- [x] Adicionar opção "Transferência em Conta" no select de formas de pagamento em `StoreOrdensServicoView.tsx`.
- [x] Adicionar Badge e botão de atalho para desdobramento de transferência na tabela de OSs.
- [x] Integrar abertura do modal ao selecionar a opção ou ao clicar na ação da linha.

### [WIZARD/MATCHER]
- [x] Integrar chamada de `auto_match_receivables` no pipeline de pareamento do `CentralImportWizard.tsx`.

### [TEST / QUALITY GATE]
- [x] Executar `npm run build` no terminal e verificar 0 erros.
- [x] Parada obrigatória (Hard Stop) para validação do usuário.
