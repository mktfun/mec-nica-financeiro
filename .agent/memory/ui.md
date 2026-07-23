# 🎨 Memória Modular: Interface & UX (Frontend)

## Padrões de Componentes e Wizard
- **Zustand + React Query:** Invalidação simultânea de chaves de cache (`transactions`, `patio_os`, `reconciliations`, `daily-bank-balance`) pós-importação.
- **Invalidação Total de Cache (`qc.clear()`):** Adicione `qc.clear()` ao concluir ações de limpeza global de banco de dados para evitar renderização de resíduos em memória.
- **Single Pass no Parse de Excel:** Evite leituras síncronas repetidas via `XLSX.read` no event loop para não travar a UI ("Página não responde").
