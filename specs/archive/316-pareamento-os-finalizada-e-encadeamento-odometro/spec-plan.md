# Spec Plan: Pareamento de Quitações em OSs Finalizadas e Encadeamento Canônico de Odômetro (316)

## Tasks

- [x] [BACKEND] Criar migration `20260831000002_fix_automatch_and_odometro_encadeamento.sql` com auto-match textual + quitações finalizadas e retorno de `faturamento_anterior` no Ramal 2 da RPC
- [x] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx` para permitir busca e vínculo de OSs finalizadas com sugestões inteligentes
- [x] [FRONTEND] Atualizar `src/components/importacoes/CentralImportWizard.tsx` para exibir Odômetro Anterior de 28/08 (R$ 920.496,64) e calcular Delta de 31/08 em tempo real
- [x] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` com visualização clara de Odômetro Hoje vs Anterior
- [x] [TEST] Executar teste de auto-match com transações de quitação e validar que o saldo de pátio não é alterado
- [x] [TEST] Validar Wizard de Importação do dia 31/08/2026 consumindo R$ 920.496,64 como Odômetro Anterior
