# Research: Central de Fechamento (031)

## 1. Contexto do Pedido
Com as adições recentes (Importação Inteligente de Maquininhas, Conciliação Bancária OFX e Juros da Rede), a página de Conciliação Diária passou a exigir múltiplos pontos de interação para o upload de arquivos. O usuário precisa clicar no botão "Importar Maquininha" (que atualmente não suporta múltiplas seleções) e utilizar outras duas dropzones separadas para OFX e XLSX de Juros. 
O pedido visa unificar essas entradas em um modelo "One-Stop-Shop" (Central de Importação) suportando **Upload em Massa**.

## 2. Análise do Fluxo Atual
Atualmente na rota `src/routes/conciliacao.tsx`:
- Existe um `<input type="file" accept=".xlsx" />` isolado acionado por um botão. Ele mapeia CNPJ e calcula o `machine_total` via Supabase.
- Existe o `<BankReconciliationDashboard />` que possui dois inputs `<input type="file" />` (um suportando multi-OFX, e outro single-XLSX para juros).
- UX quebrado: o usuário baixa 5 PDFs/XLSX de maquininhas, 5 OFXs de banco, e 1 planilha de Juros. Ele precisa separá-los mentalmente e fazer upload em 3 lugares diferentes.

## 3. Estratégia de Roteamento Inteligente (Smart File Router)
A melhor prática 2026 para este cenário é uma **Dropzone Universal de Fechamento**.
O usuário seleciona (ou arrasta) *todos os arquivos* do dia de uma vez só (`accept=".ofx, .xlsx, .csv"`).
O Front-end aplica um algoritmo `FileRouter` para categorizar o arquivo em milissegundos:
- **É .OFX?** => Array de BankStatements.
- **É .XLSX?** => Usa o `SheetJS` para ler as primeiras 10 células.
  - Possui colunas "taxa juros", "Valor Bruto"? => Array de Custos/Juros.
  - Possui string de CNPJ padrão Rede / Stone / Cielo e colunas "Valor Líquido"? => Array de Maquininhas.

## 4. Conclusão da Pesquisa
Unificar o upload reduzirá o esforço cognitivo do usuário e o tempo de fechamento diário em 70%. O sistema fará todo o mapeamento, agrupamento por loja (via `localStorage` cache) e calculará todas as divergências (Físico + Máquina vs Sistema vs Banco) em um único grande painel de resumo.
