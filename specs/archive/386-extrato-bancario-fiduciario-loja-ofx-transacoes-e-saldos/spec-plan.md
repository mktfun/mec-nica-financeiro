# Spec Plan: Extrato Bancário Fiduciário Completo da Filial (386)

## Tasks

- [x] [BACKEND/HOOK] Estender `src/hooks/useTransactions.ts` com o hook `useStoreExtratoBancario` recuperando saldo anterior e final de `reconciliations` e transações do extrato
- [x] [FRONTEND/UI] Atualizar os Hero Cards de `StoreExtratoBancarioView.tsx` exibindo Saldo Anterior, Entradas, Saídas, Líquido e Saldo Final (<LEDGERBAL>)
- [x] [FRONTEND/UI] Adicionar o Segmented Control `[📄 Extrato Completo do OFX]` / `[🎯 Apenas Fechamento do Dia]` no topo da tabela
- [x] [FRONTEND/TABLE] Renderizar linha de Saldo Inicial no topo, marcador de virada de dia e linha de Saldo Final (<LEDGERBAL>) no rodapé da tabela
- [x] [FRONTEND/TABLE] Eliminar truncamento agressivo de Favorecido / Documento e exibir o texto bancário completo
- [x] [TEST] Validar no navegador em localhost:8080 (Planalto 09/09) que os 14 lançamentos aparecem exatamente como no OFX oficial
- [x] [BUILD] Executar `npm run build` e assegurar zero erros de compilação TypeScript
