# ⚖️ Memória Modular: Conciliação & Matches

## Regras de Pareamento
- **Regex de Pagamentos Parciais na OS (`/:\s*([\d.]+)/g`):** Quando a célula `Forma(s) de Pagamento` de uma OS tiver múltiplos métodos (ex: `Crédito: 260.00; PIX: 500.00;`), utilize a regex `/:\s*([\d.]+)/g` para extrair os sub-valores e permitir o match fracionado.
- **Âncora na Maquininha:** A transação da Maquininha é a âncora principal e busca a OS correspondente por valor bruto (+/- R$ 0,05).
- **Idempotência da Rede:** Evite duplicatas na Rede gerando fingerprint único (`store_id_netAmount_osNumber`).
- **Conciliação do Líquido da Maquininha por Loja (REDE ↔ OFX):** O valor líquido das vendas da maquininha de cada loja isolada é batido contra o crédito de adquirente (ex: `LQD REDECARD`) que caiu no extrato bancário (OFX) daquela mesma loja no dia, comprovando a liquidação real e o desconto correto das taxas.
