# Memória Contínua (Antigravity Agent)

## Preferências de Arquitetura
- Frontend: Padrões de UI guiados por frontend-design-pro e afrexai-nextjs-production.
- Backend: Supabase com Row Level Security (RLS) habilitada. Padrões gerenciados pelas skills backend e supabase.

## Erros Passados
(Ainda não há registros)

## Padrões de Negócio Adquiridos
- **Conciliação Tripla (D+1):** O fluxo financeiro opera no modelo "Sistema -> Maquininha -> Banco". A planilha da Maquininha atua como "ponte" via Data da Venda e Data Prevista de Pagamento. Em uploads múltiplos, deve-se processar tudo junto (Upload Centralizado) e comparar os totais (OS x Rede x OFX) antes de consolidar.
- **Transparência de UI:** Sempre exibir divergências ativamente (ex: se o valor pago em D+1 é menor que o valor aprovado da máquina, ou se a máquina recebeu menos que as OSs finalizadas). Gráficos de pizza (Donut) devem ser responsivos à aba/contexto que o usuário está visualizando.
- **Contexto em Mapeamentos:** Nunca exibir identificadores abstratos (como números de conta bancária de OFX) para o usuário sem contexto. Sempre parear com metadados como Nome do Arquivo de Origem e uma amostra do conteúdo (ex: 2 transações do extrato) para facilitar a cognição humana no mapeamento de entidades.
- **Princípio de Fluxo Único:** Evitar concorrência visual entre rotas novas e legadas. Se um fluxo central substitui fluxos antigos, os componentes obsoletos devem ser sumariamente removidos para evitar redundância na tela.
## Persona do Usuário
- Focado em entregas de qualidade e headless workflows.
- Exige planejamento via Especificações antes da implementação.
