# Proposal: Fixação de Escopo do Pátio e Reversão do Caixa Manual (099)

## 1. Problema: "NA LOJA OS" aparecendo em outros dias
**Causa Raiz:** O motor de conciliação (`useConciliacao.ts`) estava buscando o snapshot do pátio (`reconciliations`) com um filtro `<= data_selecionada`. Isso significava que, se você olhasse um dia sem snapshot salvo (ex: hoje de manhã antes de fechar o caixa, ou um dia no passado), ele roubava o snapshot mais recente salvo no passado e projetava no dia atual, criando dados fantasmas em dias que não tinham essa informação.
**Solução:** O snapshot histórico (`isHistorical`) SÓ pode ser ativado se o usuário de fato salvou a conciliação EXATAMENTE naquele dia (`r.date === date`). Se não há snapshot exato pro dia visualizado, o sistema recalcula o pátio ativo (`storeOs`), garantindo que não haja propagação fantasma de dias passados.

## 2. Problema: Caixa Anterior Manual / Erro do OFX
**Causa Raiz:** Você exigiu que o Caixa Anterior fosse estritamente automático. A tentativa de colocar um input manual foi revertida. Além disso, o sistema estava tentando puxar o "Saldo Anterior" do arquivo OFX do Itaú para compor o "Caixa Anterior Global". Mas o OFX só tem o saldo do banco, enquanto o seu "Caixa Global" soma Banco + MercadoPago + Pátio + A Receber. Isso estava corrompendo o Fluxo de Caixa sempre que um OFX era lido.
**Solução:** O `caixaAnteriorGlobal` passará a puxar os dados EXCLUSIVA e AUTOMATICAMENTE do `daily_snapshots` do dia anterior (`previousSnapshot?.caixa_atual`). A lógica manual e a interferência do saldo OFX serão deletadas. Se o dia anterior não tiver sido salvo na plataforma, ele será 0 (e para arrumar, basta ir no dia anterior e Salvar a Conciliação).
