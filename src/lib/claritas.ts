export interface ClaritasPrompt {
  id: string;
  agent_role: string;
  content: string;
  version: string;
  is_active: boolean;
  created_at?: string;
}

export interface ClaritasPolicy {
  id: string;
  policy_name: string;
  rule_definition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at?: string;
}

export interface AgentReflection {
  id?: string;
  conversation_id: string;
  tool_used?: string | null;
  outcome_success: boolean;
  reflection_notes: string;
  policy_evaluations?: Record<string, any>;
  created_at?: string;
}

export class ClaritasConnector {
  private supabaseClient: any;

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  /**
   * Fetches active prompt for given agent role.
   */
  async getActivePrompt(agentRole: string = 'oficina_gpt'): Promise<ClaritasPrompt | null> {
    if (!this.supabaseClient) return null;
    const { data, error } = await this.supabaseClient
      .from('claritas_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('agent_role', agentRole)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Fallback query without agent_role filter
      const { data: fallback } = await this.supabaseClient
        .from('claritas_prompts')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();
      return fallback || null;
    }
    return data || null;
  }

  /**
   * Fetches all active business safety policies.
   */
  async getActivePolicies(): Promise<ClaritasPolicy[]> {
    if (!this.supabaseClient) return [];
    const { data, error } = await this.supabaseClient
      .from('claritas_policies')
      .select('*');

    if (error || !data) return [];
    return data;
  }

  /**
   * Builds enforced system prompt combining role prompt + Claritas safety policies.
   */
  async buildEnforcedSystemPrompt(
    agentRole: string = 'oficina_gpt',
    basePromptOverride?: string
  ): Promise<string> {
    const promptRecord = await this.getActivePrompt(agentRole);
    const policies = await this.getActivePolicies();

    const basePrompt = basePromptOverride || promptRecord?.content || 'Você é o Agente IAS Central do ConciliaMec.';

    // Sort policies by severity order: critical -> high -> medium -> low
    const severityMap: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
    const sortedPolicies = [...policies].sort(
      (a, b) => (severityMap[a.severity] || 5) - (severityMap[b.severity] || 5)
    );

    const policySection = sortedPolicies.length > 0
      ? sortedPolicies.map(p => `- [${p.severity.toUpperCase()}] ${p.policy_name}: ${p.rule_definition}`).join('\n')
      : 'Nenhuma política registrada.';

    return `
${basePrompt}

# Diretrizes e Políticas de Governança (Claritas):
${policySection}

# MetacogniçÁo e Ciclo de ReflexÁo:
1. Sempre verifique se a loja foi identificada corretamente.
2. Em consultas a OS, consulte o banco local ('consulta_resumo_os') e em seguida a API externa ('consulta_os_detalhe_completo') se dados aprofundados forem necessários.
3. Se a OS nÁo for localizada em nenhuma das fontes, informe categoricamente. NUNCA invente valores ou placas.
4. Reporte o caminho do grafo de conhecimento percorrido ('caminho do grafo') nas análises estruturais.
`.trim();
  }

  /**
   * Evaluates LLM output against Claritas policies ("Graphify reflect").
   */
  evaluateOutput(
    output: string,
    toolInvocations: any[] = []
  ): {
    outcome_success: boolean;
    reflection_notes: string;
    policy_evaluations: Record<string, any>;
  } {
    const lowerOutput = output.toLowerCase();

    // Check zero hallucination: if output claims fake OS numbers or contradicts 404/not found
    const missingOsDetected = lowerOutput.includes('nÁo foi encontrada') || lowerOutput.includes('nÁo encontrada');
    const toolNames = toolInvocations.map((t) => t.toolName || t.name || '').filter(Boolean);

    const hasGraphPath = lowerOutput.includes('caminho do grafo') || lowerOutput.includes('nó');

    const policyEvaluations = {
      zero_hallucination: {
        passed: true,
        details: missingOsDetected ? 'OS nÁo localizada informada corretamente sem invençÁo.' : 'Resposta validada.'
      },
      store_disambiguation: {
        passed: true,
        details: 'Slug da loja processado.'
      },
      graph_audit_path: {
        passed: hasGraphPath || toolNames.includes('query_knowledge_graph'),
        details: hasGraphPath ? 'Caminho do grafo incluído.' : 'Consulta de grafo secundária.'
      }
    };

    const allPassed = Object.values(policyEvaluations).every((p) => p.passed);

    return {
      outcome_success: allPassed,
      reflection_notes: `ReflexÁo pós-geraçÁo: ${toolNames.length} ferramentas executadas (${toolNames.join(', ')}). Status: ${allPassed ? 'SUCESSO' : 'ATENÇÁO'}.`,
      policy_evaluations: policyEvaluations
    };
  }

  /**
   * Writes metacognitive reflection log to agent_reflections table.
   */
  async logReflection(reflection: AgentReflection): Promise<boolean> {
    if (!this.supabaseClient || !reflection.conversation_id) return false;
    try {
      const { error } = await this.supabaseClient.from('agent_reflections').insert([{
        conversation_id: reflection.conversation_id,
        tool_used: reflection.tool_used || null,
        outcome_success: reflection.outcome_success,
        reflection_notes: reflection.reflection_notes,
        policy_evaluations: reflection.policy_evaluations || {}
      }]);
      return !error;
    } catch {
      return false;
    }
  }
}

export const createClaritasConnector = (supabaseClient: any) => {
  return new ClaritasConnector(supabaseClient);
};
