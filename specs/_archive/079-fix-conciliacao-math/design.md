# Design: Fix Global Reconciliation & Manual Overrides

## Arquitetura e Decisões

1. **Estado Híbrido (Automático vs Manual):**
   - O campo "Contas a Pagar" continuará sendo calculado automaticamente a partir do OFX (filtrando saídas) para oferecer a melhor estimativa base (114k).
   - Ao importar o Excel, o usuário poderá **sobrescrever** esse valor via UI.
   - Esse override será salvo no banco (`daily_snapshots.contas_a_pagar_manual`), permitindo que a tela de conciliação puxe 106k em vez de 114k.
   
2. **Correção do "Na Loja OS" Global:**
   - O painel global (`ResumoDiaPanel.tsx`) não deve basear seu valor `na_loja` no `currentSnapshot` se ele estiver zerado indevidamente. O valor global do Pátio é estritamente uma propriedade derivada (soma) das propriedades individuais das lojas.
   - Usaremos uma computação derivada (`reduce` em `storesData`) para exibir e salvar o Global, garantindo que o legado (13k) resgatado pelas lojas individuais propague para o resumo geral imediatamente.

3. **Matemática do Fluxo de Caixa:**
   - Com o Pátio Global corrigido, a equação `Fluxo de Caixa = Caixa Atual - Faturamento - Subtotal Contas` será destravada, voltando a fazer sentido.
