# Spec Plan: Refinamento dos Cards e Layout da Tela de Loja (215)

## Tasks

- [ ] [FRONTEND/COMPONENTS] Atualizar `src/components/lojas/LojaPieCharts.tsx` para:
  - Remover os botões de header duplicados (`Geral`, `Por Fornecedor`, `Por Origem`).
  - Receber a prop `activeTab: 'extrato' | 'saidas' | 'entradas' | 'caixa'` e alternar o modo do gráfico e título de forma automática e contextual.
- [ ] [FRONTEND/PAGE] Atualizar `src/routes/loja.$lojaId.tsx` para:
  - Adicionar o Card Lateral de Resumo de Entradas x Saídas na coluna de análise visual.
  - Garantir que o Saldo da Loja e Valor Disponível busquem de forma fixa o último saldo bancário importado do OFX da loja (sem sofrer alteração com filtro de datas curtas).
  - Conectar a prop `activeTab` diretamente ao `LojaPieCharts`.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo compilação limpa.
- [ ] [TEST] Testar no navegador a transição automática do gráfico ao trocar as abas e conferir o card lateral.
