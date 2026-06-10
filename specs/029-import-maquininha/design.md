# Design: Importação de Maquininha (Rede)

## Arquitetura de Banco de Dados (Supabase MCP)
A tabela `reconciliations` existente armazena o status financeiro de uma loja em uma data.
**Alterações necessárias:**
- Adicionar coluna `machine_total` (NUMERIC, default 0): Armazena o valor total consolidado importado do relatório da maquininha daquela loja naquele dia.
- O campo `divergence` atual representa (Sistema - Caixa Físico). Precisamos refinar o motor de status para calcular duas divergências:
  1. **Divergência Física:** (Sistema Dinheiro) - (Caixa Físico)
  2. **Divergência Maquininha:** (Sistema Cartões/Pix) - (Maquininha Total)
  *Nota:* No escopo inicial, para simplificar, se não conseguirmos separar "Sistema Dinheiro" de "Sistema Cartões" com a estrutura de OS atual, podemos consolidar a **Divergência Total = (Sistema) - (Físico + Maquininha)**. O usuário verá os dois declarados lado a lado.

## UI/UX (Stitch MCP / UX Architect 2026)
Na tela `/conciliacao` (Painel Diário):
- **Botão de Ação Primária:** Adicionar um botão "Importar Maquininhas" (Ícone de CreditCard ou Upload) no Header ao lado do DatePicker.
- **Card da Loja (Grid):** Onde atualmente temos "Apurado Sistema" e "Declarado Físico", adicionaremos um terceiro indicador: **"Apurado Maquininha"**.
  - O design do card deverá alocar 3 blocos de valores, garantindo respiro e contraste.
  - A divergência total será calculada como: `(Apurado Sistema) - (Físico + Maquininha)`.
- **Mapeamento Explícito pelo Conteúdo (CNPJ):** O frontend utilizará o `SheetJS` para ler o Excel ANTES de tentar mapear. Extrairá o valor da coluna `CNPJ`.
  - Checará se alguma Loja tem esse CNPJ cadastrado.
  - Se não, verificará no `localStorage` (`maquininha_cnpj_mapping`) se o usuário já associou aquele CNPJ a um `storeId`.
  - Se ainda não achar, abre o modal (`MaquininhaMappingModal`) informando "Estabelecimento X (CNPJ Y) não reconhecido. Selecione a loja." A resposta é salva no `localStorage`.

## Motor de Leitura do XLSX (SheetJS)
- Ler a Sheet[0].
- Extrair cabeçalhos (normalmente na linha 2, index 1 do array).
- Os cabeçalhos começam na **linha índice 1** (A segunda linha, ignorando o cabeçalho de metadados da Rede).
- Filtrar registros onde `"status da venda"` seja `"aprovada"`, `"pago"` ou variações positivas.
- Somar a coluna `"valor da venda original"`.
