# ⚖️ Memória Modular: Conciliação & Matches

## Regras de Pareamento
- **Regex de Pagamentos Parciais na OS (`/:\s*([\d.]+)/g`):** Quando a célula `Forma(s) de Pagamento` de uma OS tiver múltiplos métodos (ex: `Crédito: 260.00; PIX: 500.00;`), utilize a regex `/:\s*([\d.]+)/g` para extrair os sub-valores e permitir o match fracionado.
- **Âncora na Maquininha:** A transação da Maquininha é a âncora principal e busca a OS correspondente por valor bruto (+/- R$ 0,05).
- **Idempotência da Rede:** Evite duplicatas na Rede gerando fingerprint único (`store_id_netAmount_osNumber`).
