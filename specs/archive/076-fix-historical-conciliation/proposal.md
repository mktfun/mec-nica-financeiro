# Proposal: CorreçÁo Histórica de ConciliaçÁo e Bootstrap (076)

## Problema
1. O **estado inicial do DatePicker** na página de conciliaçÁo ainda aponta para ontem (`getDefaultDate()`), forçando o usuário a avançar manualmente.
2. A métrica **"Na Loja OS"** (OSs Pendentes no Pátio) é renderizada de forma *live* a partir da tabela `patio_os`. Isso gera dois erros gravíssimos: (A) Ao retroagir a data da conciliaçÁo para dias anteriores, o valor nÁo reflete a foto real daquele dia, e (B) OSs legadas que nÁo foram importadas pelo robô nÁo aparecem (ex: os R$ 13k de Jabaquara sÁo engolidos pelos 1.6k do live-sync).
3. A diferença abissal de **R$ 93k** no consolidado global. Isso é causado por um bug na injeçÁo do "Dia Zero" (`/bootstrap`), que nÁo calculava o campo `caixa_atual` e o deixava vazio (zero). Consequentemente, o cálculo de `Fluxo de Caixa` (Caixa Atual - Caixa Anterior) subtrai zero, inflando monstruosamente o Valor Disponível e gerando a diferença no fechamento.

## SoluçÁo Proposta
1. **Frontend / DatePicker:** Alterar o estado inicial da rota de conciliaçÁo para `new Date().toISOString().substring(0, 10)` (hoje).
2. **Schema & Snapshot:** Adicionar a coluna `na_loja_os` na tabela `reconciliations` (que atua como snapshot diário por filial). No cálculo principal (`useModulo1StoresData`), priorizar o valor salvo no banco (`reconciliations.na_loja_os`) sobre a varredura dinâmica do `patio_os`, garantindo imutabilidade histórica.
3. **Bootstrap Completo:** Expandir a tela `/bootstrap` para coletar o **"Na Loja OS"** por filial (para resgatar saldos legados do Excel). Além disso, garantir que o Saldo Global (`daily_snapshots.caixa_atual`) seja matematicamente construído no momento do Bootstrap.

## Contratos de Dados
- **Tabela:** `reconciliations`
  - Nova Coluna: `na_loja_os` (NUMERIC DEFAULT 0)
- **Tabela:** `daily_snapshots`
  - Garantir o preenchimento de `caixa_atual` no UPSERT gerado pelo Bootstrap.

## Risco Principal
Alto. Modificaremos a fonte de verdade do cálculo do módulo principal (`useModulo1StoresData`), que agora precisará fazer um "merge" inteligente entre o dado *live* (se a conciliaçÁo nÁo tiver sido fechada ainda) e o dado *histórico* (persistido). A migraçÁo SQL precisa ser nÁo destrutiva.
