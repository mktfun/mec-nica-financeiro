# 📦 Software Composition Analysis (SCA) & Dependency Scanner

Guia de auditoria de dependências, detecção de CVEs e segurança da cadeia de suprimentos (*Supply Chain Security*), adaptado de `briiirussell/cybersecurity-skills@dependency-audit`.

---

## 1. Regra de Ouro dos Lockfiles

> [!IMPORTANT]
> **Sempre priorize a análise do arquivo de LOCK (`package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`) sobre o manifesto raiz (`package.json`, `requirements.txt`).**
> Mais de 80% das vulnerabilidades graves residem em dependências transitivas (sub-pacotes puxados indiretamente por bibliotecas de topo). O manifesto declara apenas versões desejadas; o lockfile declara as versões exatas que realmente rodam em produção.

---

## 2. Ferramentas Nativas Headless por Ecossistema

Execute o comando correspondente ao gerenciador do projeto:

### Node.js / TypeScript
```bash
# Formato JSON para parsing automatizado
cmd.exe /c "npm audit --json"

# Ou pnpm
cmd.exe /c "pnpm audit --json"
```

### Python
```bash
pip-audit -r requirements.txt --format json
```

### Rust
```bash
cargo audit --json
```

---

## 3. Matriz de Análise de Risco

Ao identificar uma dependência sinalizada com CVE:

1. **Acessibilidade no Código (Reachability):**
   - O método ou função vulnerável do pacote é realmente importado e chamado no projeto?
   - Se for uma vulnerabilidade em uma ferramenta exclusiva de desenvolvimento (`devDependencies`), a severidade em produção é atenuada, mas deve ser corrigida para evitar ataques de CI/CD.
2. **Dependência Direta vs. Transitiva:**
   - **Direta**: Corrija atualizando a versão no `package.json`.
   - **Transitiva**: Se o pacote pai ainda não lançou atualização, utilize a cláusula de `overrides` (npm) ou `resolutions` (yarn/pnpm):
     ```json
     // package.json
     {
       "overrides": {
         "pacote-vulneravel": "^2.4.1"
       }
     }
     ```
3. **Bibliotecas Abandonadas / Unmaintained:**
   - Pacotes sem commits ou atualizações há mais de 2 anos com vulnerabilidades abertas devem ser substituídos por alternativas ativas da comunidade.
