---
name: obsidian
description: Gerenciamento de memória modular do projeto — leitura, escrita e organização dos arquivos .agent/memory/<categoria>.md para garantir continuidade entre sessões e coerência entre subagentes.
triggers: [memória, memory, obsidian, histórico, contexto, sessão, aprendizado, anti-pattern]
---

# Obsidian Memory — Guia Operacional para IA

## O que é e por que existe

A skill `obsidian` gerencia a **memória persistente e modular do projeto** em `.agent/memory/`.

O agente não tem memória entre sessões. Sem o Obsidian, cada sessão começa do zero:
- Recria componentes que já existem
- Viola anti-patterns que já foram descobertos
- Ignora regras de negócio que já foram definidas

O Obsidian corrige isso: **a memória está nos arquivos, não no contexto.**

---

## Papel nos Workflows

| Workflow | O que o Obsidian faz |
|---|---|
| `/setup` | **CRIA** a estrutura inicial dos arquivos `memory/*.md` vazios |
| `/vibe-proposal` | **LÊ** os arquivos relevantes antes de propor qualquer coisa |
| `/vibe-apply` | **LÊ** e injeta nos prompts dos subagentes especializados |
| `/vibe-archive` | **ESCREVE** as lições aprendidas da feature implementada |
| `/vibe-debug` | **LÊ** o arquivo do módulo com bug para ver histórico |

---

## Estrutura de Arquivos de Memória

```
.agent/memory/
├── ui.md           # Componentes React, padrões visuais, paleta, tipografia
├── supabase.md     # Schema, RLS, RPCs, padrões de banco
├── auth.md         # Autenticação, sessão, tokens, permissões, flows
├── infra.md        # Deploy, VPS, SSH, DNS, Cloudflare, domínios
├── domain.md       # Regras de negócio específicas do produto
└── [outros].md     # Categorias criadas conforme o projeto evolui
                    # Ex: payments.md, integrations.md, ofx.md
```

Crie novas categorias conforme o projeto precisar. Prefira granularidade — uma categoria por domínio de conhecimento.

---

## Leitura de Memória (READ)

**Selecione os arquivos pelo tipo de task:**

| Se a task envolve | Leia |
|---|---|
| UI / Componentes / Telas | `.agent/memory/ui.md` |
| Banco / Supabase / RPC / Migration | `.agent/memory/supabase.md` |
| Autenticação / Sessão / Permissão | `.agent/memory/auth.md` |
| Deploy / VPS / DNS / CI-CD | `.agent/memory/infra.md` |
| Regras de negócio / domínio | `.agent/memory/domain.md` |
| Categoria específica | `.agent/memory/<categoria>.md` |

**Nunca carregue todos os arquivos de uma vez** — carregue apenas os relevantes para a task atual (Context Budget).

**Nunca assuma que você lembra de sessões anteriores.** A memória está nos arquivos, não no contexto.

---

## Escrita de Memória (WRITE — somente no `/vibe-archive`)

Ao finalizar uma implementação, escreva no arquivo da categoria correta.

**Formato obrigatório para cada entrada:**
```markdown
## [YYYY-MM-DD] — [Feature ID: <id>]

**Contexto:** O que foi implementado e qual problema resolvia.

**Regra aprendida:** A lógica crítica que não pode ser esquecida.
Ex: "FITIDs de OFX devem ser deduplicados via chave composta (account_id, fitid) antes do INSERT"

**Risco identificado:** O que quase quebrou ou pode quebrar em mudanças futuras.

**Não fazer:** Anti-pattern identificado — o que explicitamente não deve ser tentado.
```

**Regra:** Se não houve nenhum aprendizado novo nesta iteração, escreva explicitamente:
```
## [YYYY-MM-DD] — [Feature ID: <id>]: Sem novos padrões ou anti-patterns identificados.
```

Nunca pule a escrita. Uma entrada vazia é melhor que uma sessão seguinte sem histórico.

---

## Inicialização (Bootstrap — somente no `/setup`)

Quando um projeto é inicializado, crie os arquivos com cabeçalho padrão:

```markdown
# [Categoria] Memory — Projeto: [nome do projeto]
> Criado em: [data]. Atualizado pelo /vibe-archive após cada feature.
> Contém: [descrição do domínio desta categoria]

<!-- Entradas adicionadas pelo /vibe-archive -->
```

---

## Regras de Qualidade

**BOA memória (específica e acionável):**
- ✅ "O hook `useAuth` só funciona dentro de `SessionProvider` — nunca use em Server Components"
- ✅ "A tabela `profiles` tem trigger automático de criação via `handle_new_user()` — nunca insira manualmente"
- ✅ "FITIDs duplicados causam FK error em conciliation_matches — use UPSERT com ON CONFLICT DO NOTHING"

**MÁ memória (vaga e inútil):**
- ❌ "Cuidado com o banco de dados"
- ❌ "Lembrar de testar"
- ❌ Copiar a mesma regra em múltiplas categorias

**Critério:** Uma boa entrada de memória pode ser lida por um agente e aplicada diretamente na próxima task, sem precisar de mais contexto.
