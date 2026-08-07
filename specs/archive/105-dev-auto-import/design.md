# Design: Dev Auto-Import & Mapeamento Resiliente (105-dev-auto-import)

## Arquitetura Técnica
1. **Resiliência de Mapeamento**: 
   `useUnifiedStoreMapping` (Hook) → Lê `localStorage` (Alias -> Slug) → Busca na lista de Lojas atuais ativa (Supabase) → Retorna o ID atualizado independente de WIPEs de banco de dados.
2. **Auto-Load Mocks**:
   Componente `[Dev] Auto-Load Mocks` (Header) → Fetch de `mockedFiles` (Base64/File) → Hook `useCentralImport` `processFiles(mockedFiles)`.

## Interfaces TypeScript
```typescript
interface StoreMapping {
  // Antes: Record<string, UUID>
  // Agora: Record<string, string> (onde string é o Slug/Nome Normalizado da Loja)
  [alias: string]: string; 
}
```

## Componentes / Hooks / Funções
1. **`useUnifiedStoreMapping.ts`** (src/hooks/): Modificado para armazenar Slugs ao invés de UUIDs e injetar o UUID correto na hora da avaliaçÁo no Wizard.
2. **`CentralImportWizard.tsx`** (src/components/importacoes/): Adicionado botÁo secundário "[Dev] Auto-Load Mocks" visível apenas via `import.meta.env.DEV`.
3. **`scripts/generate-mocks.mjs`** (scripts/): Script de utilidade local para converter os 25 arquivos de teste da pasta Downloads em Base64 dentro de um `src/__mocks__/importFiles.ts` permitindo que o navegador carregue os arquivos da rede sem intervençÁo humana.

## Fluxo de UI
1. Usuário limpa o banco de dados (Wipe).
2. Usuário entra na tela de "ImportaçÁo Centralizada".
3. Ao invés de arrastar, o usuário clica em `[Dev] Auto-Load Mocks`.
4. Os arquivos de teste (OS, Ofx, Rede, etc) sÁo instantaneamente parseados e injetados na tela.
5. Quando o Wizard chega no passo 2 (Vincular Lojas), os IDs sÁo resolvidos magicamente pelos Slugs e NENHUM dropdown fica vermelho "NÁo Mapeada". Tudo fica verde e pronto pra Salvar Lote.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Wipe Total)**: DB dropado → Importar via Auto-Load → Passo 2 mapeia todas as lojas automaticamente com sucesso sem o usuário tocar em nada.
- **Cenário 2 (Modo ProduçÁo)**: App publicado na Vercel/Lovable → O botÁo `[Dev] Auto-Load Mocks` nÁo existe no DOM.
