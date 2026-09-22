# 📝 Spec Plan — Calibração do Match Rede x OFX e Deduplicação no Saldo Consolidado

- **Spec ID:** `433-match-rede-ofx-deduplicacao-saldo`
- **Skill Canônica:** `backend-patterns`, `frontend-design-pro`

---

### [BACKEND/MATCHER]
- [x] Ajustar janela de liquidação (D0 / D+1) em `src/lib/llm-matcher.ts` para que créditos de adquirente sejam casados com os lotes da Rede.
- [x] Garantir que `aCompensarReal` e os status individuais de venda reflitam `entrou` quando o crédito bancário correspondente estiver presente.

### [FRONTEND/MODAIS]
- [x] Ajustar guardrail em `src/components/conciliacao/SaldoBancosDetailModal.tsx` para respeitar `rawNaoEntrou === 0` sem cair no fallback de 100% da Rede.
- [x] Validar que filiais com Rede compensada exibam `-` na coluna Maquininhas (Rede) e não sofram acréscimo indevido no Saldo Consolidado.

### [WIZARD/INTEGRAÇÃO]
- [x] Sincronizar `CentralImportWizard.tsx` para que a gravação do resumo e de `reconciliations` mantenha os lotes como `entrou` quando conciliados.

### [TEST / QUALITY GATE]
- [x] Executar `npm run build` no terminal e verificar 0 erros.
- [ ] Parada obrigatória (Hard Stop) para validação dos números pelo usuário.
