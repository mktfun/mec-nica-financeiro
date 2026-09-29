# Plano de Execução — Spec 445: Motor Dedicado de Match Rede × OS por Loja (Valor Bruto Direto)

- [x] Completed — [DB; database] Criar migration evoluindo `public.match_stage2_rede_os(p_target_date date, p_store_id text)`: remove trava artificial de 7 dias, faz batimento direto entre Valor Bruto da Rede e Cartão da OS na mesma loja, protege contra colisões e adiciona array de órfãos comprovados (`exhausted_orphans`). Critério: executar migration e validar compilação limpa.
- [x] Completed — [UI; frontend-design-pro] Atualizar `Fase2RedeVsOsReview.tsx` para exibir badges dos 3 estados: Verde (Casado), Amarelo (Colisão para escolha manual) e Cinza (Órfão comprovado inexistente na filial). Critério: interface clara em Dark UI Zinc-950.
- [x] Completed — [TEST/GATE; sdd-apply] Validar contra os dados reais da pasta `17-09` e executar o Quality Gate no terminal (`npm run build`). Critério: zero erros de compilação TypeScript e Hard Stop final.
