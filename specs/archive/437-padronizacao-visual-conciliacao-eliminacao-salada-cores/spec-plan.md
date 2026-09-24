# 📝 Spec Plan — Spec 437: Padronização Visual da Tela de Conciliação & Eliminação da "Salada de Cores"

## Tasks de Implementação

### [FRONTEND] Normalização Visual de `ResumoDiaPanel.tsx`
- [x] Completed <!-- id: 437-01 --> Padronizar tipografia e tokens cromáticos no painel mestre de conciliação:
  - Top 4 Cards: Converter métricas nominais (Saldo Bancos, Dinheiro MP, A Receber e Na Loja OS) de cores arbitrárias (`text-[var(--color-accent-light-blue)]`, `text-[var(--color-accent-teal)]`, `text-[var(--color-primary)]`, `text-[var(--color-accent-warning)]`) para `text-white font-mono`.
  - Sub-chips de apoio: Limpar bordas e fundos saturados em Cofre e Cartões a Compensar para bordas sutis e tipografia `text-white font-mono`.
  - Header / Top Bar: Normalizar Entradas OFX (Fechamento) para `text-white font-mono`.
  - Esteira Contábil:
    - Caixa Atual, Caixa Anterior e Faturamento do Dia: garantir `text-white font-mono`.
    - Fluxo de Caixa: calcular estritamente `fluxoCaixaCalculado >= 0 ? 'text-emerald-400' : 'text-rose-400'`.
    - **Valor Disp. Contas (Exceção explícita):** Substituir `text-[var(--color-primary-bright)]` por `text-white font-mono`.
    - **Contas Manual (Exceção explícita):** Substituir `text-[var(--color-accent-danger)]` por `text-white font-mono`.
    - Subtotal a Cobrir: Substituir `text-[var(--color-accent-warning)]` por `text-white font-mono`.
    - Diferença Final: Garantir tolerância com `text-emerald-400 font-mono` quando conforme e `text-rose-400 font-mono` quando fora da tolerância.
  - *Skill:* `frontend-design-pro` & `ui-components`
  - *Critério de Verificação:* `ResumoDiaPanel.tsx` renderiza todos os valores normais em branco e apenas campos de cálculo em verde/vermelho.

### [FRONTEND] Normalização Visual de `StoreCardModulo1.tsx`
- [x] Completed <!-- id: 437-02 --> Padronizar tipografia e tokens cromáticos nos cards individuais das filiais:
  - Saldo Banco (OFX): Ajustar para `saldoBancoValor < 0 ? 'text-rose-400' : 'text-white'` (saldo fiduciário positivo é informativo branco; negativo indica cheque especial devedor).
  - Rede Total: Substituir `text-cyan-400` por `text-white font-mono`.
  - Saldo em Pátio: Substituir `text-amber-400` por `text-white font-mono`.
  - Seção Entradas:
    - OFX Entradas: Substituir `text-emerald-400` por `text-white font-mono`.
    - Conciliado: Manter `text-zinc-300 font-mono`.
    - Dif. a Justificar (Cálculo): Substituir `var(--color-accent-teal)` / `var(--color-accent-danger)` por `text-emerald-400 font-mono` se conforme e `text-rose-400 font-mono` se divergente.
  - Seção Saídas:
    - Saídas OFX: Substituir `text-rose-400` por `text-white font-mono`.
    - Contas / Boletos: Manter `text-zinc-300 font-mono`.
    - Dif. a Justificar (Cálculo): Substituir `var(--color-accent-teal)` / `var(--color-accent-danger)` por `text-emerald-400 font-mono` se conforme e `text-rose-400 font-mono` se divergente.
  - *Skill:* `frontend-design-pro` & `ui-components`
  - *Critério de Verificação:* `StoreCardModulo1.tsx` renderiza métricas operacionais em branco e cálculos em verde/vermelho.

### [TEST/VERIFY] Terminal Gate & Conformidade de Build
- [x] Completed <!-- id: 437-03 --> Executar verificação rápida no terminal:
  - Rodar `npm run build` garantindo 0 erros de compilação, 0 erros de tipagem TypeScript e 0 warnings de JSX.
  - Inspecionar integridade de layout sem regressão visual nas rotas de conciliação.
  - *Skill:* `deploy-production`
  - *Critério de Verificação:* Build limpo com exit code 0.
