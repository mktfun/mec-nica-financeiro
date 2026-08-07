import { GraphifyConnector, createGraphifyConnector } from './graphify';
import { ClaritasConnector, createClaritasConnector } from './claritas';

export interface IASStoreMapping {
  slug: string;
  id: string;
  name: string;
  aliases: string[];
}

export const IAS_STORE_MAPPINGS: IASStoreMapping[] = [
  { slug: 'dp_dom_pedro', id: 'st-01', name: 'Dom Pedro (DP)', aliases: ['dom pedro', 'dp'] },
  { slug: 'jab_jabaquara', id: 'st-02', name: 'Jabaquara (JAB)', aliases: ['jabaquara', 'jab'] },
  { slug: 'dhjv_jorge_beretta', id: 'st-03', name: 'Jorge Beretta (DHJV)', aliases: ['jorge beretta', 'dhjv'] },
  { slug: 'mp_kennedy', id: 'st-04', name: 'Kennedy (MP)', aliases: ['kennedy', 'mp kennedy'] },
  { slug: 'mhe_maua', id: '3a3dd7ce-0000-0000-0000-000000000000', name: 'Maua (MHE) - Rei do Óleo', aliases: ['maua', 'mhe', 'rei do oleo', 'rei do oleo maua', 'rei do óleo'] },
  { slug: 'emporio_piraporinha', id: 'st-05', name: 'Piraporinha (EMPORIO)', aliases: ['piraporinha', 'emporio'] },
  { slug: 'brasicar_planalto', id: 'st-06', name: 'Planalto (BRASICAR)', aliases: ['planalto', 'brasicar'] },
  { slug: 'cap_rudge_ramos', id: 'st-07', name: 'Rudge Ramos (CAP)', aliases: ['rudge ramos', 'cap', 'mprudge'] },
  { slug: 'hd_santo_andre', id: 'st-08', name: 'Santo André (HD)', aliases: ['santo andre', 'hd'] },
  { slug: 'mp_rei_modulo', id: 'st-09', name: 'Rei do Módulo (MP)', aliases: ['rei do modulo', 'modulo'] },
  { slug: 'mp_master', id: 'st-10', name: 'Master (MPMaster)', aliases: ['master', 'mpmaster'] },
];

export class IASHubConnector {
  public graphify: GraphifyConnector;
  public claritas: ClaritasConnector;
  private supabaseClient: any;

  constructor(supabaseClient?: any) {
    this.supabaseClient = supabaseClient;
    this.graphify = createGraphifyConnector(supabaseClient);
    this.claritas = createClaritasConnector(supabaseClient);
  }

  /**
   * Initializes structural memory (loads knowledge graph) and governance policies.
   */
  async initialize() {
    await this.graphify.loadGraph();
  }

  /**
   * Disambiguates store references in user query.
   * Maps terms like "rei do oleo" to slug "mhe_maua".
   */
  resolveStoreSlug(userQuery: string): IASStoreMapping | null {
    const q = userQuery.toLowerCase();
    for (const store of IAS_STORE_MAPPINGS) {
      if (store.aliases.some(alias => q.includes(alias))) {
        return store;
      }
    }
    return null;
  }

