# Política: Sync com Upstream

## Upstream de referência
**Repositório**: https://github.com/sickn33/antigravity-awesome-skills  
**Cadência de revisão**: Semestral (não automático)  
**Última revisão**: 2026-04-14

## Princípio fundamental
> **Toda importação é uma decisão consciente e explícita.**  
> Nunca sincronizar automaticamente. Nunca copiar em massa.

## Quando fazer sync

### Gatilhos para revisar o upstream
- Upstream lança versão major (ex: V10 → V11)
- Uma skill específica que precisamos é adicionada ao upstream
- Bug crítico descoberto em skill importada
- A cada 6 meses como manutenção preventiva

### Gatilhos para NÃO fazer sync
- Upstream adiciona skills de plataformas que não usamos
- Upstream muda para estrutura incompatível com nossa curadoria
- Skills adicionadas sem revisão de qualidade (massa de PRs)

## Processo de sync (passo a passo)

```bash
# 1. Verificar o que mudou no upstream desde a última revisão
git log --oneline sickn33/main..HEAD -- skills/

# 2. Para cada skill que queremos verificar:
# - Ler o SKILL.md atual no upstream
# - Comparar com nossa versão local
# - Decidir: atualizar, ignorar ou remover

# 3. Importar nova skill (quando justificado):
# - Copiar SKILL.md para skills/<nome>/SKILL.md
# - Adicionar cabeçalho de atribuição (ver modelo abaixo)
# - Adicionar entrada no skill-manifest.yaml
# - Documentar no CHANGELOG.md

# 4. Atualizar metadados:
# - skill-manifest.yaml → atualizar date_added se relevante
# - policies/sync-upstream.md → atualizar "Última revisão"
```

## Modelo de cabeçalho de atribuição

Todo arquivo SKILL.md importado do upstream deve ter no topo:

```yaml
---
source: upstream (sickn33/antigravity-awesome-skills)
upstream_commit: <hash ou data>
local_adaptation: false  # true se modificamos o conteúdo
imported_on: YYYY-MM-DD
notes: "Adaptações feitas: ..."
---
```

## Skills que são nossas (não sincronizar com upstream)
- `supabase-best-practices` — criada/adaptada para nosso stack específico
- Qualquer skill em `skills/` com `source: original` no manifesto

## Skills importadas do upstream (as que devem ser verificadas no sync)
Ver `skill-manifest.yaml` — campo `source: upstream (sickn33/...)`

## O que NÃO importar (nunca)
- Skills de plataformas não utilizadas: Kiro, ADAL, OpenCode (sem nosso uso)
- Skills de linguagens fora do nosso stack: Swift, Kotlin, Go, Rust
- Skills de infraestrutura pesada: Kubernetes, Terraform (fora do nosso escopo)
- Skills duplicadas de funcionalidade já coberta por skills existentes

## Deprecação e remoção de skills
Se uma skill importada ficar desatualizada ou for substituída:
1. Marcar como `deprecated: true` no manifesto
2. Adicionar nota de substituição
3. Remover em um commit separado com `chore: deprecate <skill-name>`
4. Documentar no CHANGELOG.md
