# Spec Plan: Faturamento Visor & Matemática de Realidade (093-fix-faturamento-visor)

## Tasks

- [x] [FRONTEND] Editar `src/routes/conciliacao.index.tsx`
  - Buscar `pixOsMatematico` = `storeMod1?.pix_os || 0`
  - Ajustar constante `faturamento` para somar: `maquininha + pixOsMatematico`
  - Manter constante `diferenca` inalterada, pois a matemática se resolverá magicamente.
- [x] [FRONTEND] Editar `src/components/conciliacao/ResumoDiaPanel.tsx`
  - No bloco `Faturamento Líquido`, onde diz "Diferença mês + Outros Faturamentos", adicionar a exibição do Faturamento Anterior usando a variável global `faturamentoAnteriorGlobal` que já existe no escopo do componente.
- [x] [TEST] Verificar se lojas como "Dom Pedro" não exibem mais diferença gigantesca quando a maquininha foi lida com sucesso.
