# Design: CorreçÁo na ImportaçÁo de OSs (Status, Valor Total = Pago + Aberto) e Ajuste da Tela de OSs (fix-os-import-parsing-and-patio-metrics)

## Fluxo Técnico de Leitura e ExibiçÁo de OSs

```
[Arquivo Excel de OSs (Export do ERP)]
                    |
                    v
    [useOsImportProcessor.ts]
    - Lê a Coluna Status / D4 -> raw_status
    - Lê Valor Pago (`paid_value`)
    - Lê Valor em Aberto / Restante (`open_value`)
    - Calcula Valor Total = `paid_value + open_value`
    - Define statusEnum ('em_aberto' | 'pago_parcial' | 'finalizado')
                    |
                    v
    [savePatioOsAndReceivables] -> [Supabase patio_os (Upsert)]
    - Atualiza proceduralmente o status e os valores das OSs
                    |
                    v
    [src/routes/patio.tsx (Tela de OSs)]
    - Total em Aberto = ∑ (total_value - paid_value) de OSs nÁo finalizadas
    - Maior OS = max(total_value) de OSs nÁo finalizadas
    - Sem Pagamento = count(paid_value == 0)
    - Pagas Parcialmente = count(paid_value > 0 && total_value > paid_value)
    - Exibe Total, Pago e Aberto em cada Card de OS
```

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (ImportaçÁo da OS com Valor Pago + Valor em Aberto):**
  - *AçÁo:* Importar arquivo de OSs contendo OS com R$ 1.300,00 pago e R$ 2.200,00 em aberto.
  - *Resultado Esperado:* A OS é gravada com `total_value = R$ 3.500,00`, `paid_value = R$ 1.300,00` e `status = 'pago_parcial'`.
- **Cenário 2 (AtualizaçÁo de KPIs na Tela de OSs):**
  - *AçÁo:* Acessar `/patio` após a importaçÁo.
  - *Resultado Esperado:* O card **Total em Aberto** reflete a soma real dos saldos pendentes (ex: > R$ 0,00), o card **Pagas Parcialmente** incrementa, e cada card da lista exibe a linha `Aberto: R$ XXX`.
