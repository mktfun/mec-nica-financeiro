# 📐 Arquitetura & Design — Spec 417: Geração Automática de Recebíveis de OSs (Boletos & Transferências)

## 1. Arquitetura de Dados & Pipeline Automático

```
[Upload de Arquivos no Wizard]
        │
        ├── Arquivo OS (*_ConferenciaOSxFinanceiro.xls)
        │         │
        │         ▼
        │   [useOsImportProcessor.ts]
        │   - Detecta: Boleto, Transferência, Faturado, etc.
        │   - Extrai: Cliente, OS, Valor Total
        │   - Formata Descrição: "BOLETO <CLIENTE> OS <NUM> <PARCELA>"
        │   - Adiciona em: receivablesArray
        │         │
        │         ▼
        │   [savePatioOsAndReceivables em useImportProcessor.ts]
        │   - Checa: SELECT id FROM receivables WHERE store_id = X AND os_number = Y
        │   - Se JÁ EXISTE: Ignora (Idempotente, preserva parcelas existentes)
        │   - Se NÃO EXISTE: Insere os títulos automaticamente com status 'pendente'
        │
        └── Arquivo Maquininha / Rede (*.xlsx)
                  │
                  ▼
            [pos_transactions]
            (NÃO gera nada em receivables!)
```

---

## 2. Lógica de Sanitização de Nome de Cliente

Helper para extrair um nome limpo e auditável:
```typescript
export function cleanCustomerName(rawName: string | null | undefined): string {
  if (!rawName) return '';
  return rawName
    .replace(/[-–—]\s*(?:LTDA|ME|EPP|EIRELI|S\/A|SA)\b/gi, '')
    .replace(/\b(?:LTDA|ME|EPP|EIRELI|S\/A|SA)\b/gi, '')
    .replace(/\bDE VEICULOS\b/gi, '')
    .replace(/\bCOMERCIO DE\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}
```
Exemplo:
- Entrada: `"MARINHO LOCADORA DE VEICULOS - LTDA"`
- Saída: `"MARINHO LOCADORA"`
- Descrição gerada: `"BOLETO MARINHO LOCADORA OS 40369 1/1"` (ou `1/3`, `2/3`, `3/3` se desmembrado).

---

## 3. Cenários de Teste

### Happy Path:
- Ao importar a planilha `1845_ConferenciaOSxFinanceiro.xls`, o processador encontra a OS 40369 com `Forma(s) de Pagamento: "Boleto: 1600.00; "`.
- Se a OS 40369 já possui as 3 parcelas salvas em `receivables` (como já estão no banco), o sistema detecta que a OS já está cadastrada e não duplica nada.
- Se for uma OS nova (ex: OS 99999 com Boleto de R$ 2.000,00), o sistema cria automaticamente o registro `BOLETO <CLIENTE> OS 99999 1/1` com R$ 2.000,00 sem que o usuário precise clicar em nenhum botão.

### Edge Case:
- Planilha da Rede é importada contendo 13 vendas.
- O wizard grava as 13 vendas exclusivamente em `pos_transactions`.
- A tabela `receivables` permanece 100% limpa, sem criação de linhas com `OS: null` ou `Cartão Crédito`.

---

## 4. Critérios de Aceitação Verificáveis
1. Zero cliques manuais: toda OS com forma de pagamento a prazo gera recebível automaticamente no momento da ingestão.
2. Idempotência estrita: reimportar o mesmo arquivo não duplica nem sobrescreve recebíveis existentes.
3. Descontaminação de cartões: nenhuma linha com `type = 'Cartão Crédito'` é inserida em `receivables` pelo wizard.
4. Compilação limpa (`npm run build` exit code 0).
