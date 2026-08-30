# Spec Plan: Reativacao do Gemini na Conciliacao Inteligente e Equalizacao de Cartoes (307)

## Tasks

- [x] [BACKEND] Criar/Restaurar `src/lib/llm-matcher.ts` com suporte robusto ao Google Gemini (`gemini-2.5-flash` / `gemini-1.5-flash`), com timeout de 4s e fallback determinístico
- [x] [BACKEND] Persistir configurações do Gemini na tabela `public.ai_settings` (provider: 'google', model: 'gemini-2.5-flash') e no `.env`
- [x] [FRONTEND] Integrar o motor do Gemini dentro de `CentralImportWizard.tsx` no momento de conciliar OFX, Rede e OSs
- [x] [BACKEND] Atualizar as transações da Rede de 27/08 em `pos_transactions` para marcar as vendas que já caíram no OFX como `settlement_status = 'entrou'`, zerando a duplicação de R$ 7.231,41
- [x] [FRONTEND] Sincronizar o Card "Saldo Bancos + Dinheiro" e o modal de Raio-X para que "A Compensar" reflita com precisão apenas as vendas que ainda NÃO entraram no OFX
- [x] [TEST] Executar teste de pareamento do Gemini com os dados reais de 27/08 e validar retorno estruturado
- [x] [TEST] Validar que o fechamento e os cards de 27/08 batem centavo por centavo com a conciliação real
- [x] [TEST] Executar `npm run build` com sucesso
