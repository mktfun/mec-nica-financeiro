# Spec Plan: Algoritmo de ConciliaçÁo Tolerante (093-fix-pix-ofx-match)

## Tasks

- [ ] [HOOK] Alterar `src/hooks/useConciliacao.ts` (`useModulo1StoresData`) para que `ofxPixTxs` e algoritmos relacionados aceitem transações OFX onde `store_id` é nulo, permitindo o match entre a expectativa de uma loja e o dinheiro "órfÁo" que caiu no banco.
- [ ] [HOOK] Atualizar os retornos do hook garantindo propriedades independentes: `pix_expectativa` e `pix_ofx_matched`.
- [ ] [HOOK] Refazer o cálculo de `faturamento_atual` para ser matematicamente composto pelos acertos de conciliaçÁo: `cartao_ofx_matched + pix_ofx_matched`.
- [ ] [FRONTEND] Ajustar a UI da Tabela "Fechamento por Loja" em `src/routes/conciliacao.index.tsx` mapeando:
  - "Maquininha" = `cartao_entrou`
  - "PIX" = `pix_expectativa`
  - "Faturamento" = `faturamento_atual`
- [ ] [FRONTEND] Implementar a lógica condicional de tolerância na coluna "Diferença" na UI (`Math.abs(dif) < 1.0 ? 0 : dif`).
