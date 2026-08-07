# Hand-off Summary & Environment Setup
**Projeto:** `mec-nica-financeiro`
**Última Atualização:** 07/08/2026

---

## 🔐 Acesso às Credenciais (Environment)
Para o próximo Agente de IA: **NUNCA peça para o usuário fazer login via terminal ou browser.** Todas as credenciais de acesso ao Banco de Dados, Supabase CLI e GitHub CLI já estão injetadas no arquivo físico local `.env` na raiz do projeto.

**Localização:** `c:\Users\User\.gemini\antigravity\repos\mec-nica-financeiro\.env`

### Como Carregar Silenciosamente (PowerShell)
Antes de rodar pushs no Supabase ou comandos no GitHub CLI, carregue as variáveis em background usando:
```powershell
$env:SUPABASE_ACCESS_TOKEN = (Get-Content .env | Select-String "SUPABASE_ACCESS_TOKEN").Line.Split("=")[1].Trim()
$env:SUPABASE_DB_PASSWORD  = (Get-Content .env | Select-String "SUPABASE_DB_PASSWORD").Line.Split("=")[1].Trim()
$env:GH_TOKEN              = (Get-Content .env | Select-String "GH_TOKEN").Line.Split("=")[1].Trim()
```
*Comandos Supabase remotos exigem o uso do `--db-url` com a string de conexão postgres, pois o projeto não usa contêineres Docker locais.*

---

## 🚀 Resumo das Últimas Implementações (Contexto Técnico)

### 1. Spec 140: Correção do Fluxo de Caixa Global (A Mais Recente)
- **Status:** Planejada / SQL Entregue via Editor.
- **O que foi feito:** Reescrevi o script da RPC `get_dashboard_metrics` para desacoplar contas globais das filiais.
- **Problema Resolvido:** O painel ignorava saídas do OFX Global (pois estas não possuíam `store_id` específico) e o "Fluxo de Caixa" quebrava ao buscar um cache diário inexistente do dia anterior.
- **Matemática Fixada:** As despesas globais do OFX agora somam perfeitamente na rubrica "Contas a Pagar". A nova fórmula em tempo real é: `Fluxo = Faturamento - (Contas Totais OFX + Juros)`.

### 2. Spec 130: Motor de Pareamento Automático (Auto-Match)
- **Status:** Concluído.
- **O que foi feito:** Otimização na RPC `auto_match_transactions`.
- **Problema Resolvido:** O pareamento antigo funcionava apagando cegamente os vínculos pré-existentes na base para tentar casar tudo de novo, destruindo conciliações manuais que o usuário houvesse feito.
- **Nova Regra:** A RPC agora é não-destrutiva e idêntica. Só tenta fazer match onde a coluna `matched_os_number IS NULL` (transações órfãs), respeitando o que já está consolidado.

### 3. Reestruturação do Banco (Split Transactions)
- **Status:** Concluído.
- **O que foi feito:** A antiga tabela unificada `transactions` foi dividida fisicamente nas tabelas especializadas: `ofx_transactions`, `pos_transactions` e `manual_transactions`.
- **Compatibilidade Frontend:** Criou-se uma SQL `VIEW transactions` realizando um `UNION ALL` para não quebrar a UI legada.

### 4. Correção Global de Encoding
- **Status:** Concluído.
- **O que foi feito:** Varredura em `.ts`, `.tsx` e `.md`.
- **Problema Resolvido:** Conserto de todos os caracteres UTF-8 corrompidos (ex: `Ã§Ã£o` revertido para `ção`).
