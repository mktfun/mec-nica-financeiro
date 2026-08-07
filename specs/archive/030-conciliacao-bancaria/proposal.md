# Proposal: ConciliaçÁo Bancária & Juros da Rede (030)

## 1. VisÁo Geral
A funcionalidade de ConciliaçÁo Bancária adiciona o nível final de verificaçÁo e governança sobre os fluxos financeiros da empresa. O objetivo é cruzar e validar tudo que o sistema acredita que aconteceu contra o que **o extrato bancário oficial (OFX)** afirma que de fato transitou pelas contas da loja (tolerando R$ 10.00 de erro operacional/taxas invisíveis). 
Além disso, a extraçÁo dos Custos/Taxas de Juros da Rede possibilita aos gerentes visualizar de forma transparente o valor retido pela adquirente.

## 2. Requisitos de Negócio (Requisitos Funcionais)
- **RF1:** O sistema deve permitir a importaçÁo de extratos no formato `.ofx` selecionando o arquivo via navegador.
- **RF2:** O sistema deve tentar vincular automaticamente o extrato OFX a uma loja, usando palavras-chave no nome do arquivo (ex: `JAB` vinculando com a loja `Jabaquara`). Se nÁo encontrar de forma determinística, perguntar ao usuário e "aprender" (cache local).
- **RF3:** O sistema fará o _parse_ das transações OFX (débitos e créditos).
- **RF4:** Para os **Débitos** (Saídas), o sistema deve identificar se existe uma transaçÁo (despesa) paga no mesmo dia com valor aproximado (diferença <= R$ 10,00).
- **RF5:** Para os **Créditos** (Entradas), o sistema deve identificar recebíveis/vendas concluídas da maquininha ou de transferências com valor aproximado (diferença <= R$ 10,00).
- **RF6:** Em caso de diferença acima de R$ 10,00 ou lançamento fantasma (nÁo existe no sistema, só no banco), acusar Incongruência e destacar no painel para facilitar auditoria.
- **RF7:** O sistema deve conseguir ler a planilha "JUROS REDE.xlsx", que contém múltiplos blocos de lojas (PIRAPORINHA, PLANALTO), lendo a coluna "valor cobrado" de cartões e acumulando esse custo (Despesa/Taxa Adquirente) ao DRE/Resumo do dia.

## 3. Requisitos NÁo Funcionais (Técnicos & UI)
- **RNF1 (Performance):** O parse do OFX e do Excel deve ocorrer no Client-side (navegador) e nÁo trafegar os arquivos por payload, enviando apenas os Arrays JSON extraídos para as chamadas de banco.
- **RNF2 (Persistência Automática):** Lojas "aprendidas" via mapeamento manual (`JAB = Loja_ID`) devem ficar registradas no `localStorage`.
- **RNF3 (Tolerância Matemática):** O Match engine deverá ter um parâmetro global na regra de negócio `const TOLERANCE_BRL = 10.00;` 
- **RNF4 (Estética 2026):** A Tela de ConciliaçÁo Bancária deve usar as diretrizes do UI Maximalista Tátil. Se o fluxo fechar 100%, renderizar um bloco de sucsso Liquid Glass. Para furos > R$ 10.00, destacar com "Red Flag" interativa apontando o ofensor.

## 4. BDD Scenarios (Testes Comportamentais)

### Cenário: Mapeamento de OFX Inteligente pelo nome do Arquivo
- **Given (Dado):** que existe uma loja cadastrada com nome "Jabaquara" (alias 'JAB')
- **When (Quando):** o usuário faz o upload do arquivo `Extrato_JAB.ofx`
- **Then (EntÁo):** o sistema deduz a loja corretamente sem mostrar modal pedindo para escolher.

### Cenário: ConciliaçÁo Bancária Perfeita
- **Given (Dado):** que o OFX possui uma saída de R$ -180,00 no dia 09/06
- **And:** existe uma transaçÁo de saída (despesa paga) registrada no dia 09/06 com valor de R$ 180,00
- **When (Quando):** a Engine de Match executar a conciliaçÁo
- **Then (EntÁo):** a transaçÁo OFX é marcada como "Matched" e a diferença exibida é de R$ 0,00.

### Cenário: ConciliaçÁo com Diferença Tolerável (Menos de R$ 10)
- **Given (Dado):** que o OFX tem uma saída de R$ -3062.57 no dia 09/06
- **And:** existe uma transaçÁo no sistema de R$ 3055,00. 
- **When (Quando):** a Engine de Match tenta vincular
- **Then (EntÁo):** a transaçÁo é pareada com sucesso (gap de R$ 7,57, dentro do limite de R$ 10,00) e marcada como "Matched com Divergência Menor".

### Cenário: ConciliaçÁo Falha por Lançamento Ausente (Indício de Fraude/Erro)
- **Given (Dado):** que o OFX possui uma saída de R$ -500,00 
- **But:** nÁo há transaçÁo próxima no sistema no dia (só uma de R$ 50,00)
- **When (Quando):** o OFX é lido
- **Then (EntÁo):** o sistema isola o registro como "ÓrfÁo (Banco)" num card vermelho indicando a incongruência de R$ -500,00 para verificaçÁo urgente do gestor.
