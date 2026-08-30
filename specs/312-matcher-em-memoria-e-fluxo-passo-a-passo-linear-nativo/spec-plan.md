# Spec Plan: Motor de Auto-Match em Memória & Fluxo de 8 Passos Lineares Nativos (312)

## Tasks

### Fase 1 — Motor de Auto-Matching em Memória
- [x] [FRONTEND] Criar src/lib/matchers/autoMatchingEngine.ts com pareamento de Rede x OS (Cartão) e OFX x OS (PIX) usando 
esults.osFiles
- [x] [FRONTEND] Implementar isolamento por filial e tolerância de centavos ($\pm\text{R\$}~0,10$) com consumo determinístico de pares

### Fase 2 — Refatoração dos Steps Nativos no CentralImportWizard
- [x] [FRONTEND] Atualizar step para tipo linear 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 eliminando estados paralelos aninhados
- [x] [FRONTEND] Atualizar o indicador de topo (Header Badge) para refletir os 8 passos lineares
- [x] [FRONTEND] No Step 3: botão *"Avançar para Conciliação"* executa executeAutoMatchingEngine e transita diretamente para setStep(4) (substituindo a tela inteira)

### Fase 3 — Step 4 (Tela A: Pagamentos sem OS) com Fonte Dupla
- [x] [FRONTEND] Refatorar Step1UnregisteredPayments.tsx (Step 4) para receber unmatchedTransactions filtradas pelo matcher
- [x] [FRONTEND] Implementar no modal a busca com **Fonte Dupla**: união de 
esults.osFiles (lote em memória) + patio_os (banco de dados)
- [x] [FRONTEND] Implementar ação de vínculo de 1 clique com herança automática de valor e meio de pagamento

### Fase 4 — Steps 5, 6, 7 e 8 Nativos
- [x] [FRONTEND] Ajustar Step2NonRevenueJustifications.tsx (Step 5) com layout 100% nativo do app e navegação onBack: setStep(4) / onNext: setStep(6)
- [x] [FRONTEND] Ajustar Step3CashVaultDaniel.tsx (Step 6) com navegação onBack: setStep(5) / onNext: setStep(7)
- [x] [FRONTEND] Ajustar Step4FinalAuditAndClose.tsx (Step 7) com navegação onBack: setStep(6) e confirmação chamando handleConfirm que transita para setStep(8)
- [x] [FRONTEND] Manter o painel executivo de sucesso no Step 8 com atalho para /conciliacao e botão para novo lote (setStep(1))

### Fase 5 — Verificação e Build Gate
- [x] [TEST] Executar compilação com 
ode node_modules/vite/bin/vite.js build até exit code 0
- [x] [TEST] Testar Cenário 1: Verificar que o matcher em memória casa as transações de Rede e PIX cobertas e envia apenas as sobras reais para o Step 4
- [x] [TEST] Testar Cenário 2: Verificar que o modal de vínculo no Step 4 lista as OSs ativas do lote em memória mesmo com patio_os vazio no banco
