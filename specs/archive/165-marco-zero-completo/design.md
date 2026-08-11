# Design: Marco Zero Global & Auditoria do Passivo (165)

## Arquitetura Técnica
1. **Parser Multiloja** → O usuário faz upload do arquivo `CONCILIAÇÃO.xlsx`. O script varre o workbook descobrindo dinamicamente as abas vinculadas a cada loja (ex: através do padrão de nomenclatura "LOJA 1008", ou por células-chave dentro da página principal). Ele devolve um `Map<store_id, MarcoZeroExtraction>`.
2. **Batch Insert DB** → O wizard pega o `Map` resultante e, num único loop transacional no Supabase (ou sequencial), realiza o `upsert` dos snapshots iniciais em `daily_snapshots` e das 16+ OSs antigas na tabela `estoque_os_pendente`.
3. **Auditoria Hook/Flow** → O novo passo do Wizard renderiza as OSs usando um filtro `WHERE status = 'PENDENTE' AND data_os < inicio_do_mes_atual` diretamente do `estoque_os_pendente`.

## Interfaces TypeScript
```typescript
export interface GlobalMarcoZeroExtraction {
  // Mapeia o nome ou ID da loja extraída para seus respectivos saldos e OSs
  stores: Record<string, MarcoZeroExtraction>;
}

export interface MarcoZeroExtraction {
  dinheiroMp: number;
  aReceber: number;
  negativo: number;
  caixaAnterior: number;
  osPendentes: { numero_os: string; data_os: string; valor_os: number }[];
}
```

## Componentes / Hooks / Funções
- **`src/lib/parsers/marcoZeroParser.ts`**: Atualizado. Passa a retornar `GlobalMarcoZeroExtraction` varrendo a planilha de ponta a ponta independentemente de nome fixo, agrupando o que é de qual loja.
- **`src/components/importacoes/MarcoZeroWizard.tsx`**: Atualizado. Remove o combo de "Loja Alvo", exibe os Cards de resultado agrupados (loja por loja, com as N OSs) e envia tudo em lote.
- **`src/components/importacoes/AuditoriaPassivoWizard.tsx`** (NOVO): Passo adicional (ex: 2.5) na `CentralImportWizard` que lista as OSs de `estoque_os_pendente` que ainda estão em aberto, exigindo check manual ou "Baixa/Cancelamento" antes de deixar o usuário seguir para o dia atual.

## Fluxo de UI
1. **Marco Zero:** Ao soltar o arquivo no Dropzone, o sistema informa "Analisando 4 lojas...". A tabela exibe um card por Loja, seus saldos calculados de Dinheiro MP, Caixa Anterior e X OSs mapeadas. Botão "Gravar Banco de Dados Base".
2. **O Dia Seguinte (Conciliação Comum):** Ao iniciar o Wizard no dia seguinte, antes da importação OFX, surge a tela "Auditoria do Passivo": "Você tem 16 OSs pendentes do mês anterior. Houve alguma alteração?". O usuário pode dar "Baixa" numa OS velha, ou simplesmente clicar em "Manter Pendentes e Avançar".

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Upload de planilha multiloja → O parser deve mapear corretamente os blocos de dados separados para a Loja 1008, 1009 etc.
- **Cenário 2:** Wizard Diário → Se houver 3 OSs velhas no `estoque_os_pendente`, a etapa de Auditoria deve forçar a visualização delas e permitir marcar uma como PAGA (data de baixa = hoje).
