# Contrarian Position: Round 1

## 1. O Ataque ao Otimismo Cego do Auto-Match Atemporal
Vocês estão ignorando uma armadilha fatal:
1. **O Pesadelo da OS Alterada/Cancelada:**
   - O cliente passa R$ 1.000 de PIX no dia 10. O sistema dá match automático na OS #500.
   - No dia 15, o cliente cancela o serviço, ou a oficina dá um desconto e refatura a OS por R$ 800, ou o cliente pede reembolso. O que acontece com o match gravado em pedra? Fica uma aberração contábil silenciosa.
2. **Colisões Múltiplas e Invasão de Competência:**
   - Se 3 clientes pagam R$ 300 via PIX ao longo do mês, um auto-match atemporal pode pegar uma OS aberta há 20 dias e casar com o PIX de hoje que na verdade era de uma OS faturada ontem.
   - Isso mascara desvios de caixa e fraudes na recepção da oficina!

## 2. Condições Inegociáveis para não virar um Desastre
- Match automático **NUNCA** pode ocorrer se houver mais de 1 OS com o mesmo valor em aberto na loja.
- A conferência deve mostrar visualmente a **data em que o PIX caiu no banco** versus a **data de abertura/fechamento da OS**, permitindo desfazer o vínculo com 1 clique se a OS foi cancelada.

## 3. Veredito do Contrarian
A ideia só é segura se for **Semi-Automática** (auto-match apenas para valores únicos com score de confiança alto) e estritamente auditável com botão de reversão total.
