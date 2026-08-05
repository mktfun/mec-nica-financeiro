# Goal Description

Diagnosticar e resolver a persistência dos bugs (tela branca e valores milionários no Dashboard) na versão em produção (Lovable), mesmo após os códigos terem sido corrigidos e commitados no GitHub. 

## Background

1. **A Causa Raiz da Persistência:** Os erros relatados pelo usuário nos logs (`ReferenceError: dynamicGlobalNaLojaOs is not defined` e Dashboard mostrando `17 milhões`) são **exatamente** os mesmos bugs que já foram resolvidos nos arquivos fonte. O problema é que a aplicação está sendo acessada através do link de produção (`https://conciliamec.lovable.app/conciliacao`), que **ainda não baixou (sincronizou) a última versão do código do GitHub**.
2. **O Efeito Colateral do Re-import no Código Velho:** Como o usuário tentou fazer o teste de re-importar a planilha usando o site antigo do Lovable (que ainda continha o código defeituoso), a aplicação multiplicou os lançamentos no banco de dados MAIS UMA VEZ. O código de "auto-limpeza" (deduplicação) não estava lá para impedir.

## Proposed Changes

Não há mudanças de código necessárias no repositório, apenas um plano de ação de sincronização e faxina no banco:

### Passo 1: Atualizar o Lovable (Sincronização)
- O usuário deve acessar o painel de controle do projeto no Lovable e clicar no botão para puxar (sync/deploy) as últimas alterações do GitHub (branch `main`). Isso garantirá que o código consertado passe a rodar no domínio `lovable.app`.

### Passo 2: Faxina do Banco de Dados
- Como as tentativas anteriores com o código quebrado poluíram a tabela de `transactions` com milhões de registros duplicados (não-OFX), precisamos limpar a base. 
- A forma mais segura e fácil é usar a própria ferramenta do sistema: Clicar no botão **"Limpar Todos os Dados"** na página de Importação (agora já na versão atualizada). Isso varrerá todas as transações, OSs e recebíveis quebrados do banco para aquela data.

### Passo 3: Importação Final Definitiva
- Com o código novo rodando e o banco de dados limpo, o usuário fará o upload da planilha Excel uma última vez. A nova lógica importará apenas 1 via dos dados e a tela de conciliação voltará a funcionar sem erros de variável.

## User Review Required

> [!IMPORTANT]
> Vá no painel do Lovable e garanta que o app foi atualizado com a versão mais recente do GitHub antes de tentar de novo, senão o código velho vai continuar quebrando a tela e sujando o banco!
