# Spec Plan: Raio-X da Conciliação — Transparência de Contas (151)

## Tasks

- [x] [DIAGNÓSTICO] Executar query no banco — CLI bloqueado por token format. Diagnóstico movido para dentro da própria RPC: `bank_total_warning` expõe o estado diretamente no modal.
- [/] [BACKEND] Criar migration `20260810180000_conciliation_breakdown_rpc.sql`...
- [ ] [FRONTEND] Fix em `conciliacao.index.tsx` linha 76: substituir `juros_atual: 0` por soma real de `pos_transactions.fee_amount` agrupada por loja/data (nova query paralela no hook ou inline via `useQuery`).
- [ ] [FRONTEND] Criar hook `src/hooks/useConciliationBreakdown.ts` com lazy query (enabled somente quando o modal de uma loja específica abre).
- [ ] [FRONTEND] Criar componente `src/components/conciliacao/BreakdownModal.tsx` com 4 abas: Entradas OFX (tabela com Data/Hora, Descrição, FITID, Valor), Saídas OFX (mesma estrutura), Na Loja OS (tabela com Nº OS, Abertura, Status, Total, Pago, Restante — linhas do mês anterior em âmbar com badge "📅 Mês Anterior" + dois subtotais: mês atual vs mês anterior), Taxas Maquininha (Hora, Forma Pgto, Bruto, Taxa R$, Taxa %, Líquido).
- [ ] [FRONTEND] Adicionar botão `🔍 Raio-X` em cada linha de loja na tabela de conciliação (`conciliacao.index.tsx`) que abre `BreakdownModal` para a loja/data selecionada.
- [ ] [TEST] Cenário 1: Aba Entradas OFX → lista transações com FITID, subtotal bate com bank_total exibido na tela.
- [ ] [TEST] Cenário 2: bank_total=0 mas ofx_in tem dados → alerta "Trigger desatualizado" aparece na Aba Entradas.
- [ ] [TEST] Cenário 3: Aba Na Loja OS → OSs de julho aparecem com badge âmbar "📅 Mês Anterior" e subtotal separado.
- [ ] [TEST] Cenário 4: Aba Taxas Maquininha → mostra fee_amount real (não zero) após fix do hardcode.

