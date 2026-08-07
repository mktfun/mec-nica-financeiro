# Spec Plan: Refatoração do Faturamento e PIX na Conciliação Diária (faturamento-pix-refactor)

## Tasks

- [x] [FRONTEND] Modificar `useModulo1StoresData` em `src/hooks/useConciliacao.ts` para separar as transações de OFX In e extrair aquelas que contêm termos "PIX", "TED", "TRANSF" no título/subtítulo.
- [x] [FRONTEND] No mapeamento de cada loja, identificar os valores de PIX declarados nas OSs (campo `pix_transfer_value`, `parsed_pix_transfer` ou deduzido).
- [x] [FRONTEND] Cruzar os valores de PIX do OFX com os declarados na OS (match por valor exato ou aproximado < 0.05).
- [x] [FRONTEND] Calcular `pixOsMatched` como a soma dos PIXs validados no banco.
- [x] [FRONTEND] Ajustar a propriedade `pix_os` (na interface `StoreSaldoState`) para usar o valor retornado por `pixOsMatched`.
- [x] [FRONTEND] Alterar a fórmula de `faturamento_atual` para ser estritamente `cartaoEntrou + pixOsMatched` em vez do total bruto das OSs.
- [x] [TEST] Abrir o app (dashboard da conciliação) e constatar visualmente se "Faturamento" corresponde a `Maquininha + PIX`.
