# Design: Conciliação Diária e Deleção Cascade

## UI/UX (Stitch / Frontend)
A tela `/conciliacao` sofrerá um grande redesign. Em vez do overview atual com gráficos e pátio embutidos, focaremos em um layout de **Fechamento Diário**, estilo livro caixa.

**Estrutura Principal:**
- **Header:** Título "Conciliação Financeira Diária" + "Seletor de Datas" (Dropdown/Calendário ou Setinhas <- Hoje ->) permitindo visualizar conciliações já passadas.
- **Bloco de Consolidado:** Total Apurado pelo Sistema (Soma de Dinheiro, Cartões, Pix) vs Total Informado Fisicamente.
- **Bloco de Lojas/Caixas:** Uma lista (ou grid de cards) exibindo:
  - Loja
  - Valor Físico Declarado
  - Valor de Sistema (Entradas no Dinheiro)
  - Divergência (R$ e Status Colorido: Verde se OK, Vermelho se houver Furo).
  - Um botão de "Detalhes" que direciona para a `/conciliacao-detalhes` focada naquela loja.
- **Acessibilidade WCAG 2.2:** Fontes legíveis de alto contraste, cores semânticas (Verde Sucesso, Vermelho Perigo) indicando divergências, garantindo aprovação tátil e foco no Liquid Glass/Estética premium de 2026.

## Modelagem (Supabase / Backend)
- **Tabela `cash_registers`:** Já existe e guarda o caixa físico por loja e data. Continuará sendo a fonte para o "Valor Físico Declarado".
- **Stored Procedure (RPC) `delete_import_batch`:** Conforme arquitetado na spec inicial, o banco de dados assumirá o controle das exclusões (cascade delete programático atômico), limpando as tabelas financeiras caso um arquivo base seja excluído, preservando o histórico das datas antigas se não pertencerem ao lote excluído.
