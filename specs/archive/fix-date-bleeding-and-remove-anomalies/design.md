# Design: Correção de Vazamento de Datas na Conciliação Diária & Remoção de Observações Críticas (fix-date-bleeding-and-remove-anomalies)

## Fluxo de Correção de Isolamento por Data

```
[Seleção da Data no Calendário (ex: 25/07/2026)]
                       |
                       v
     [useModulo1StoresData(targetDate)]
                       |
       +---------------+---------------+
       |                               |
       v                               v
[patio_os .eq('target_date')]   [receivables .eq('target_date')]
(Filtra estritamente pelo dia) (Filtra estritamente pelo dia)
       |                               |
       +---------------+---------------+
                       |
                       v
        [Cálculo do Módulo 1 Isolado]
        - 25/07/2026: NA LOJA OS = R$ 0,00 | SALDO TOTAL = R$ 0,00
        - 23/07/2026: NA LOJA OS = R$ 99.859,02 (Isolado apenas no dia 23)
                       |
                       v
[ResumoDiaPanel.tsx] (Sem o bloco de Observações Críticas)
```

## Remoção de Componente
- Remover o estado `anomalies` e a renderização do bloco `Observações Críticas (Sem OS)` em `ResumoDiaPanel.tsx`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Isolamento de Datas na Conciliação):**
  - *Ação:* Selecionar o dia 25/07/2026 e em seguida o dia 23/07/2026.
  - *Resultado Esperado:* O dia 25/07/2026 exibe R$ 0,00 em OSs do pátio pendentes, sem importar os R$ 99.859,02 do dia 23.
- **Cenário 2 (Remoção da Seção Observações Críticas):**
  - *Ação:* Observar a parte inferior do painel de fechamento.
  - *Resultado Esperado:* O bloco "Observações Críticas (Sem OS)" não é mais exibido na tela.
