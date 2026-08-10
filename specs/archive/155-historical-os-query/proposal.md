# Proposal: Pátio OS Cumulativo na Conciliação (Backlog Histórico) - 155

## Problema
As "OSs em Pátio" da Oficina Inteligente que foram abertas em meses anteriores (ex: Julho) não aparecem na conciliação atual (ex: 10 de Agosto), pois o sistema hoje só exibe OSs onde a *Data de Abertura* ou *Data de Fechamento* é EXATAMENTE igual ao dia da conciliação. Como o relatório da OI não pode ser exportado pegando dois meses de uma vez, as OSs "restantes" do mês passado somem da tela e não batem as contas.

## Solução Proposta
Descartar a ideia de automatizar scrapers para baixar meses repetidos no bot e, em vez disso, **Mudar a lógica do banco de dados (RPCs)**.
Quando você abrir a aba "Pátio OS" de hoje, o banco de dados vai procurar na tabela `patio_os` TODAS as OSs já importadas para essa loja que ainda tenham saldo devedor (`remaining_value > 0`), independentemente se foram abertas mês passado ou retrasado. 
Se a OS já foi importada uma vez na vida e não foi paga, ela continuará aparecendo no "Restante do Pátio" da conciliação de hoje.

## Contratos de Dados
- **Tabelas Envolvidas:** Nenhuma tabela nova será criada. Usaremos a `patio_os` existente.
- **Lógica de Mutação:**
  Em vez de: `opened_at::date = p_date`
  Será: `opened_at::date <= p_date AND (remaining_value > 0 OR closed_at::date = p_date OR opened_at::date = p_date)`

## API / Interface
- **RPCs Supabase:** Serão substituídas as funções:
  1. `get_conciliation_breakdown` (Aba OS na modal)
  2. `get_raw_os_data` (Extrato Excel de OS)
  3. `calculate_daily_conciliation` ou as views do painel principal (se usarem `patio_os`).

## Features Existentes Impactadas
- Os valores do Dashboard (Conciliação Diária, "Na Loja") vão automaticamente inflar para refletir o saldo real acumulado na rua/na loja. Se você nunca fechar a OS, ela vai te assombrar lá para sempre até você pagá-la, o que é o comportamento correto contábil.

## Risco Principal
- **Probabilidade:** Média
- **Impacto:** Parcialmente Reversível
- **Mitigação:** Algumas OSs legadas que já foram pagas "por fora" ou não foram baixadas no Oficina Inteligente vão acumular eternamente. O sistema precisará de um meio no futuro de forçar a baixa de uma OS se o Oficina Inteligente perder a rastreabilidade, mas hoje resolvemos a dor primária (mostrar o saldo do mês passado).