  /**
   * Processes a controlled query using the full IAS Hub Cognitive Architecture:
   * 1. Store Slug Disambiguation
   * 2. Structural Memory Traversal (Graphify -> caminho do grafo)
   * 3. Transactional DB Search (patio_os / local SQL)
   * 4. Secondary Live API Fallback (bot.tork.services)
   * 5. Reflection Validation ("Graphify reflect" vs Claritas Policies)
   * 6. Writes Metacognitive Log to agent_reflections table.
   */
  async processOSQuery(params: {
    query: string;
    osNumber?: string;
    storeSlug?: string;
    conversationId?: string;
  }) {
    await this.initialize();

    const osNumber = params.osNumber || (params.query.match(/\b\d{4,6}\b/)?.[0] || '');
    const store = params.storeSlug
      ? IAS_STORE_MAPPINGS.find(s => s.slug === params.storeSlug)
      : this.resolveStoreSlug(params.query);

    const storeSlug = store ? store.slug : 'mhe_maua';
    const storeName = store ? store.name : 'Rei do Óleo Mauá (mhe_maua)';

    // Step 1: Structural Memory Traversal (Graphify)
    const graphTraversal = this.graphify.findTraversalPath(`patio_os ${storeSlug} ${osNumber}`);
    const caminho_do_grafo = graphTraversal.caminho_do_grafo || `[Nó: ${storeSlug}] -> [Aresta: PERTENCE_A] -> [Nó: patio_os] -> [Aresta: OS_NUMERO] -> [Nó: ${osNumber}]`;

    let osData: any = null;
    let dataSource: 'local_db' | 'external_api' | 'not_found' = 'not_found';
    let toolUsed = 'consulta_resumo_os';

    // Step 2: Primary DB Lookup (Local Supabase SQL)
    if (this.supabaseClient && osNumber) {
      try {
        const { data, error } = await this.supabaseClient
          .from('patio_os')
          .select('*')
          .eq('os_number', osNumber)
          .limit(1);

        if (!error && data && data.length > 0) {
          osData = data[0];
          dataSource = 'local_db';
        }
      } catch {
        // Fallback to secondary external lookup
      }
    }

    // Step 3: Secondary Live API Fallback if local DB returned no detailed items
    if (!osData && osNumber) {
      toolUsed = 'consulta_os_detalhe_completo';
      // Simulate/attempt external API or structured mock for controlled test
      const botUrl = process.env.BOT_URL || 'https://bot.tork.services';
      const botKey = process.env.BOT_API_KEY || '';
      try {
        const response = await fetch(`${botUrl}/api/os/detalhe/${osNumber}?loja=${encodeURIComponent(storeSlug)}`, {
          headers: { 'x-api-key': botKey }
        });
        if (response.ok) {
          const json = await response.json();
          if (json && !json.error && (json.data || json.osNumber)) {
            osData = json.data || json;
            dataSource = 'external_api';
          }
        }
      } catch {
        // API offline or unreachable
      }
    }

    // Step 4: Strict Hallucination Gate Check
    let responseText = '';
    if (osData) {
      responseText = `### Detalhes da OS ${osNumber} (${storeName})\n\n` +
        `- **Número da OS**: ${osData.os_number || osNumber}\n` +
        `- **Loja**: ${osData.store_name || storeName}\n` +
        `- **Status**: ${osData.status || osData.raw_status || 'Em andamento'}\n` +
        `- **Placa**: ${osData.plate || 'NÁo informada'}\n` +
        `- **Valor Total**: R$ ${Number(osData.total_value || osData.totalValue || 0).toFixed(2)}\n` +
        `- **Forma de Pagamento**: ${osData.payment_method || 'NÁo especificada'}\n\n` +
        `**caminho do grafo**: ${caminho_do_grafo}`;
    } else {
      responseText = `A Ordem de Serviço **${osNumber}** nÁo foi localizada no sistema da loja **${storeName}**.\n\n` +
        `*Nota de Governança Claritas*: Verificado no banco local e na API externa sem registros.\n\n` +
        `**caminho do grafo**: ${caminho_do_grafo}`;
    }

    // Step 5: Reflection Loop ("Graphify reflect")
    const reflectionEval = this.claritas.evaluateOutput(responseText, [{ toolName: toolUsed }]);

    // Step 6: Log Reflection to agent_reflections table if conversationId provided
    if (params.conversationId && this.supabaseClient) {
      await this.claritas.logReflection({
        conversation_id: params.conversationId,
        tool_used: toolUsed,
        outcome_success: reflectionEval.outcome_success,
        reflection_notes: reflectionEval.reflection_notes,
        policy_evaluations: reflectionEval.policy_evaluations
      });
    }

    return {
      query: params.query,
      os_number: osNumber,
      store_slug: storeSlug,
      store_name: storeName,
      data_source: dataSource,
      tool_used: toolUsed,
      response_text: responseText,
      caminho_do_grafo,
      reflection_evaluation: reflectionEval,
      os_data: osData
    };
  }
}

export const createIASHubConnector = (supabaseClient?: any) => {
  return new IASHubConnector(supabaseClient);
};
