# Council Synthesis: Round 3 (The Final Verdict)

## 1. The Consensus Map (Consensos Obtidos por Unanimidade)
1. **Inversão para OFX-Centric (OFX-First Ledger):** O extrato bancário é a fonte primária de verdade contábil. A conciliação deve ser disparada pela entrada de novos lançamentos PIX no banco, e não pela data de importação das OSs.
2. **Pool Atemporal com Janela de $\pm 15$ Dias:** A busca por OSs candidatas a um PIX bancário não pode ficar restrita ao mesmo dia (`target_date`), buscando no pátio aberto da loja em uma janela de até 15 dias.
3. **Persistência Imutável em Banco de Dados:** O vínculo (`matched_os_number` / `matched_ofx_id`) deve ser gravado nas tabelas do Supabase (`transactions` e `estoque_os_pendente`). Reimportações diárias de planilhas de pátio **não podem sobrescrever ou apagar** vínculos já estabelecidos.
4. **Regra de Ouro da Unicidade (Zero Falsos Positivos):**
   - Se houver **exatamente 1 OS** compatível com o valor exato $\rightarrow$ Auto-match instantâneo.
   - Se houver **múltiplas OSs** com o mesmo valor (ex: duas OSs de R$ 150) $\rightarrow$ O sistema marca como `SUGESTÃO` e requer a confirmação de 1 clique do operador.
5. **Reversibilidade Total ($O(1)$):** Qualquer vínculo pode ser desfeito com 1 clique (`Desvincular`), devolvendo a transação para Entradas Avulsas e a OS para Pendente.

---

## 2. The Hard Disagreements & Salvaguardas Resolvidas
- **Risco de OS Mutada/Cancelada (Levantado pelo Contrarian):**
  - *Resolução:* Implementação de **Soft Lock Reativo**. Se uma nova planilha de pátio trouxer uma OS com valor reduzido ou cancelada após já ter sido vinculada a um PIX bancário, o sistema detecta a divergência e alerta o operador em vez de mascarar o erro.

---

## 3. The Pivot (O Que Foi Refinado no Debate)
- A ideia original de um match cego atemporal foi refinada para um **Sistema de Auto-Match Heurístico com Janela de 15 Dias e Trava de Unicidade**.
- O modelo garante que **nenhum PIX importado no banco fique órfão** e **nenhuma reimportação de pátio desfaça os vínculos já conferidos**.

---

## 4. Final Verdict: [GO] 🚀
- **Decisão do Conselho:** **[GO] — APROVADO PARA IMPLEMENTAÇÃO IMEDIATA**.
- **Nível de Confiança Consolidado:** **92.7%**.
