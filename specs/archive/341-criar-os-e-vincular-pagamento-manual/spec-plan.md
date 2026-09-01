# Spec Plan: Criação de Nova OS com Baixa e Vínculo de Pagamento Manual no Wizard (341)

## Tasks

- [x] [BACKEND] Criar migration `20260901000016_create_and_link_manual_os_rpc.sql` implementando a RPC `create_and_link_manual_os` e garantindo o acréscimo de valores em `pix_transfer_value`, `credit_value` ou `debit_value`, e o cálculo exato de `paid_value` e `status` ('finalizada' vs 'pago_parcial')
- [x] [BACKEND] Aplicar migration 16 no Supabase via script Node headless e testar criação e vínculo atômico via RPC
- [x] [FRONTEND] Adaptar o hook `useManualMatch.ts` adicionando a mutation `createAndLinkOs` e invalidação correta das queries
- [x] [FRONTEND] Atualizar `ManualMatchOsModal.tsx` adicionando a aba "Criar Nova OS na Loja" com formulário completo (Número da OS, Loja, Cliente, Placa, Valor Total, Forma de Pagamento) em Dark UI Zinc-950
- [x] [TEST] Executar build gate (`npm run build`) e validar 0 erros TypeScript
- [x] [TEST] Testar no navegador o fluxo de criação de nova OS e vínculo para PIX e Cartão REDE, validando que a OS é criada com saldo correto e a pendência é baixada
