# Spec Plan: Ajuste da Tabela de Cartão da Maquininha (Bruto, Taxa MDR, Líquido e Bandeira) (222)

## Tasks

- [ ] [FRONTEND/HOOKS] Atualizar `useReconciliationViews` em `src/hooks/useConciliacao.ts`:
  - Remover divisão artificial `totalAdquirenteOfx / count`.
  - Definir `rede_bruto`, `taxa_brl`, `taxa_percent`, `rede_liquido`, `bandeira` e `payment_method` de forma estritamente individual.
- [ ] [FRONTEND/COMPONENTS] Atualizar `src/components/conciliacao/OsVsRedeTable.tsx`:
  - Atualizar os 3 Cards de resumo: Bruto, Taxas MDR e Líquido Real.
  - Atualizar as colunas da tabela: Transação/Bandeira, Rede (Bruto), Taxa MDR (R$ e %), Líquido (A Receber), Referência / OS, e Status.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de compilação.
- [ ] [VERIFY] Validar a visualização da tabela e push para `main` e `master`.
