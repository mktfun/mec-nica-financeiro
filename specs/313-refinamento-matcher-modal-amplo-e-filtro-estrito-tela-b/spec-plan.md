# Spec Plan: Refinamento de Precisão do Auto-Match (PIX x TED x Boletos), Modal Amplo e Filtro Estrito da Tela B (313)

## Tasks

### Fase 1 — Motor de Auto-Matching com Separação de Instrumentos (PIX x TED x Boletos)
- [x] [FRONTEND] Atualizar src/lib/matchers/autoMatchingEngine.ts com cruzamento de Nome/CNPJ + valor monetário
- [x] [FRONTEND] Implementar separação tipada entre PIX (D+0), Transferência (TED/DOC) e Boletos futuros (preservando parcelas 1/N com due_date em A Receber)
- [x] [FRONTEND] Cobrir casos de Rede com método 'Outros' ou variação de bruto vs líquido

### Fase 2 — Redesign do Modal de Vínculo de OS (Step 4 / Tela A)
- [x] [FRONTEND] Atualizar Step1UnregisteredPayments.tsx com <Modal size="xl"> (max-w-4xl)
- [x] [FRONTEND] Implementar card hero de 3 colunas, badge de placa automotiva estilizada, nome do cliente expandido e botão de vínculo blindado (min-w-[155px], whitespace-nowrap)

### Fase 3 — Filtro Estrito de Adquirentes e Rendimentos na Tela B (Step 5)
- [x] [FRONTEND] Atualizar Step2NonRevenueJustifications.tsx com EXCLUDE_ACQUIRER_REGEX e EXCLUDE_BANK_EARNINGS_REGEX eliminando 100% de liquidações da Rede e rendimentos bancários
- [x] [FRONTEND] Exibir exclusivamente transferências entre filiais (ex: DHJV SERVICOS), aportes e tarifas avulsas
- [x] [FRONTEND] Corrigir gravação no Supabase na tabela daily_manual_bills para usar a coluna canonical description

### Fase 4 — Verificação e Build Gate
- [x] [TEST] Executar compilação com 
ode node_modules/vite/bin/vite.js build até exit code 0
- [x] [TEST] Validar Cenário 1: Precisão nos casos de PIX, TED e preservação de Boletos
- [x] [TEST] Validar Cenário 2: Zero vazamento de Rede/Rendimentos na Tela B
