# Spec Plan: Redesign e Simplificação em 3 Abas na Conciliação por Loja (Spec 271)

## Tasks

- [x] [FRONTEND] Criar componente `StoreCartaoMaquininhaView.tsx` unificando as antigas abas 1 e 2 com resumo de Bruto, Taxas MDR, Líquido, OS vinculada e status de liquidação bancária
- [x] [FRONTEND] Criar componente `StoreExtratoBancarioView.tsx` unificando as antigas abas 3 e 4 no formato real de extrato bancário cronológico com badges de identificação (Rede, OS PIX, Justificativa, Pendente) e ações rápidas (Vincular OS, Justificar, Desvincular)
- [x] [FRONTEND] Criar componente `StoreOrdensServicoView.tsx` com listagem completa e dedicada das OSs da filial, cálculo de saldo em pátio, botão de `+ Nova OS Manual` e edição de valores/status
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.$lojaId.tsx` para renderizar as 3 novas abas (`1. Cartão / Maquininha`, `2. Extrato Bancário (OFX & PIX)`, `3. Ordens de Serviço`)
- [x] [TEST] Validar compilação do projeto com `npm run build`
- [x] [TEST] Verificar navegação fluida e sem erros entre as 3 abas na tela de conciliação da loja
