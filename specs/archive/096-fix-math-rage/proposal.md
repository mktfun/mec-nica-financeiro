# Proposal: Alinhamento Bélico de Regras (096)

Mensagem recebida e regras atualizadas. O que você falou faz total e absoluto sentido quando olhamos para a arquitetura de "Planilha vs Banco". Vamos alinhar exatamente aos seus termos:

## 1. ImportaçÁo OFX (O Dumper de Dias)
Você disse: *"se eu importar um ofx de 7 dias atras ate hoje... TUDO qque for novo de transaçÁo poe pro dia da concilaicao escolhido e fodase"*.
**Status:** Isso **JÁ ESTÁ FUNCIONANDO ASSIM** graças ao conserto anterior (094 - Fim do Wipeout). Quando você joga o OFX no importador, o sistema ignora a data real que o banco carimbou e **força (`target_date`)** para o dia que você selecionou no calendário do importador. O `fitid` vai garantir que nÁo duplique. EntÁo, sim: se jogar 7 dias de arquivo na conciliaçÁo de hoje, tudo de novo vai cair pra hoje.

## 2. Na Loja OS (Snapshot Temporal)
Você disse: *"NO DIA DA CONCILIACAO, GERA A PORRA DO VALOR, SALVA NO BANCDO DE DADOS E COLOCA NO FRONT PRO DIA"*.
**O Problema:** A tabela de OS (`patio_os`) é "viva". Se o cara pagar a OS amanhÁ, o fechamento de ontem muda e mostra o valor novo (zerado).
**A SoluçÁo:** Ao importar os arquivos da OS no *CentralImportWizard*, o sistema passará a **tirar uma fotografia (snapshot) instantânea** da dívida daquela loja naquele milissegundo e salvará direto na tabela `reconciliations` do dia selecionado. O front-end de hoje, ontem e anteontem ficarÁo travados para sempre no valor daquele dia.

## 3. Faturamento (A Fórmula Real)
Você disse: *"só oq teve de entradas no OFX VINCULADO... nao soma ocm nada de maquininha"*.
**O Problema:** Ao somar a maquininha no código anterior, eu estava misturando a "Promessa" (Planilha) com a "Realidade" (Extrato).
**A SoluçÁo:** O Faturamento da Loja agora será ESTRITAMENTE o `Saldo Banco Itaú` da loja (ou seja, a soma de todas as Entradas do OFX mapeadas e vinculadas àquela unidade). E a "Diferença" será o soco na cara: a soma do que a planilha da Maquininha e da OS diziam contra o Faturamento real do Extrato.

## 4. Subtotal: Valor Contas
Você disse: *"tira o provisao, e o contas tem que ser oq ta ai no ofx e deixa os valores positivos ao calcular."*
**A SoluçÁo:** A ProvisÁo será removida do cálculo. O campo "Contas a Pagar" puxará automaticamente a soma matemática das **Saídas do OFX** (já passadas para positivo absoluto `Math.abs`), e o valor baterá exatamente como o extrato dita.
