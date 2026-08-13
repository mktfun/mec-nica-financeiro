# Spec Plan: Salvamento Direto e Simples do Marco Zero (184)

## Tasks

- [x] [FRONTEND] Atualizar `handleSave` em `src/components/importacoes/MarcoZeroWizard.tsx` para gravar os dados do `data.global` diretamente na tabela `daily_snapshots`.
- [x] [FRONTEND] Atualizar `handleSave` em `src/components/importacoes/MarcoZeroWizard.tsx` para gravar os dados do `data.global` diretamente na tabela `dashboard_daily_logs`.
- [x] [FRONTEND] Atualizar `handleSave` em `src/components/importacoes/MarcoZeroWizard.tsx` para gravar as OSs de cada loja diretamente na tabela `patio_os` (status `em_aberto`, `paid_value: 0`).
- [x] [TEST] Testar compilação com `npm run build`.
- [x] [TEST] Verificar salvamento do Marco Zero e conferir fidelidade total com o preview no Dashboard e no Pátio das lojas.
