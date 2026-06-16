# Memória Contínua (Antigravity Agent)

## Preferências de Arquitetura
- Frontend: Padrões de UI guiados por frontend-design-pro e afrexai-nextjs-production.
- Backend: Supabase com Row Level Security (RLS) habilitada. Padrões gerenciados pelas skills backend e supabase.

## Erros Passados
(Ainda não há registros)

## Padrões de Negócio Adquiridos
- **Conciliação Tripla (D+1):** O fluxo financeiro opera no modelo "Sistema -> Maquininha -> Banco". A planilha da Maquininha atua como "ponte" via Data da Venda e Data Prevista de Pagamento. Em uploads múltiplos, deve-se processar tudo junto (Upload Centralizado) e comparar os totais (OS x Rede x OFX) antes de consolidar.
- **Transparência de UI:** Sempre exibir divergências ativamente (ex: se o valor pago em D+1 é menor que o valor aprovado da máquina, ou se a máquina recebeu menos que as OSs finalizadas). Gráficos de pizza (Donut) devem ser responsivos à aba/contexto que o usuário está visualizando.

## Persona do Usuário
- Focado em entregas de qualidade e headless workflows.
- Exige planejamento via Especificações antes da implementação.
