# Spec Plan: Correção Matemática do Dashboard e Resumo (115)

## 1. Banco de Dados (Backend)
- [x] Criar arquivo de migração supabase/migrations/20260807000007_fix_dashboard_patio_math.sql
- [x] O script deve redefinir CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_date date)
- [x] O script deve aplicar a lógica de herança de 
a_loja_os a partir de econciliations na variável  _na_loja.

## 2. Interface de Usuário (Frontend)
- [x] Abrir src/components/conciliacao/ResumoDiaPanel.tsx
- [x] Mudar rótulo TAXAS/JUROS para DESPESAS / JUROS
- [x] Somar contasAPagarAutomatico com inputForCalculation.juros_rede na propriedade  alue do <AnimatedNumber> correspondente.
- [x] Alterar o texto descritivo embaixo para \OFX Out + Maquininha\.
