# Spec Plan: Odometer Faturamento Logic, Read-Only Locks & UI Cleanup (197)

## Tasks

- [x] [MATH/LOGIC] Validar e calibrar `src/lib/modulo1Calculations.ts` para cálculo exato de faturamento incremental tipo odômetro (`faturamento_periodo = faturamento_anterior > 0 ? (faturamento_atual - faturamento_anterior) : faturamento_atual`).
- [x] [FRONTEND/CONCILIACAO] Implementar estado `isEditing` no `src/components/conciliacao/ResumoDiaPanel.tsx` com modo estático de leitura por padrão e botões "Editar Fechamento", "Salvar Alterações" e "Cancelar".
- [x] [FRONTEND/CONCILIACAO] Permitir edição do Faturamento Acumulado no `ResumoDiaPanel.tsx` durante `isEditing === true`, exibindo o odômetro anterior (Ant), a leitura atual e o faturamento líquido resultante.
- [x] [FRONTEND/IMPORTACAO] Limpar e despoluir `src/components/importacoes/CentralImportWizard.tsx`, removendo steppers redundantes no topo e recolhendo logs técnicos brutos para um accordion/drawer colapsável.
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo TypeScript limpo e bundling 100% verde.
- [x] [TEST] Validar na interface: cálculo do odômetro, trava de edição estática/ativa e visual limpo do modal de importação.
