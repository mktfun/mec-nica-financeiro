# Proposta de Especificação Técnica: Restauração do Fluxo Original de Importação com Visualização Reativa, Logs de Matches e JSON Inspector (Spec 202)

## Contexto e Diagnóstico
A recente unificação dos formulários fundiu todos os inputs em uma tela estática de uma só vez, eliminando acidentalmente recursos de alta utilidade operacional e transparência do sistema:
1. **Perda dos Previews e Logs de Casamento (Matches):** A capacidade de inspecionar as transações bancárias OFX, as OSs lidas e os pares de conciliação automática (OS vs PIX / OS vs Cartão) foi suprimida.
2. **Ausência do Inspetor de JSON:** Operadores e desenvolvedores perderam a visibilidade do payload JSON exato de conciliação gerado antes do envio ao Supabase.
3. **Perda da Dinâmica Reativa:** O fluxo deve ser interativo e guiado pelo estado dos dados (**Upload** -> **Previews, Logs & Matches** -> **JSON Inspector & Inputs Manuais** -> **Gravação com Painel de Progresso**), sem steppers/wizards artificiais, mas com clareza visual e transições suaves.

## Objetivos da Especificação
1. **Arquitetura de Estado Reativo (Zero Stepper Artificial):**
   - **Estado 1 (Inicial):** Dropzone limpa para OFX, Pátio e Rede + reconhecimento automático e persistência de matches de lojas no Supabase (`store_file_mappings`).
   - **Estado 2 (Pós-Upload & Preview):**
     - Cards de Resumo por categoria (OSs, Maquininha, Extrato OFX) com métricas em `font-mono`.
     - Tabela/Aba de pré-visualização das transações (Extrato OFX, OSs e Cartões).
     - Painel de Casamentos/Matches detectados em tempo real (ex: Match OS #123 com PIX de R$ 450,00).
     - Grid de Ajuste de OSs Órfãs (ordens ativas no banco não presentes na planilha do mês) com edição manual de Total, Pago e Status.
     - Cartão de Inputs Manuais Globais (Odômetro, Dinheiro MP, A Receber, Contas) com trava de segurança contra edições acidentais.
     - **Inspetor JSON de Conciliação:** Bloco colapsável `<details>` com estilo de terminal (`bg-zinc-950 font-mono text-xs text-emerald-400 border border-zinc-800`) exibindo o payload completo formatado em JSON que será despachado ao backend.
   - **Estado 3 (Gravação & Auditoria):**
     - Painel de execução com progresso por etapa (OSs, Rede, OFX, Conciliação, Snapshot) e log em tempo real.
2. **Design System Zinc-950 / Emerald Estrito:**
   - Fundo `bg-zinc-950`, cartões `bg-zinc-900`, bordas `border-zinc-800`, foco `ring-2 ring-emerald-500`, números tabulares `font-mono`.
3. **Preservação de Integridade de Dados:**
   - `target_date: targetDate`
   - `type: 'in' | 'out'` estrito na tabela `ofx_transactions`
   - Valores monetários arredondados com `Math.round(val * 100) / 100` e `Math.abs`.

## Critérios de Sucesso
- [x] Transição reativa e fluida de Upload -> Previews/Matches/JSON -> Gravação.
- [x] Inspetor JSON colapsável com código formatado e botão de cópia rápida.
- [x] Tabela de matches e previews por arquivo/loja acessíveis na tela.
- [x] Inputs manuais protegidos com trava de edição.
- [x] `npm run build` aprovado 100% verde.
