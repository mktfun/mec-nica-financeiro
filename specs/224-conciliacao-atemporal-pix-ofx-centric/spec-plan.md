# Spec Plan: Conciliação Atemporal e Persistente de PIX (OFX-Centric) (224)

## Tasks

- [ ] [BACKEND/HOOKS] Atualizar `useOsImportProcessor.ts` para garantir persistência imutável dos vínculos existentes (`matched_ofx_id`) durante novas importações de relatórios de pátio.
- [ ] [BACKEND/HOOKS] Atualizar `useManualMatch.ts` e `LinkOfxToOsModal.tsx` para permitir busca atemporal (janela de $\pm 15$ dias) no pool de OSs abertas da loja.
- [ ] [FRONTEND/CONCILIACAO] Atualizar `useConciliacao.ts` para aplicar o pareamento inteligente atemporal entre lançamentos de extrato bancário e o pool de OSs da loja.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de compilação.
- [ ] [VERIFY] Validar a resiliência a reimportações e testes de match atemporal.
