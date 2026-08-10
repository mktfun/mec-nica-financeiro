# Spec Plan: Refatoração da View de Importações (Excel/Extrato) - 153

## Tasks

- [x] [FRONTEND] Deletar os 4 arquivos obsoletos: `ImportSourceBadges.tsx`, `RawOfxTable.tsx`, `RawOsTable.tsx`, `RawRedeTable.tsx`.
- [x] [FRONTEND] Criar componente `ExtratosImportacaoModal.tsx` estruturando a UI do Modal com Tabs (OFX, Maquininha, OS).
- [x] [FRONTEND] Implementar a tabela "Excel-like" de **OFX Bancário** dentro do `ExtratosImportacaoModal`, mapeando: Data, Memo, FITID, Tipo e Valor (com cores financeiras e alinhamento à direita).
- [x] [FRONTEND] Implementar a tabela "Excel-like" de **Maquininha (POS)** dentro do mesmo modal, mapeando: Data, NSU, Bandeira, Bruto, Taxa (%), Líquido.
- [x] [FRONTEND] Implementar a tabela "Excel-like" de **Pátio (OS)** dentro do mesmo modal, mapeando: Data, OS, Placa, Cliente, Tipo Pgto, Valor.
- [x] [FRONTEND] Modificar `conciliacao.$lojaId.tsx` para remover o antigo `ImportSourceBadges` e injetar o botão de acionamento (Badge interativo) para o `ExtratosImportacaoModal`.
- [x] [TEST] Verificar cenário 1: Abrir modal e confirmar que o grid se assemelha a uma planilha de Excel condensada sem as estilizações antigas.
- [x] [TEST] Verificar cenário 2: Alternar as 3 abas sem travamentos e garantir que o carregamento condicional dos hooks (`useRaw*`) funcione.
