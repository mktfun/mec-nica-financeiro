import fs from 'fs';
import path from 'path';

export interface GraphNode {
  id: string;
  label?: string;
  file_type?: string;
  source_file?: string;
  source_location?: string;
  community?: number;
  community_name?: string;
  norm_label?: string;
  content?: string;
  [key: string]: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation?: string;
  weight?: number;
  confidence_score?: number;
  source_file?: string;
  [key: string]: any;
}

export interface GraphData {
  directed?: boolean;
  multigraph?: boolean;
  graph?: Record<string, any>;
  nodes: GraphNode[];
  links?: GraphEdge[];
  edges?: GraphEdge[];
}

export class GraphifyConnector {
  private graphData: GraphData | null = null;
  private supabaseClient: any = null;

  constructor(supabaseClient?: any) {
    this.supabaseClient = supabaseClient;
  }

  /**
   * Loads graph.json from Supabase Storage bucket 'knowledge_graph' or local fallback directory.
   */
  async loadGraph(customData?: GraphData): Promise<GraphData> {
    if (customData) {
      this.graphData = customData;
      return this.graphData;
    }

    // 1. Try Supabase Storage bucket if client is provided
    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient.storage
          .from('knowledge_graph')
          .download('graph.json');
        if (!error && data) {
          const text = await data.text();
          this.graphData = JSON.parse(text);
          return this.graphData!;
        }
      } catch {
        // Fall back to local file
      }
    }

    // 2. Try local file path (in Node environment)
    try {
      const pathsToTry = [
        path.join(process.cwd(), 'graphify-out', '2026-07-30', 'graph.json'),
        path.join(process.cwd(), 'graphify-out', 'graph.json'),
        path.join(process.cwd(), '.graphify', 'graph.json')
      ];

      for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          this.graphData = JSON.parse(raw);
          return this.graphData!;
        }
      }
    } catch {
      // In non-Node environments (browser/Deno without FS)
    }

    // Default empty structure if not found
    this.graphData = { nodes: [], links: [] };
    return this.graphData;
  }

  /**
   * Searches nodes matching a query string.
   */
  searchNodes(query: string, limit: number = 10): GraphNode[] {
    if (!this.graphData || !this.graphData.nodes) return [];
    const q = query.toLowerCase();
    return this.graphData.nodes
      .filter((n) => {
        const idMatch = n.id && n.id.toLowerCase().includes(q);
        const labelMatch = n.label && n.label.toLowerCase().includes(q);
        const fileMatch = n.source_file && n.source_file.toLowerCase().includes(q);
        const communityMatch = n.community_name && n.community_name.toLowerCase().includes(q);
        const normMatch = n.norm_label && n.norm_label.toLowerCase().includes(q);
        return idMatch || labelMatch || fileMatch || communityMatch || normMatch;
      })
      .slice(0, limit);
  }

  /**
   * Traces relationships and generates the explicit graph traversal path ("caminho do grafo").
   */
  findTraversalPath(queryOrNodeId: string): {
    nodes: GraphNode[];
    edges: GraphEdge[];
    caminho_do_grafo: string;
  } {
    const matchedNodes = this.searchNodes(queryOrNodeId, 5);
    if (matchedNodes.length === 0) {
      return {
        nodes: [],
        edges: [],
        caminho_do_grafo: `[Nó Raiz: ${queryOrNodeId}] -> [Aresta: SEM_CONEXAO] -> [Nó Destino: Desconhecido]`
      };
    }

    const primaryNode = matchedNodes[0];
    const edges = this.graphData?.links || this.graphData?.edges || [];
    
    // Find connected edges
    const connectedEdges = edges.filter(
      (e) => e.source === primaryNode.id || e.target === primaryNode.id
    ).slice(0, 3);

    const pathSteps: string[] = [`[Nó: ${primaryNode.label || primaryNode.id}]`];

    connectedEdges.forEach((e) => {
      const rel = e.relation || 'CONECTADO_A';
      const targetId = e.source === primaryNode.id ? e.target : e.source;
      pathSteps.push(`-> [Aresta: ${rel.toUpperCase()}] -> [Nó: ${targetId}]`);
    });

    const caminho_do_grafo = pathSteps.join(' ');

    return {
      nodes: matchedNodes,
      edges: connectedEdges,
      caminho_do_grafo
    };
  }

  /**
   * Returns graph statistics.
   */
  getSummary() {
    return {
      total_nodes: this.graphData?.nodes?.length || 0,
      total_edges: (this.graphData?.links || this.graphData?.edges || []).length
    };
  }
}

export const createGraphifyConnector = (supabaseClient?: any) => {
  return new GraphifyConnector(supabaseClient);
};
