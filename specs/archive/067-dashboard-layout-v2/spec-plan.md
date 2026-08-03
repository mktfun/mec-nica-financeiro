# Checklist de Implementação: Spec 067

## Tasks

- [x] [FRONTEND] Reestruturar Layout Base (`src/routes/index.tsx`)
  - [x] Mover o `<EvolucaoMacroChart />` para ser renderizado primeiro, logo acima do grid `xl:col-span-3`, dentro de uma div `xl:col-span-4` nativa para pegar a largura total da tela.
- [x] [FRONTEND] Refinar Macro Chart (`src/components/dashboard/EvolucaoMacroChart.tsx`)
  - [x] Ajustar altura do card para deixá-lo mais fino (ex: `min-h-[220px]`).
  - [x] Substituir o `<Legend />` do Recharts por uma div de Legenda Customizada (ex: flexbox) inserida no lado direito do título (`<div className="flex justify-between items-start">`).
  - [x] Habilitar o `<YAxis hide={false} />` com formatação compacta (`Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 })`).
  - [x] Estilizar YAxis e CartesianGrid para ficarem invisíveis ou muito sutis, mantendo o aspecto minimalista premium.

## Status
COMPLETED
