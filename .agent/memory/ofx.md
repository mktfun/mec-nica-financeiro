# 🏦 Memória Modular: Extratos Bancários (OFX)

## Lógicas de Parsing e Inserção
- **Pre-Fetch FITID & Clean Insert:** Para evitar erros de Foreign Key em `conciliation_matches`, pre-fetch de `fitid`s existentes no Supabase e deduplicação em memória antes de disparar `.insert()`.
- **Deduplicação de FITID:** Filtre FITIDs duplicados globalmente antes de gerar UUIDs para matches de conciliação.
- **Parsing Resiliente com FileReader:** Use wrappers com `FileReader` (`readTextFromFile`) para evitar `NotFoundError` quando arquivos `.ofx` forem lidos via browser drag-and-drop.
- **Validação de Depósito Líquido por Loja:** O extrato OFX de cada loja é a prova de fogo que valida o recebimento do líquido da maquininha (Rede) daquela loja específica no dia, isolando completamente contas bancárias entre filiais.
