# Spec Plan — Incidente de 21/09: Reparo Sem Perda de Dados e Blindagem OFX

## [DB / SANEAMENTO FORENSE]
- [x] Task 1: Criar backup em `.tmp/backup_2109_pre_repair.json` contendo o estado prévio dos 81 registros de `ofx_transactions` do lote `a083037a-82a6-43fe-b634-361ec00f8954` e do snapshot de 21/09.
  - *Skill:* `database`
  - *Verificação:* Arquivo de backup criado e não vazio.

- [x] Task 2: Executar script de reparo migrando os 81 registros de `ofx_transactions` do lote `a083037a-82a6-43fe-b634-361ec00f8954` de `target_date = '2026-09-18'` para `target_date = '2026-09-21'`, preservando `occurred_at`.
  - *Skill:* `database`
  - *Verificação:* Query no Supabase confirma 81 transações em 21/09 e 78 transações remanescentes em 18/09.

- [/] Task 3: Disparar os motores de reconciliação via RPC (`auto_match_saidas` e `auto_match_daily_transactions`) para `p_date = '2026-09-21'`.
  - *Skill:* `database`
  - *Verificação:* RPCs retornam `success = true` e contagem de matches > 0.

- [ ] Task 4: Sincronizar a tabela `reconciliations` e o snapshot em `daily_snapshots` de 21/09 (reabrindo `is_closed = false` para permitir conferência visual pelo operador humano).
  - *Skill:* `database`
  - *Verificação:* `daily_snapshots` de 21/09 com `is_closed = false` e valores integrados.

---

## [BACKEND / ENGINE]
- [ ] Task 5: Atualizar a regra de data em `src/components/importacoes/CentralImportWizard.tsx` (linhas 1570-1573) estendendo a janela contábil de fechamento para até 4 dias retroativos (`diffDays <= 4`), cobrindo fins de semana e feriados.
  - *Skill:* `backend-patterns`
  - *Verificação:* Inspeção de código garantindo que extratos de sexta a segunda importados em segunda recebem a `targetDate` do lote.

- [ ] Task 6: Atualizar o filtro do Reconciliador Rede x OFX em `src/components/importacoes/CentralImportWizard.tsx` (linhas 2186-2195) para aceitar créditos pertencentes à janela contábil do fechamento.
  - *Skill:* `backend-patterns`
  - *Verificação:* Inspeção de código garantindo pareamento dos créditos de fim de semana com as vendas da adquirente.

---

## [QUALITY GATE / TESTES]
- [ ] Task 7: Executar o Terminal Gate completo (`cmd.exe /c "npm run build"`).
  - *Skill:* `deploy-production`
  - *Verificação:* Exit code 0 (TypeScript limpo e bundling Nitro concluído).

- [ ] Task 8: Executar script de verificação final pós-reparo validando paridade contábil de 21/09 e preservação intacta de 18/09.
  - *Skill:* `database`
  - *Verificação:* Script confirma 81 OFX em 21/09, matches ativos e snapshot de 18/09 inalterado.
