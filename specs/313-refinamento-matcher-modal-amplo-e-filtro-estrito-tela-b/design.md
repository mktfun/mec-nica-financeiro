# Design: Refinamento de Precisão do Auto-Match (PIX x TED x Boletos), Modal Amplo e Filtro Estrito da Tela B (313)

## Arquitetura Técnica

`
[ CentralImportWizard.tsx (Step 3: Preview Geral) ]
                   │
                   ▼ [Avançar para Conciliação →]
   ┌────────────────────────────────────────────────────────────────┐
   │             executeAutoMatchingEngine() Refinado               │
   │  - Tier 1: PIX Instantâneo D+0 (Nome/CNPJ + Valor Exato)       │
   │  - Tier 2: Cartões Rede (Líquido/Bruto x parsed_credit/debit)  │
   │  - Tier 3: Transferências Bancárias x Recebíveis TED/DOC       │
   │  - Tier 4: Blindagem de Boletos A Receber (Due Date Futura)    │
   │  - Tier 5: Unicidade Estrita por Valor na Filial               │
   └────────────────────────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
[ Matches Automáticos ]   [ Sobras Reais ] ──> [ Step 4 (Tela A): Modal Amplo (max-w-4xl) ]
                                                            │
                                                            ▼ [Próximo: Justificativas →]
                                              [ Step 5 (Tela B): Filtro Estrito ]
                                                - BLOQUEIA: Rede, Cielo, Rendimentos
                                                - EXIBE: Aportes, Transferências Lojas
`

---

## Separação de Instrumentos Financeiros no Motor

`	ypescript
// 1. PIX: Liquidação Instantânea D+0
// Cruza com pagamentos de PIX no mesmo dia:
const isPixTransaction = /PIX|QRS|CHAVE/i.test(txDescription);

// 2. Transferência Bancária: TED / DOC / Depósito
// Cruza com recebíveis de transferência bancária:
const isTransferTransaction = /TED|DOC|TRANSF|TRANSFERENCIA|DEP\s+CONTA/i.test(txDescription);

// 3. Boletos Bancários: A Receber a Prazo (Parcelas 1/N com due_date futura)
// Boletos futuros não são consumidos por PIX do dia e permanecem em receivables:
const isFutureBoleto = rec.type === 'Boleto' && rec.due_date > targetDate;
`

---

## Cenários de Verificação (SCAN ➔ INFER ➔ VERIFY ➔ FIX)

### Cenário 1: Precisão de Nome/CNPJ em PIX e Isolamento de Boletos
- **SCAN:** OFX com ENTRADA PIX QRS JOSE DE ARI... R$ 1.052,00 e OS da filial com cliente JOSE DE ARI... e boletos futuros em eceivablesArray.
- **INFER:** O motor deve casar o PIX de R$ 1.052,00 com a OS do cliente pelo nome e valor, mantendo os boletos futuros intactos em A Receber.
- **VERIFY:** O PIX casa automaticamente com 100% de precisão e não sobra para a Tela A.
- **FIX:** Verificar normalização de tokens do cliente com remoção de stopwords.

### Cenário 2: Blindagem Total da Tela B contra Adquirentes e Rendimentos
- **SCAN:** Extrato OFX contendo créditos da Rede (RECEBIMENTO REDE...) e rendimentos (REND PAGO APLIC...).
- **INFER:** O filtro da Tela B deve descartar 100% dessas entradas.
- **VERIFY:** Tela B exibe exclusivamente transferências entre filiais (ex: DHJV SERVICOS).
