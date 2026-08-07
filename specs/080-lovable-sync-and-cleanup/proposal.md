# Goal Description

Diagnosticar e resolver a persistência dos bugs (tela branca e valores milionários no Dashboard) na versÁo em produçÁo (Lovable), mesmo após os códigos terem sido corrigidos e commitados no GitHub. 

## Background

1. **A Causa Raiz da Persistência:** Os erros relatados pelo usuário nos logs (`ReferenceError: dynamicGlobalNaLojaOs is not defined` e Dashboard mostrando `17 milhões`) sÁo **exatamente** os mesmos bugs que já foram resolvidos nos arquivos fonte. O problema é que a aplicaçÁo está sendo acessada através do link de produçÁo (`https://conciliamec.lovable.app/conciliacao`), que **ainda nÁo baixou (sincronizou) a última versÁo do código do GitHub**.
2. **O Efeito Colateral do Re-import no Código Velho:** Como o usuário tentou fazer o teste de re-importar a planilha usando o site antigo do Lovable (que ainda continha o código defeituoso), a aplicaçÁo multiplicou os lançamentos no banco de dados MAIS UMA VEZ. O código de "auto-limpeza" (deduplicaçÁo) nÁo estava lá para impedir.

## Proposed Changes

NÁo há mudanças de código necessárias no repositório, apenas um plano de açÁo de sincronizaçÁo e faxina no banco:

### Passo 1: Atualizar o Lovable (SincronizaçÁo)
- O usuário deve acessar o painel de controle do projeto no Lovable e clicar no botÁo para puxar (sync/deploy) as últimas alterações do GitHub (branch `main`). Isso garantirá que o código consertado passe a rodar no domínio `lovable.app`.

### Passo 2: Faxina do Banco de Dados
- Como as tentativas anteriores com o código quebrado poluíram a tabela de `transactions` com milhões de registros duplicados (nÁo-OFX), precisamos limpar a base. 
- A forma mais segura e fácil é usar a própria ferramenta do sistema: Clicar no botÁo **"Limpar Todos os Dados"** na página de ImportaçÁo (agora já na versÁo atualizada). Isso varrerá todas as transações, OSs e recebíveis quebrados do banco para aquela data.

### Passo 3: ImportaçÁo Final Definitiva
- Com o código novo rodando e o banco de dados limpo, o usuário fará o upload da planilha Excel uma última vez. A nova lógica importará apenas 1 via dos dados e a tela de conciliaçÁo voltará a funcionar sem erros de variável.

## User Review Required

> [!IMPORTANT]
> Vá no painel do Lovable e garanta que o app foi atualizado com a versÁo mais recente do GitHub antes de tentar de novo, senÁo o código velho vai continuar quebrando a tela e sujando o banco!
