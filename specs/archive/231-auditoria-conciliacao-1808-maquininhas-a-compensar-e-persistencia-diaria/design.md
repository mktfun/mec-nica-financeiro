# Design: Diagnóstico da Conciliação de 18/08, Cartões a Compensar e Persistência por Data (231)

## 1. Tratamento dos Cartões a Compensar no Backend e Frontend
- Na conciliação diária, as vendas de cartão que não caíram no extrato OFX no mesmo dia entram como Ativo a Compensar (somando ao Caixa Atual).
- No `ResumoDiaPanel.tsx`:
  - Permitir edição de `Saldo Bancos (Itaú + Cartões a Compensar)` e `Na Loja OS`.
  - Ao salvar o fechamento pelo botão "Salvar Fechamento / Confirmar", gravar em `daily_snapshots` com todos os valores congelados daquela data.

## 2. Isolamento de Data na Tela de Conciliação
- Quando o usuário selecionar uma data no `< 18/08/2026 >`:
  - Se existir `daily_snapshot` para a data, o cabeçalho e todos os 5 pilares priorizam os dados congelados daquele snapshot.
  - `Diferença Final` da data selecionada é salva e recuperada fielmente.
