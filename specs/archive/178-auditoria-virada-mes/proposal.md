# Proposal: Auditoria de Virada de Mês e OSs Órfãs (178)

## Problema
Atualmente o sistema de importação possui o `AuditoriaPassivoWizard`, mas ele foi desenhado **apenas** para o Marco Zero (olhando para a tabela `estoque_os_pendente`).
No entanto, você levantou um ponto arquitetural brilhante: **O sistema de gestão da loja só exporta as OSs do mês atual!**

Isso significa que, todo dia 1º de cada mês (ex: 1º de Setembro), quando você importar o arquivo Excel das OSs, ele virá apenas com as OSs de Setembro. **Qualquer OS de Agosto que ainda estava devendo (em_aberto) no dia 31 nunca mais virá no arquivo do Excel.** 
Como o arquivo não traz mais essas OSs, o sistema não tem como saber se o cliente pagou a dívida no dia 5 de Setembro. Elas ficam "órfãs" e congeladas como dívida para sempre.

## Solução Proposta
Vamos transformar o atual "Auditoria de Passivo (Marco Zero)" em uma **"Central de Auditoria de Virada de Mês e Órfãs"** inteligente.

O fluxo durante a importação (Step 2.5) fará o seguinte:
1. **O Filtro de Órfãs:** O sistema vai varrer o banco de dados e pegar TODAS as OSs que estão devendo (`status IN ('em_aberto', 'pago_parcial')` na `patio_os`, além das PENDENTES do Marco Zero).
2. **O Bate-Pronto (Cross-reference):** Ele vai cruzar essas OSs devedoras com o arquivo Excel que você acabou de importar (`cloudOsData`).
3. **Auto-Match:** Se uma OS antiga veio no Excel atual (raro, mas pode ocorrer se foi faturada agora), o sistema atualiza ela automaticamente no banco de dados e tira ela da lista.
4. **A Tela de Auditoria:** As OSs que **NÃO VIERAM** no arquivo (ou seja, as que ficaram presas nos meses passados) serão apresentadas para você em uma tela de input manual.
5. **Atualização Rica:** Nessa tela, em vez de apenas um botão "Dar Baixa", você poderá informar:
   - Novo Status (Aberta ou Finalizada)
   - Valor Pago
   - Valor a Dever

## Contratos de Dados
- **Input:** Lista de `cloudOsData` (OSs extraídas do Excel de hoje).
- **Processamento:** Componente React `AuditoriaPassivoWizard.tsx` reescrito para fazer o cruzamento com o banco local antes de exibir.
- **Output:** Chamadas de update nas tabelas `patio_os` e `estoque_os_pendente`.

## Risco
- **Risco:** Moderado (Requer refatoração do wizard atual de auditoria).
- **Mitigação:** Vamos separar visualmente as OSs do Marco Zero (Legacy) das OSs do Pátio Antigo (Patio) na tela de auditoria, para você saber exatamente de onde a dívida veio.
